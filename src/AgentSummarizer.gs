/**
 * Email Summarizer Agent - Self-Contained Implementation
 *
 * This agent implements the requirements from GitHub Issue #10:
 * - Retrieves all emails labeled "summarize"
 * - Generates summaries in "The Economist's World in Brief" style
 * - Delivers summaries via email with hyperlinks and source references
 * - Re-labels processed emails as "summarized" and archives them
 * - Runs on scheduled triggers (daily at 5am by default)
 *
 * Features:
 * - Self-contained: manages own config, labels, and triggers
 * - Uses generic service layer for Gmail operations
 * - Leverages existing AI infrastructure (LLMService, PromptBuilder)
 * - Configurable age limits and destination email
 * - Full error handling and dry-run support
 */

// ============================================================================
// Configuration Management (Self-Contained)
// ============================================================================

/**
 * Get Email Summarizer agent configuration with sensible defaults
 * Manages own PropertiesService keys without core Config.gs changes
 */
function getSummarizerConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    // Agent enablement
    SUMMARIZER_ENABLED: (props.getProperty('SUMMARIZER_ENABLED') || 'true').toLowerCase() === 'true',

    // Email processing limits
    SUMMARIZER_MAX_AGE_DAYS: parseInt(props.getProperty('SUMMARIZER_MAX_AGE_DAYS') || '7', 10),
    SUMMARIZER_MAX_EMAILS_PER_SUMMARY: parseInt(props.getProperty('SUMMARIZER_MAX_EMAILS_PER_SUMMARY') || '50', 10),

    // Delivery configuration
    SUMMARIZER_DESTINATION_EMAIL: props.getProperty('SUMMARIZER_DESTINATION_EMAIL') || Session.getActiveUser().getEmail(),

    // Debugging and testing
    SUMMARIZER_DEBUG: (props.getProperty('SUMMARIZER_DEBUG') || 'false').toLowerCase() === 'true',
    SUMMARIZER_DRY_RUN: (props.getProperty('SUMMARIZER_DRY_RUN') || 'false').toLowerCase() === 'true'
  };
}

// ============================================================================
// Label Management (Self-Contained)
// ============================================================================

/**
 * Ensure "summarized" label exists for processed emails
 * Creates label if it doesn't exist, returns label object
 */
function ensureSummarizedLabel_() {
  const labelName = 'summarized';
  return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
}

// ============================================================================
// Email Processing Logic
// ============================================================================

/**
 * Find emails for summarization using generic service layer
 * Returns structured email data compatible with existing AI services
 */
function findEmailsForSummary_() {
  const config = getSummarizerConfig_();

  // Use generic service function for email finding
  return findEmailsByLabelWithAge_(
    'summarize',
    config.SUMMARIZER_MAX_AGE_DAYS,
    config.SUMMARIZER_MAX_EMAILS_PER_SUMMARY
  );
}

/**
 * Process emails through AI summarization pipeline
 * Uses existing LLMService and PromptBuilder infrastructure
 */
function generateSummaryFromEmails_(emails) {
  try {
    const config = getSummarizerConfig_();

    if (!emails || emails.length === 0) {
      return {
        success: false,
        error: 'No emails provided for summarization'
      };
    }

    // Extract web links from emails for inclusion in summary
    const webLinks = extractWebLinksFromEmails_(emails);

    // Generate email permalink references for the AI
    const emailLinks = generateEmailPermalinks_(emails);

    // Build configuration for summary generation
    const summaryConfig = {
      emailLinks: emailLinks,
      includeWebLinks: webLinks
    };

    // Use existing LLMService function for AI summarization
    const result = generateConsolidatedSummary_(emails, summaryConfig);

    if (config.SUMMARIZER_DEBUG) {
      Logger.log(`AgentSummarizer: Generated summary for ${emails.length} emails, length: ${result.summary ? result.summary.length : 0} chars`);
    }

    return result;

  } catch (error) {
    Logger.log(`AgentSummarizer generateSummaryFromEmails_ error: ${error.toString()}`);
    return {
      success: false,
      error: `Summary generation failed: ${error.toString()}`
    };
  }
}

/**
 * Convert markdown formatting to HTML for email display
 * Handles headers, bold text, italic text, and links
 */
