function getRuleText_(docIdOrUrl) {
  const debug = PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true';

  if (!docIdOrUrl) {
    if (debug) {
      console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'no-doc-id-or-url-provided' }, null, 2));
    }
    return getDefaultPolicyText_();
  }

  // If a full URL is provided, try to extract the file ID
  var docId = docIdOrUrl;
  if (/^https?:\/\//i.test(docIdOrUrl)) {
    var m = docIdOrUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || docIdOrUrl.match(/id=([a-zA-Z0-9_-]+)/);
    docId = m && m[1] ? m[1] : null;
  }

  if (!docId) {
    if (debug) {
      console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'could-not-extract-doc-id', input: docIdOrUrl }, null, 2));
    }
    return getDefaultPolicyText_();
  }

  try {
    const file = DriveApp.getFileById(docId);
    try {
      const txt = file.getAs(MimeType.PLAIN_TEXT).getDataAsString('utf-8');
      if (txt) {
        if (debug) {
          console.log(JSON.stringify({ ruleDocSource: 'drive-file', docId: docId, textLength: txt.length }, null, 2));
        }
        return txt;
      } else {
        if (debug) {
          console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'empty-file-content', docId: docId }, null, 2));
        }
        return getDefaultPolicyText_();
      }
    } catch (e) {
      const txt2 = file.getBlob().getDataAsString('utf-8');
      if (txt2) {
        if (debug) {
          console.log(JSON.stringify({ ruleDocSource: 'drive-file-blob', docId: docId, textLength: txt2.length }, null, 2));
        }
        return txt2;
      } else {
        if (debug) {
          console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'empty-blob-content', docId: docId }, null, 2));
        }
        return getDefaultPolicyText_();
      }
    }
  } catch (e) {
    if (debug) {
      console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'drive-access-error', docId: docId, error: e.toString() }, null, 2));
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
