function getRuleText_(docIdOrUrl) {
  const debug = PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true';

  if (!docIdOrUrl) {
    if (debug) {
      console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'no-doc-id-or-url-provided' }, null, 2));
    }
    return getDefaultPolicyText_();
  }

  // User explicitly specified a rule document - we should error if it fails

  // Extract Doc ID from URL variants or accept raw ID
  var docId = docIdOrUrl;
  if (/^https?:\/\//i.test(docIdOrUrl)) {
    var m = docIdOrUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/) ||
            docIdOrUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
            docIdOrUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
            docIdOrUrl.match(/\/([a-zA-Z0-9_-]+)\/edit/);
    docId = m && m[1] ? m[1] : null;
    if (debug) {
      console.log(JSON.stringify({ urlParsing: docId ? 'success' : 'failed', originalUrl: docIdOrUrl, extractedId: docId }, null, 2));
    }
  }

  if (!docId) {
    const errorMsg = `Failed to extract document ID from rule document URL: "${docIdOrUrl}". ` +
      `Please check that RULE_DOC_URL or RULE_DOC_ID contains a valid Google Docs URL or document ID. ` +
      `Expected format: https://docs.google.com/document/d/DOCUMENT_ID/edit or just the document ID.`;
    throw new Error(errorMsg);
  }

  try {
    // Use original working Google Docs feeds API URL format
    const exportUrl = 'https://docs.google.com/feeds/download/documents/export/Export?exportFormat=markdown&id=' + encodeURIComponent(docId);

    if (debug) {
      console.log(JSON.stringify({
        ruleDocSource: 'docs-feeds-api',
        docId: docId,
        exportUrl: exportUrl
      }, null, 2));
    }

    const response = UrlFetchApp.fetch(exportUrl, {
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      },
      followRedirects: true,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      const errorMsg = `Failed to fetch rule document (HTTP ${response.getResponseCode()}): ${response.getContentText()}. ` +
        `Document ID: ${docId}. Please check that the document exists and is accessible.`;
      throw new Error(errorMsg);
    }

    const content = response.getContentText();

    if (!content || !content.trim()) {
      const errorMsg = `Rule document is empty (ID: ${docId}). ` +
        `Please add content to the document or remove RULE_DOC_URL/RULE_DOC_ID to use default rules.`;
      throw new Error(errorMsg);
    }

    if (debug) {
      console.log(JSON.stringify({
        ruleDocSuccess: true,
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      }, null, 2));
    }

    return content;

  } catch (e) {
    if (e.message && e.message.includes('Rule document is empty')) {
      // Re-throw our custom empty document errors
      throw e;
    }

    if (e.message && e.message.includes('Failed to fetch rule document')) {
      // Re-throw our custom fetch errors (includes HTTP status codes)
      throw e;
    }

    // Handle UrlFetch and authorization errors
    const errorMessage = e && e.toString ? e.toString() : String(e);

    if (errorMessage.includes('Request failed') || errorMessage.includes('Exception: Request failed')) {
      const errorMsg = `Unable to fetch rule document (ID: ${docId}). ` +
        `The document may not exist, may be private, or you may lack permission to access it. ` +
        `Please verify the document ID in RULE_DOC_URL/RULE_DOC_ID, or remove it to use default rules.`;
      throw new Error(errorMsg);
    }

    if (errorMessage.includes('Authorization') || errorMessage.includes('authentication')) {
      const errorMsg = `Authorization error accessing rule document (ID: ${docId}). ` +
        `Please ensure this Apps Script project has permission to access Google Docs. ` +
        `Try running any function in the Apps Script editor to refresh authorization, ` +
        `or remove RULE_DOC_URL/RULE_DOC_ID to use default rules.`;
      throw new Error(errorMsg);
    }

    // Other URL fetch errors
    const errorMsg = `Error fetching rule document via Google Docs export (ID: ${docId}): ${errorMessage}. ` +
      `Please check that the document exists and is accessible, or remove RULE_DOC_URL/RULE_DOC_ID to use default rules.`;
    if (debug) {
      console.error('Full error details:', e);
    }
    throw new Error(errorMsg);
  }
}

function getDefaultPolicyText_() {
  return (
    'Required Action (choose one):\n' +
    '   - **reply_needed** (requires a reply, which should be drafted later)\n' +
    '   - **review** (requires a thoughtful review of the email)\n' +
    '   - **todo** (requires a task to be created)\n' +
    '   - **summarize** (should be included as part of a summary of the inbox, but not other action necessary)\n' +
    '\n' +
    '## IMPORTANT CONTENT ANALYSIS GUIDELINES\n' +
    '\n' +
    '- **Action words**: google workspace notifications, "your order", "please", "required", "due", "review" → todo or review\n' +
    '- **Time sensitivity**: "urgent", "asap", "deadline" → todo\n' +
    '- **Question format**: personal emails, direct questions → reply_needed\n' +
    '- **Calendar keywords**: "meeting", "schedule", "invite" → review\n' +
    '- **Automated confirmations**: calendar invitations, Notifications, updates, "we processed", "thank you for" → summarize\n'
  );
}