function convertMarkdownToHtml_(markdownText) {
  if (!markdownText) return '';

  let html = markdownText;

  // Convert headers (### Header -> <h3>Header</h3>)
  html = html.replace(/^### (.+)$/gm, '<h3 style="color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; font-size: 18px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; font-size: 20px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; font-size: 22px;">$1</h1>');

  // Convert bold text (**text** -> <strong>text</strong>)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: bold;">$1</strong>');

  // Convert italic text (*text* -> <em>text</em>)
  html = html.replace(/\*([^*]+)\*/g, '<em style="font-style: italic;">$1</em>');

  // Convert Sources sections to bulleted lists
  // Pattern: **Sources:** [Link1](url1), [Link2](url2), [Link3](url3)
  html = html.replace(/\*\*Sources:\*\*\s*(.+)/g, function(match, sourcesList) {
    // Split the sources by commas and convert each to a list item
    const sources = sourcesList.split(/,\s*(?=\[)/); // Split on comma followed by [
    const listItems = sources.map(source => {
      // Convert links in each source
      const linkedSource = source.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #3498db; text-decoration: none;">$1</a>');
      return `<li style="margin: 0.3em 0;">${linkedSource.trim()}</li>`;
    }).join('');

    return `<strong style="font-weight: bold;">Sources:</strong><ul style="margin: 0.5em 0; padding-left: 1.5em;">${listItems}</ul>`;
  });

  // Convert remaining links ([text](url) -> <a href="url">text</a>)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #3498db; text-decoration: none;">$1</a>');

  // Convert line breaks to HTML
  html = html.replace(/\n\n/g, '</p><p style="margin: 1em 0;">');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p style="margin: 1em 0;">' + html + '</p>';
  }

  return html;
}

/**
 * Send summary email to configured destination
 * Uses generic service layer for email delivery
 */
function deliverSummaryEmail_(summaryText, sourceEmails) {
  try {
    const config = getSummarizerConfig_();

    if (!summaryText) {
      return {
        success: false,
        error: 'No summary text provided'
      };
    }

    const currentDate = new Date().toLocaleDateString();
    // Fix emoji encoding issue by using plain text
    const subject = `Email Summary - ${currentDate}`;

    // Convert markdown to HTML for proper email display
    const htmlSummary = convertMarkdownToHtml_(summaryText);

    // Build HTML content with proper styling
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; margin-bottom: 1.5em;">
          Email Summary - ${currentDate}
        </h2>
        <div style="line-height: 1.6; color: #444;">
          ${htmlSummary}
        </div>
        <p style="margin-top: 2em; font-size: 12px; color: #666;">
          This summary was generated automatically from ${sourceEmails.length} email(s)
          with the "summarize" label from the past ${config.SUMMARIZER_MAX_AGE_DAYS} days.
        </p>
      </div>
    `;

    // Use generic service function for email sending
    return sendFormattedEmail_(
      config.SUMMARIZER_DESTINATION_EMAIL,
      subject,
      htmlContent,
      sourceEmails
    );

  } catch (error) {
    Logger.log(`AgentSummarizer deliverSummaryEmail_ error: ${error.toString()}`);
    return {
      success: false,
      error: `Email delivery failed: ${error.toString()}`
    };
  }
}

/**
 * Process emails after summarization (relabel and archive)
 * Uses generic service layer for label management
 */
function processEmailsAfterSummary_(emails) {
  try {
    const config = getSummarizerConfig_();

    if (!emails || emails.length === 0) {
      return { success: true, processed: 0 };
    }

    // Ensure the "summarized" label exists
    ensureSummarizedLabel_();

    // Extract email IDs for batch operations
    const emailIds = emails.map(email => email.id);

    if (config.SUMMARIZER_DRY_RUN) {
      Logger.log(`AgentSummarizer: DRY RUN - Would process ${emailIds.length} emails (relabel and archive)`);
      return {
        success: true,
        processed: emailIds.length,
        dryRun: true
      };
    }

    // Use generic service function for label transition
    const labelResult = manageLabelTransition_(
      emailIds,
      ['summarize'],      // Remove "summarize" label
      ['summarized']      // Add "summarized" label
    );

    if (!labelResult.success) {
      return labelResult;
    }

    // Use generic service function for archiving
    const archiveResult = archiveEmailsByIds_(emailIds);

    if (config.SUMMARIZER_DEBUG) {
      Logger.log(`AgentSummarizer: Processed ${labelResult.processed} emails, archived ${archiveResult.archived} emails`);
    }

    return {
      success: true,
      processed: labelResult.processed,
      archived: archiveResult.archived,
      message: `Processed ${labelResult.processed} emails and archived ${archiveResult.archived} threads`
    };

  } catch (error) {
    Logger.log(`AgentSummarizer processEmailsAfterSummary_ error: ${error.toString()}`);
    return {
      success: false,
      error: `Post-processing failed: ${error.toString()}`
    };
  }
}

// ============================================================================
// Main Agent Logic
// ============================================================================

/**
 * Email Summarizer agent handler function
 * Integrates with existing agent framework and context system
 * ctx provides: label, decision, threadId, thread (GmailThread), cfg, dryRun, log(msg)
 * Returns { status: 'ok'|'skip'|'retry'|'error', info?: string }
 */
function summarizerAgentHandler(ctx) {
  try {
    const config = getSummarizerConfig_();

    if (!config.SUMMARIZER_ENABLED) {
      return { status: 'skip', info: 'summarizer agent disabled' };
    }

    ctx.log('Email Summarizer agent running for thread ' + ctx.threadId);

    // This agent only processes individual emails as they are labeled
    // The main bulk processing happens via scheduled triggers
    // Here we just acknowledge the email was labeled for summarization

    if (ctx.dryRun || config.SUMMARIZER_DRY_RUN) {
      return { status: 'skip', info: 'dry-run mode - email queued for summarization' };
    }

    ctx.log('Email queued for next scheduled summarization run');
    return { status: 'ok', info: 'email queued for summarization' };

  } catch (error) {
    ctx.log('Email Summarizer agent error: ' + error.toString());
    return { status: 'error', info: error.toString() };
  }
}

// ============================================================================
// Scheduled Execution Logic
// ============================================================================

/**
 * Main scheduled summarization workflow
 * Runs independently of individual email processing
 */
function runEmailSummarizer() {
  try {
    const config = getSummarizerConfig_();

    if (!config.SUMMARIZER_ENABLED) {
      console.log('Email Summarizer is disabled');
      return { success: false, reason: 'disabled' };
    }

    console.log('Email Summarizer: Starting scheduled run');

    // Step 1: Find emails for summarization
    const emailResult = findEmailsForSummary_();
    if (!emailResult.success) {
      console.log('Email Summarizer: Error finding emails - ' + emailResult.error);
      return { success: false, error: emailResult.error };
    }

    if (emailResult.count === 0) {
      console.log('Email Summarizer: No emails found for summarization');
      return { success: true, reason: 'no_emails', processed: 0 };
    }

    console.log(`Email Summarizer: Found ${emailResult.count} emails for summarization`);

    // Step 2: Generate AI summary
    const summaryResult = generateSummaryFromEmails_(emailResult.emails);
    if (!summaryResult.success) {
      console.log('Email Summarizer: Error generating summary - ' + summaryResult.error);
      return { success: false, error: summaryResult.error };
    }

    // Step 3: Deliver summary email
    const deliveryResult = deliverSummaryEmail_(summaryResult.summary, emailResult.emails);
    if (!deliveryResult.success) {
      console.log('Email Summarizer: Error delivering summary - ' + deliveryResult.error);
      return { success: false, error: deliveryResult.error };
    }

    console.log('Email Summarizer: Summary email delivered successfully');

    // Step 4: Process emails (relabel and archive)
    const processResult = processEmailsAfterSummary_(emailResult.emails);
    if (!processResult.success) {
      console.log('Email Summarizer: Error processing emails - ' + processResult.error);
      return { success: false, error: processResult.error };
    }

    const finalMessage = `Email Summarizer completed: processed ${emailResult.count} emails, delivered summary to ${config.SUMMARIZER_DESTINATION_EMAIL}`;
    console.log(finalMessage);

    return {
      success: true,
      processed: emailResult.count,
      delivered: true,
      archived: processResult.archived || 0,
      message: finalMessage
    };

  } catch (error) {
    const errorMsg = 'Email Summarizer scheduled run error: ' + error.toString();
    console.log(errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// Trigger Management (Self-Contained)
// ============================================================================

/**
 * Install daily trigger for Email Summarizer
 * Agents manage their own trigger lifecycle
 */
function installSummarizerTrigger() {
  try {
    // Clean up existing triggers first
    deleteSummarizerTriggers_();

    // Create new daily trigger at 5 AM
    ScriptApp.newTrigger('runEmailSummarizer')
      .timeBased()
      .everyDays(1)
      .atHour(5)
      .create();

    console.log('Email Summarizer trigger installed successfully (daily at 5 AM)');
    return { success: true, message: 'Daily trigger installed at 5 AM' };
  } catch (error) {
    const errorMsg = 'Error installing Email Summarizer trigger: ' + error.toString();
    console.log(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Remove all Email Summarizer triggers
 */
function deleteSummarizerTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runEmailSummarizer')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

/**
 * List Email Summarizer triggers for debugging
 */
function listSummarizerTriggers() {
  const triggers = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runEmailSummarizer');

  if (triggers.length === 0) {
    console.log('No Email Summarizer triggers installed');
    return { triggers: [] };
  }

  console.log(`Found ${triggers.length} Email Summarizer trigger(s):`);
  triggers.forEach((trigger, index) => {
    const source = trigger.getTriggerSource();
    const eventType = trigger.getEventType();
    console.log(`  ${index + 1}. ${source} - ${eventType}`);
  });

  return { triggers: triggers.length };
}

// ============================================================================
// Agent Registration
// ============================================================================

if (typeof AGENT_MODULES === 'undefined') {
  AGENT_MODULES = [];
}

AGENT_MODULES.push(function(api) {
  /**
   * Register Email Summarizer agent for "summarize" label
   * Agent acknowledges emails and queues them for batch processing
   */
  api.register(
    'summarize',           // Label to trigger on
    'emailSummarizer',     // Agent name
    summarizerAgentHandler, // Handler function
    {
      idempotentKey: function(ctx) { return 'emailSummarizer:' + ctx.threadId; },
      runWhen: 'afterLabel',  // Run after labeling (respects dry-run)
      timeoutMs: 30000,       // Soft timeout guidance
      enabled: true           // Enabled by default
    }
  );
});