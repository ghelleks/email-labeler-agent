/**
 * WebAppAgent provides an interactive web-based interface for on-demand email processing.
 *
 * Features:
 * - Serves HTML interface via Google Apps Script web app deployment
 * - Scans Gmail for emails with 'summarize' label on demand
 * - Generates consolidated summaries using AI service
 * - Provides bulk actions (Archive All) from web interface
 * - Maintains "pull" system complementing existing "push" agents
 */

if (typeof AGENT_MODULES === 'undefined') {
  AGENT_MODULES = [];
}

AGENT_MODULES.push(function(api) {
  /**
   * Register web app agent for summarize label
   * This agent sets up the web interface but doesn't process emails automatically
   */
  api.register(
    'summarize',
    'webAppAgent',
    function(ctx) {
      ctx.log('webAppAgent: Web interface available for on-demand processing');
      // This agent doesn't automatically process emails - it provides the web interface
      return { status: 'ok', info: 'web interface ready' };
    },
    {
      idempotentKey: function(ctx) { return 'webAppAgent:setup'; },
      runWhen: 'always', // Always available for web interface
      enabled: true
    }
  );
});

/**
 * Web App Entry Points
 */

/**
 * Required function for Google Apps Script web app deployment
 * Serves the main HTML interface
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('WebAppInterface')
    .setTitle('Email Agent Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Backend function called from frontend via google.script.run
 * Scans for emails with summarize label and returns data for processing
 */
function getSummarizeEmails() {
  try {
    const cfg = getConfig_();
    const labelName = 'summarize';
    const label = GmailApp.getUserLabelByName(labelName);

    if (!label) {
      return {
        success: false,
        error: 'Label "' + labelName + '" not found. Please create it first.'
      };
    }

    const threads = label.getThreads();
    const emailData = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const messages = thread.getMessages();
      const latestMessage = messages[messages.length - 1];

      emailData.push({
        threadId: thread.getId(),
        subject: thread.getFirstMessageSubject(),
        from: latestMessage.getFrom(),
        date: latestMessage.getDate().toISOString(),
        body: latestMessage.getPlainBody().substring(0, cfg.BODY_CHARS || 1200),
        gmailUrl: 'https://mail.google.com/mail/u/0/#inbox/' + thread.getId()
      });
    }

    return {
      success: true,
      emails: emailData,
      count: emailData.length
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to retrieve emails: ' + error.toString()
    };
  }
}

/**
 * Backend function to generate consolidated summary
 * Combines all email content and sends to AI service
 */
function generateConsolidatedSummary(emails) {
  try {
    if (!emails || emails.length === 0) {
      return {
        success: false,
        error: 'No emails provided for summarization'
      };
    }

    const cfg = getConfig_();

    // Combine all email content for single AI request
    let combinedContent = 'EMAILS TO SUMMARIZE:\n\n';
    const emailLinks = [];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      combinedContent += '--- EMAIL ' + (i + 1) + ' ---\n';
      combinedContent += 'From: ' + email.from + '\n';
      combinedContent += 'Subject: ' + email.subject + '\n';
      combinedContent += 'Date: ' + email.date + '\n';
      combinedContent += 'Content: ' + email.body + '\n\n';

      emailLinks.push({
        subject: email.subject,
        url: email.gmailUrl
      });
    }

    // Prepare prompt for consolidated summary
    const prompt = `Please create a consolidated summary of these ${emails.length} emails in the style of "The Economist's World in Brief" - concise, direct, and informative.

Requirements:
1. Create ONE unified summary covering all emails
2. Use **bold formatting** for important terms, people, and proper nouns
3. Group related topics together
4. Extract and include any web URLs mentioned in the email content
5. Keep the tone professional and concise

${combinedContent}`;

    // Call AI service
    const aiResponse = LLMService.generateText(prompt, {
      model: cfg.MODEL_PRIMARY,
      temperature: 0.3
    });

    if (!aiResponse.success) {
      return {
        success: false,
        error: 'AI service failed: ' + aiResponse.error
      };
    }

    return {
      success: true,
      summary: aiResponse.text,
      emailLinks: emailLinks,
      emailCount: emails.length
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to generate summary: ' + error.toString()
    };
  }
}

/**
 * Backend function to archive all emails that were summarized
 */
function archiveAllSummarizeEmails() {
  try {
    const labelName = 'summarize';
    const label = GmailApp.getUserLabelByName(labelName);

    if (!label) {
      return {
        success: false,
        error: 'Label "' + labelName + '" not found'
      };
    }

    const threads = label.getThreads();
    let archivedCount = 0;

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      thread.removeLabel(label);
      thread.moveToArchive();
      archivedCount++;
    }

    return {
      success: true,
      archivedCount: archivedCount,
      message: 'Successfully archived ' + archivedCount + ' email threads'
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to archive emails: ' + error.toString()
    };
  }
}