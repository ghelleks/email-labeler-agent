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
 * Phase 1: Basic functionality placeholder - will be implemented in Phase 2
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

    // Phase 1: Return placeholder response for testing
    return {
      success: true,
      summary: '**Phase 1 Placeholder**: This is a test summary to verify the web app interface is working. The actual email processing will be implemented in **Phase 2** when Gmail and LLM service extensions are added.',
      emailCount: 0,
      emailLinks: [],
      webLinks: [],
      totalFound: 0,
      processedCount: 0,
      message: 'Phase 1: Web app foundation ready. Email processing coming in Phase 2.'
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
 * Phase 1: Placeholder functionality - will be implemented in Phase 2
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

    // Phase 1: Return placeholder response for testing
    return {
      success: true,
      archivedCount: 0,
      message: 'Phase 1: Archive functionality placeholder. Actual email archiving will be implemented in Phase 2.'
    };

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
 * Phase 1: Placeholder functionality - will be implemented in Phase 2
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

    // Phase 1: Return placeholder response for testing
    return {
      success: true,
      emailCount: 0,
      pendingArchiveCount: 0,
      maxEmailsPerSummary: cfg.WEBAPP_MAX_EMAILS_PER_SUMMARY,
      message: 'Phase 1: Email status placeholder. Actual Gmail integration coming in Phase 2.'
    };

  } catch (error) {
    Logger.log('WebApp getEmailStatus error: ' + error.toString());
    return {
      success: false,
      error: 'Failed to get email status: ' + error.toString()
    };
  }
}