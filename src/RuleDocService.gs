function getRuleText_(docIdOrUrl) {
  const debug = PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true';

  if (!docIdOrUrl) {
    if (debug) {
      console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'no-doc-id-or-url-provided' }, null, 2));
    }
    return getDefaultPolicyText_();
  }

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
    return getDefaultPolicyText_();
  }

  try {
    const url = 'https://docs.google.com/feeds/download/documents/export/Export?exportFormat=markdown&id=' + encodeURIComponent(docId);
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      followRedirects: true,
      muteHttpExceptions: true,
    });

    const code = response.getResponseCode();
    const body = response.getContentText('utf-8');

    if (debug) {
      console.log(JSON.stringify({ ruleDocSource: 'docs-export-markdown', docId: docId, status: code, textLength: body ? body.length : 0 }, null, 2));
    }

    if (code === 200 && body && body.trim()) {
      return body;
    }

    // Non-200 or empty body
    return getDefaultPolicyText_();
  } catch (e) {
    if (debug) {
      console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'urlfetch-error', docId: docId, error: e && e.toString ? e.toString() : String(e) }, null, 2));
    }
    return getDefaultPolicyText_();
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

// Test function to debug Google Doc access (remove after testing)
function testRuleDocAccess() {
  // Enable debug mode temporarily
  PropertiesService.getScriptProperties().setProperty('DEBUG', 'true');

  // Test with your actual Google Doc URL
  const testUrl = PropertiesService.getScriptProperties().getProperty('RULE_DOC_URL');

  console.log('Testing rule doc access with URL:', testUrl);

  if (testUrl) {
    const result = getRuleText_(testUrl);
    console.log('Result length:', result.length);
    console.log('First 200 characters:', result.substring(0, 200));
  } else {
    console.log('No RULE_DOC_URL set in script properties');
  }
}
