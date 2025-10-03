/**
 * Reply Drafter Agent - Self-Contained Implementation
 *
 * This agent implements automated reply drafting for emails labeled "reply_needed":
 * - Checks for existing drafts to ensure idempotency
 * - Fetches optional knowledge from Google Drive via KnowledgeService
 * - Retrieves full email thread context
 * - Generates professional reply drafts using AI
 * - Creates Gmail draft replies automatically
 * - Runs after labeling (respects dry-run mode)
 *
 * Execution Modes:
 * 1. Agent Handler: Runs during email classification (immediate draft creation)
 * 2. Scheduled Batch: Runs every 30 minutes to process existing labeled emails
 *
 * Features:
 * - Self-contained: manages own config without core Config.gs changes
 * - Idempotent: skips emails that already have drafts
 * - Knowledge-aware: optionally uses drafting instructions and context
 * - Thread-aware: processes full conversation history
 * - Batch processing: handles manually labeled emails and retries
 * - Full error handling and dry-run support
 */

// ============================================================================
// Configuration Management (Self-Contained)
// ============================================================================

/**
 * Get Reply Drafter agent configuration with sensible defaults
 * Manages own PropertiesService keys without core Config.gs changes
 */
function getReplyDrafterConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    // Agent enablement
    REPLY_DRAFTER_ENABLED: (props.getProperty('REPLY_DRAFTER_ENABLED') || 'true').toLowerCase() === 'true',

    // Knowledge configuration
    REPLY_DRAFTER_INSTRUCTIONS_URL: props.getProperty('REPLY_DRAFTER_INSTRUCTIONS_URL'),
    REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL: props.getProperty('REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL'),
    REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS: parseInt(props.getProperty('REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS') || '5', 10),

    // Debugging and testing
    REPLY_DRAFTER_DEBUG: (props.getProperty('REPLY_DRAFTER_DEBUG') || 'false').toLowerCase() === 'true',
    REPLY_DRAFTER_DRY_RUN: (props.getProperty('REPLY_DRAFTER_DRY_RUN') || 'false').toLowerCase() === 'true'
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a draft already exists for the given thread
 * Returns true if draft exists, false otherwise
 *
 * @param {string} threadId - Gmail thread ID
 * @return {boolean} True if draft exists for this thread
 */
function draftExistsForThread_(threadId) {
  try {
    const drafts = GmailApp.getDrafts();

    for (let i = 0; i < drafts.length; i++) {
      const draftMessage = drafts[i].getMessage();
      const draftThreadId = draftMessage.getThread().getId();

      if (draftThreadId === threadId) {
        return true;
      }
    }

    return false;
  } catch (error) {
    Logger.log('Error checking for existing draft: ' + error.toString());
    // On error, assume no draft exists to avoid blocking draft creation
    return false;
  }
}

/**
 * Get email thread data including all messages
 * Returns structured thread object for AI processing
 *
 * @param {string} threadId - Gmail thread ID
 * @return {Object} Thread object with messages array
 */
function getEmailThread_(threadId) {
  try {
    const thread = GmailApp.getThreadById(threadId);

    if (!thread) {
      throw new Error('Thread not found: ' + threadId);
    }

    const messages = thread.getMessages();
    const threadData = {
      id: threadId,
      messageCount: messages.length,
      messages: []
    };

    // Extract message details
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      threadData.messages.push({
        from: msg.getFrom(),
        to: msg.getTo(),
        subject: msg.getSubject(),
        date: msg.getDate().toISOString(),
        body: msg.getPlainBody()
      });
    }

    return threadData;

  } catch (error) {
    throw new Error('Failed to retrieve email thread: ' + error.toString());
  }
}

/**
 * Create a draft reply for the given thread
 * Uses Gmail API to create draft as reply to latest message
 *
 * @param {string} threadId - Gmail thread ID
 * @param {string} draftText - Reply text to include in draft
 * @return {Object} Result object with success status
 */
function createDraftReply_(threadId, draftText) {
  try {
    const thread = GmailApp.getThreadById(threadId);

    if (!thread) {
      return {
        success: false,
        error: 'Thread not found: ' + threadId
      };
    }

    // Get the most recent message to reply to
    const messages = thread.getMessages();
    const latestMessage = messages[messages.length - 1];

    // Create draft as reply
    const draft = latestMessage.createDraftReply(draftText);

    return {
      success: true,
      draftId: draft.getId(),
      message: 'Draft created successfully'
    };

  } catch (error) {
    Logger.log('Error creating draft reply: ' + error.toString());
    return {
      success: false,
      error: 'Failed to create draft: ' + error.toString()
    };
  }
}

// ============================================================================
// Main Agent Logic
// ============================================================================

