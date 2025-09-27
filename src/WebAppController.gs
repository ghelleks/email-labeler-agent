/**
 * WebAppController.gs - Web app entry point and API orchestration
 *
 * Provides the web app interface and coordinates between the UI and existing services.
 * Follows the service extension pattern by orchestrating calls to GmailService and LLMService.
 */

/**
 * Required function for Google Apps Script web app deployment
 * Serves the main HTML interface
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('WebApp')
    .setTitle('Email Agent Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Main orchestration function called from frontend
 * Phase 2: Gmail Integration - discovers emails and prepares data for summarization
 */
function summarizeEmails() {
  try {
    const cfg = getConfig_();

    if (!cfg.WEBAPP_ENABLED) {
      return {
        success: false,
        error: 'Web app functionality is disabled in configuration'
      };
    }

    // Step 1: Find emails with summarize label using GmailService
    const emailDiscovery = findEmailsWithSummarizeLabel_();
    if (!emailDiscovery.success) {
      return emailDiscovery;
    }

    const { emails, count } = emailDiscovery;

    if (count === 0) {
      return {
        success: true,
        summary: '**No emails found** with "summarize" label. To test the web app:\n\n1. Apply the **summarize** label to some emails in Gmail\n2. Return here and click "Get Summary" again',
        emailCount: 0,
        emailLinks: [],
        webLinks: [],
        totalFound: 0,
        processedCount: 0,
        message: 'No emails found with "summarize" label'
      };
    }

    // Respect max email limit from configuration
    const maxEmails = cfg.WEBAPP_MAX_EMAILS_PER_SUMMARY;
    const emailsToProcess = emails.slice(0, maxEmails);

    if (emails.length > maxEmails) {
      Logger.log(`WebApp: Processing ${maxEmails} of ${emails.length} emails due to WEBAPP_MAX_EMAILS_PER_SUMMARY limit`);
    }

    // Step 2: Generate permalinks for email references
    const emailLinks = generateEmailPermalinks_(emailsToProcess);

    // Step 3: Extract web links from email content
    const webLinks = extractWebLinksFromEmails_(emailsToProcess);

    // Step 4: Store email IDs for archiving (to ensure count consistency)
    const emailIds = emailsToProcess.map(email => email.id);
    PropertiesService.getScriptProperties().setProperty('WEBAPP_PENDING_ARCHIVE_IDS', JSON.stringify(emailIds));

    // Phase 3: Generate consolidated AI summary using LLMService
    const summaryResult = generateConsolidatedSummary_(emailsToProcess, {
      style: 'economist',
      includeWebLinks: webLinks,
      emailLinks: emailLinks
    });

    if (!summaryResult.success) {
      return summaryResult;
    }

    let summaryText = summaryResult.summary;

    // Add source email links at the end of the summary
    if (emailLinks.length > 0) {
      summaryText += '\n\n**Source Emails:**\n';
      emailLinks.forEach(function(link, index) {
        summaryText += `• [${link.subject}](${link.url})\n`;
      });
    }

    // Add web links if found and not already included in summary
    if (webLinks.length > 0) {
      summaryText += '\n**Referenced Links:**\n';
      webLinks.forEach(function(url) {
        summaryText += `• ${url}\n`;
      });
    }

    return {
      success: true,
      summary: summaryText,
      emailCount: emailsToProcess.length,
      emailLinks: emailLinks,
      webLinks: webLinks,
      totalFound: emails.length,
      processedCount: emailsToProcess.length
    };

  } catch (error) {
    Logger.log('WebApp summarizeEmails error: ' + error.toString());
    return {
      success: false,
      error: 'Failed to process emails: ' + error.toString()
    };
  }
}

/**
 * Archives the emails that were previously summarized
 * Phase 2: Gmail Integration - uses stored email IDs for exact archiving
 */
function archiveProcessedEmails() {
  try {
    const cfg = getConfig_();

    if (!cfg.WEBAPP_ENABLED) {
      return {
        success: false,
        error: 'Web app functionality is disabled in configuration'
      };
    }

    // Retrieve stored email IDs from previous summarize operation
    const storedIds = PropertiesService.getScriptProperties().getProperty('WEBAPP_PENDING_ARCHIVE_IDS');
    if (!storedIds) {
      return {
        success: false,
        error: 'No pending emails to archive. Please generate a summary first.'
      };
    }

    const emailIds = JSON.parse(storedIds);
    if (!emailIds || emailIds.length === 0) {
      return {
        success: false,
        error: 'No email IDs found for archiving'
      };
    }

    // Archive emails using GmailService
    const archiveResult = bulkArchiveEmails_(emailIds);

    if (archiveResult.success) {
      // Clear stored email IDs after successful archiving
      PropertiesService.getScriptProperties().deleteProperty('WEBAPP_PENDING_ARCHIVE_IDS');
    }

    return archiveResult;

  } catch (error) {
    Logger.log('WebApp archiveProcessedEmails error: ' + error.toString());
    return {
      success: false,
      error: 'Failed to archive emails: ' + error.toString()
    };
  }
}

/**
 * Get current status including email count without processing
 * Phase 2: Gmail Integration - provides real email counts
 */
function getEmailStatus() {
  try {
    const cfg = getConfig_();

    if (!cfg.WEBAPP_ENABLED) {
      return {
        success: false,
        error: 'Web app functionality is disabled'
      };
    }

    // Get count of emails with summarize label
    const discovery = findEmailsWithSummarizeLabel_();
    if (!discovery.success) {
      return discovery;
    }

    // Check if there are pending emails to archive
    const storedIds = PropertiesService.getScriptProperties().getProperty('WEBAPP_PENDING_ARCHIVE_IDS');
    const pendingArchiveCount = storedIds ? JSON.parse(storedIds).length : 0;

    return {
      success: true,
      emailCount: discovery.count,
      pendingArchiveCount: pendingArchiveCount,
      maxEmailsPerSummary: cfg.WEBAPP_MAX_EMAILS_PER_SUMMARY
    };

  } catch (error) {
    Logger.log('WebApp getEmailStatus error: ' + error.toString());
    return {
      success: false,
      error: 'Failed to get email status: ' + error.toString()
    };
  }
}