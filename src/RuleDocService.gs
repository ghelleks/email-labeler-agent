function getRuleText_(docIdOrUrl) {
  if (!docIdOrUrl) return getDefaultPolicyText_();
  // If a full URL is provided, try to extract the file ID
  var docId = docIdOrUrl;
  if (/^https?:\/\//i.test(docIdOrUrl)) {
    var m = docIdOrUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || docIdOrUrl.match(/id=([a-zA-Z0-9_-]+)/);
    docId = m && m[1] ? m[1] : null;
  }
  if (!docId) return getDefaultPolicyText_();
  try {
    const file = DriveApp.getFileById(docId);
    try {
      const txt = file.getAs(MimeType.PLAIN_TEXT).getDataAsString('utf-8');
      return txt || getDefaultPolicyText_();
    } catch (e) {
      const txt2 = file.getBlob().getDataAsString('utf-8');
      return txt2 || getDefaultPolicyText_();
    }
  } catch (e) {
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