/**
 * Reply Drafter agent handler function
 * Integrates with existing agent framework and context system
 * ctx provides: label, decision, threadId, thread (GmailThread), cfg, dryRun, log(msg)
 * Returns { status: 'ok'|'skip'|'retry'|'error', info?: string }
 */
function processReplyNeeded_(ctx) {
  try {
    const config = getReplyDrafterConfig_();

    // Check if agent is enabled
    if (!config.REPLY_DRAFTER_ENABLED) {
      return { status: 'skip', info: 'reply drafter agent disabled' };
    }

    ctx.log('Reply Drafter agent running for thread ' + ctx.threadId);

    // Check for dry-run mode
    if (ctx.dryRun || config.REPLY_DRAFTER_DRY_RUN) {
      ctx.log('DRY RUN - Would check for existing draft and generate reply');
      return { status: 'ok', info: 'dry-run mode - draft would be created' };
    }

    // Check if draft already exists (idempotent)
    if (draftExistsForThread_(ctx.threadId)) {
      ctx.log('Draft already exists for this thread, skipping');
      return { status: 'skip', info: 'draft already exists' };
    }

    // Fetch knowledge via KnowledgeService
    let knowledge = null;
    try {
      knowledge = fetchReplyKnowledge_({
        instructionsUrl: config.REPLY_DRAFTER_INSTRUCTIONS_URL,
        knowledgeFolderUrl: config.REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL,
        maxDocs: config.REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS
      });

      if (knowledge.configured && config.REPLY_DRAFTER_DEBUG) {
        ctx.log('Loaded reply knowledge: ' + knowledge.metadata.docCount + ' documents, ' +
                knowledge.metadata.estimatedTokens + ' tokens (' +
                knowledge.metadata.utilizationPercent + ' utilization)');
      }
    } catch (knowledgeError) {
      // Knowledge fetch errors should propagate (fail-fast)
      ctx.log('Knowledge fetch failed: ' + knowledgeError.toString());
      return { status: 'error', info: 'knowledge fetch failed: ' + knowledgeError.toString() };
    }

    // Get email thread data
    let emailThread;
    try {
      emailThread = getEmailThread_(ctx.threadId);

      if (config.REPLY_DRAFTER_DEBUG) {
        ctx.log('Retrieved thread with ' + emailThread.messageCount + ' messages');
      }
    } catch (threadError) {
      ctx.log('Failed to retrieve thread: ' + threadError.toString());
      return { status: 'error', info: 'thread retrieval failed: ' + threadError.toString() };
    }

    // Build prompt via PromptBuilder
    let prompt;
    try {
      prompt = buildReplyDraftPrompt_(emailThread, knowledge);

      if (config.REPLY_DRAFTER_DEBUG) {
        ctx.log('Built prompt: ' + prompt.length + ' characters');
      }
    } catch (promptError) {
      ctx.log('Failed to build prompt: ' + promptError.toString());
      return { status: 'error', info: 'prompt build failed: ' + promptError.toString() };
    }

    // Generate draft via LLMService
    let draftText;
    try {
      const cfg = getConfig_();
      draftText = generateReplyDraft_(
        prompt,
        cfg.MODEL_PRIMARY,
        cfg.PROJECT_ID,
        cfg.LOCATION,
        cfg.GEMINI_API_KEY
      );

      if (config.REPLY_DRAFTER_DEBUG) {
        ctx.log('Generated draft: ' + draftText.length + ' characters');
      }
    } catch (aiError) {
      ctx.log('AI generation failed: ' + aiError.toString());
      return { status: 'error', info: 'AI generation failed: ' + aiError.toString() };
    }

    // Create Gmail draft
    const draftResult = createDraftReply_(ctx.threadId, draftText);

    if (!draftResult.success) {
      ctx.log('Draft creation failed: ' + draftResult.error);
      return { status: 'error', info: draftResult.error };
    }

    ctx.log('Draft created successfully');
    return {
      status: 'ok',
      info: 'draft created with ' + draftText.length + ' characters'
    };

  } catch (error) {
    ctx.log('Reply Drafter agent error: ' + error.toString());
    return { status: 'error', info: error.toString() };
  }
}

// ============================================================================
// Scheduled Batch Processing
// ============================================================================

/**
 * Process all existing emails with "reply_needed" label
 * Runs on a schedule (default: every 30 minutes) to handle:
 * - Manually labeled emails
 * - Emails labeled before agent was deployed
 * - Failed draft creations that need retry
 *
 * This complements the agent handler which runs during classification.
 */
