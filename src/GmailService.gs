function findUnprocessed_(max) {
  const q = 'in:inbox -label:reply_needed -label:review -label:todo -label:summarize';
  return GmailApp.search(q, 0, max);
}

function minimalize_(threads, bodyChars) {
  return threads.map(function(t) {
    const msg = t.getMessages().pop();
    const subj = msg.getSubject() || '';
    const from = msg.getFrom() || '';
    const date = msg.getDate();
    const days = Math.floor((Date.now() - date.getTime()) / (1000*60*60*24));
    const body = (msg.getPlainBody() || msg.getBody() || '').slice(0, bodyChars);
    return {
      id: msg.getId(),
      threadId: t.getId(),
      subject: subj,
      from: from,
      date: date.toISOString().slice(0,10),
      ageDays: days,
      plainBody: body
    };
  });
}

/**
 * Phase 2: Gmail Integration - Web App Service Extensions
 * Added for Interactive Web App Agent
 */

/**
 * Find emails with 'summarize' label and return data for processing
 * Returns: { success: boolean, emails: array, count: number, error?: string }
 */
function findEmailsWithSummarizeLabel_() {
  try {
    const label = GmailApp.getUserLabelByName('summarize');
    if (!label) {
      return {
        success: false,
        error: 'Label "summarize" not found. Please create it first.'
      };
    }

    const threads = label.getThreads();
    const emails = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const messages = thread.getMessages();
      const latestMessage = messages[messages.length - 1];

      emails.push({
        id: latestMessage.getId(),
        threadId: thread.getId(),
        subject: thread.getFirstMessageSubject() || '(No Subject)',
        from: latestMessage.getFrom() || '(Unknown Sender)',
        date: latestMessage.getDate().toISOString(),
        body: latestMessage.getPlainBody() || latestMessage.getBody() || '',
        thread: thread  // Keep reference for operations
      });
    }

    return {
      success: true,
      emails: emails,
      count: emails.length
    };

  } catch (error) {
    Logger.log('GmailService.findEmailsWithSummarizeLabel_ error: ' + error.toString());
    return {
      success: false,
      error: 'Failed to find emails: ' + error.toString()
    };
  }
}

/**
 * Archive multiple emails by ID and remove summarize label
 * Returns: { success: boolean, archivedCount: number, message?: string, error?: string }
 */
function bulkArchiveEmails_(emailIds) {
  try {
    if (!emailIds || emailIds.length === 0) {
      return {
        success: false,
        error: 'No email IDs provided for archiving'
      };
    }

    const summarizeLabel = GmailApp.getUserLabelByName('summarize');
    let archivedCount = 0;
    const errors = [];

    for (let i = 0; i < emailIds.length; i++) {
      try {
        const message = GmailApp.getMessageById(emailIds[i]);
        const thread = message.getThread();

        // Remove summarize label
        if (summarizeLabel) {
          thread.removeLabel(summarizeLabel);
        }

        // Archive the thread
        thread.moveToArchive();
        archivedCount++;

      } catch (messageError) {
        errors.push('Failed to archive email ID ' + emailIds[i] + ': ' + messageError.toString());
        Logger.log('BulkArchive error for ID ' + emailIds[i] + ': ' + messageError.toString());
      }
    }

    if (errors.length > 0 && archivedCount === 0) {
      return {
        success: false,
        error: 'Failed to archive any emails. Errors: ' + errors.join('; ')
      };
    }

    const message = archivedCount === emailIds.length
      ? `Successfully archived ${archivedCount} email threads`
      : `Archived ${archivedCount} of ${emailIds.length} emails. Some errors occurred.`;

    return {
      success: true,
      archivedCount: archivedCount,
      message: message,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    Logger.log('GmailService.bulkArchiveEmails_ error: ' + error.toString());
    return {
      success: false,
      error: 'Failed to archive emails: ' + error.toString()
    };
  }
}

/**
 * Generate Gmail permalinks for email references
 * Returns: array of { subject: string, url: string }
 */
function generateEmailPermalinks_(emails) {
  return emails.map(function(email) {
    return {
      subject: email.subject,
      url: 'https://mail.google.com/mail/u/0/#inbox/' + email.threadId
    };
  });
}

/**
 * Extract web links (URLs) from email content
 * Returns: array of unique URLs found in email bodies
 */
function extractWebLinksFromEmails_(emails) {
  const urlRegex = /https?:\/\/[^\s<>"]+/gi;
  const uniqueUrls = new Set();

  emails.forEach(function(email) {
    const matches = email.body.match(urlRegex);
    if (matches) {
      matches.forEach(function(url) {
        // Clean up common trailing characters
        const cleanUrl = url.replace(/[.,;:!?)]$/, '');
        uniqueUrls.add(cleanUrl);
      });
    }
  });

  return Array.from(uniqueUrls);
}
