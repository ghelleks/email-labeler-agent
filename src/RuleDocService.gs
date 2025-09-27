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
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Use Drive API for more reliable access and better error handling
    const file = DriveApp.getFileById(docId);

    if (debug) {
      console.log(JSON.stringify({
        ruleDocSource: 'drive-api',
        docId: docId,
        fileName: file.getName(),
        mimeType: file.getBlob().getContentType(),
        fileSize: file.getSize()
      }, null, 2));
    }

    // Get the document content as text
    const blob = file.getBlob();
    const content = blob.getDataAsString();

    if (!content || !content.trim()) {
      const errorMsg = `Rule document is empty (ID: ${docId}, Name: "${file.getName()}"). ` +
        `Please add content to the document or remove RULE_DOC_URL/RULE_DOC_ID to use default rules.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (debug) {
      console.log(JSON.stringify({
        ruleDocSuccess: true,
        contentLength: content.length,
        fileName: file.getName()
      }, null, 2));
    }

    return content;

  } catch (e) {
    if (e.message && e.message.includes('Rule document is empty')) {
      // Re-throw our custom empty document errors
      throw e;
    }

    // Handle Drive API specific errors
    const errorMessage = e && e.toString ? e.toString() : String(e);

    if (errorMessage.includes('File not found') || errorMessage.includes('Requested entity was not found')) {
      const errorMsg = `Rule document not found (ID: ${docId}). ` +
        `The document may have been deleted, moved, or the ID is incorrect. ` +
        `Please verify the document ID in RULE_DOC_URL/RULE_DOC_ID, or remove it to use default rules.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (errorMessage.includes('Permission denied') || errorMessage.includes('Access denied')) {
      const errorMsg = `No permission to access rule document (ID: ${docId}). ` +
        `This Apps Script project needs permission to read your Google Drive files. ` +
        `Please run the script once to authorize Drive access, or share the document with the Apps Script project, ` +
        `or remove RULE_DOC_URL/RULE_DOC_ID to use default rules.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Other Drive API errors
    const errorMsg = `Error accessing rule document via Drive API (ID: ${docId}): ${errorMessage}. ` +
      `Please check that the document exists and is accessible, or remove RULE_DOC_URL/RULE_DOC_ID to use default rules.`;
    console.error(errorMsg);
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