function runReplyDrafter() {
  try {
    const config = getReplyDrafterConfig_();

    if (!config.REPLY_DRAFTER_ENABLED) {
      console.log('Reply Drafter is disabled');
      return { success: false, reason: 'disabled' };
    }

    if (config.REPLY_DRAFTER_DEBUG) {
      console.log('Reply Drafter: Starting scheduled batch run');
    }

    // Find all emails with "reply_needed" label in inbox
    const query = 'in:inbox label:reply_needed';
    const threads = GmailApp.search(query);

    if (threads.length === 0) {
      if (config.REPLY_DRAFTER_DEBUG) {
        console.log('Reply Drafter: No emails found with reply_needed label');
      }
      return { success: true, reason: 'no_emails', processed: 0 };
    }

    console.log(`Reply Drafter: Found ${threads.length} emails with reply_needed label`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const threadId = thread.getId();

      try {
        // Check if draft already exists (idempotency)
        if (draftExistsForThread_(threadId)) {
          skipped++;
          if (config.REPLY_DRAFTER_DEBUG) {
            console.log(`Reply Drafter: Skipping thread ${threadId} (draft already exists)`);
          }
          continue;
        }

        // Get thread data
        const threadData = getEmailThread_(threadId);
        if (!threadData || !threadData.messages || threadData.messages.length === 0) {
          console.log(`Reply Drafter: Skipping thread ${threadId} (no messages)`);
          skipped++;
          continue;
        }

        // Fetch knowledge if configured
        const knowledge = fetchReplyKnowledge_({
          instructionsUrl: config.REPLY_DRAFTER_INSTRUCTIONS_URL,
          knowledgeFolderUrl: config.REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL,
          maxDocs: config.REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS
        });

        // Build AI prompt
        const prompt = buildReplyDraftPrompt_(threadData, knowledge);

        // Get AI configuration
        const cfg = getConfig_();
        const model = cfg.GEMINI_MODEL || 'gemini-2.0-flash-exp';
        const projectId = cfg.PROJECT_ID;
        const location = cfg.VERTEX_LOCATION || 'us-central1';
        const apiKey = cfg.GEMINI_API_KEY;

        // Generate reply draft
        let draftText;
        if (config.REPLY_DRAFTER_DRY_RUN) {
          console.log(`Reply Drafter: DRY RUN - Would generate draft for thread ${threadId}`);
          draftText = '[DRY RUN] Draft would be generated here';
        } else {
          draftText = generateReplyDraft_(prompt, model, projectId, location, apiKey);
        }

        // Create Gmail draft
        if (!config.REPLY_DRAFTER_DRY_RUN) {
          const draftResult = createDraftReply_(threadId, draftText);

          if (!draftResult.success) {
            console.log(`Reply Drafter: Failed to create draft for thread ${threadId} - ${draftResult.error}`);
            errors++;
            continue;
          }

          console.log(`Reply Drafter: Created draft for thread ${threadId}`);
        }

        processed++;

      } catch (error) {
        errors++;
        console.log(`Reply Drafter: Error processing thread ${threadId} - ${error.toString()}`);
      }
    }

    const summary = `Reply Drafter completed: processed ${processed}, skipped ${skipped}, errors ${errors} (total: ${threads.length})`;
    console.log(summary);

    return {
      success: true,
      total: threads.length,
      processed: processed,
      skipped: skipped,
      errors: errors,
      message: summary
    };

  } catch (error) {
    const errorMsg = 'Reply Drafter scheduled run error: ' + error.toString();
    console.log(errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// Trigger Management (Self-Contained)
// ============================================================================

/**
 * Install trigger for Reply Drafter batch processing
 * Default: runs every 30 minutes to process existing reply_needed emails
 */
function installReplyDrafterTrigger() {
  // Use shared utility for trigger management (30-minute interval)
  const result = createTimeTrigger_('runReplyDrafter', {
    type: 'minutes',
    interval: 30
  });

  if (result.success) {
    console.log('Reply Drafter trigger installed successfully (every 30 minutes)');
  }
  return result;
}

/**
 * Remove all Reply Drafter triggers
 */
function deleteReplyDrafterTriggers_() {
  // Use shared utility for trigger cleanup
  return deleteTriggersByFunction_('runReplyDrafter');
}

/**
 * List Reply Drafter triggers for debugging
 */
function listReplyDrafterTriggers() {
  // Use shared utility for trigger listing
  return listTriggersByFunction_('runReplyDrafter');
}

// ============================================================================
// Agent Registration
// ============================================================================

if (typeof AGENT_MODULES === 'undefined') {
  AGENT_MODULES = [];
}

AGENT_MODULES.push(function(api) {
  /**
   * Register Reply Drafter agent for "reply_needed" label
   * Agent generates draft replies for emails requiring responses
   */
  api.register(
    'reply_needed',           // Label to trigger on
    'ReplyDrafter',           // Agent name
    processReplyNeeded_,      // Handler function
    {
      runWhen: 'afterLabel',  // Run after labeling (respects dry-run)
      timeoutMs: 30000,       // Soft timeout guidance
      enabled: true           // Enabled by default
      // ADR-017: Removed idempotentKey - agent checks for existing drafts (line 58)
    }
  );
});
