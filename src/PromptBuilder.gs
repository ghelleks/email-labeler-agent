function buildCategorizePrompt_(emails, knowledge, allowed, fallback) {
  const schema = JSON.stringify({
    emails: [{ id: 'string', required_action: allowed.join('|'), reason: 'string' }]
  }, null, 2);

  const items = emails.map(function(e) {
    return {
      id: e.id,
      subject: e.subject || '',
      from: e.from || '',
      date: e.date || '',
      age_days: e.ageDays || 0,
      body_excerpt: (e.plainBody || '').slice(0, 1200)
    };
  });

  const parts = [
    'You are an email triage assistant.'
  ];

  // CONDITIONAL KNOWLEDGE INJECTION (new behavior)
  if (knowledge && knowledge.configured) {
    parts.push('');
    parts.push('=== LABELING POLICY ===');
    parts.push(knowledge.knowledge);

    // Token utilization logging (when DEBUG enabled)
    if (knowledge.metadata && knowledge.metadata.utilizationPercent) {
      const cfg = getConfig_();
      if (cfg.DEBUG) {
        console.log(JSON.stringify({
          knowledgeUtilization: knowledge.metadata.utilizationPercent,
          estimatedTokens: knowledge.metadata.estimatedTokens,
          modelLimit: knowledge.metadata.modelLimit
        }, null, 2));
      }
    }
  }

  parts.push('');
  parts.push('Allowed labels: ' + allowed.join(', '));
  parts.push("If multiple labels could apply, follow the Policy's precedence. If uncertain, choose: " + fallback + ".");
  parts.push('Return ONLY valid JSON with this exact shape, no extra text:');
  parts.push(schema);
  parts.push('');
  parts.push('Emails to categorize:');
  parts.push(JSON.stringify(items, null, 2));
  parts.push('');
  parts.push('Return JSON for ALL items.');

  return parts.join('\n');
}

/**
 * Build consolidated summary prompt for multiple emails
 * @param {Array} emailContents - Array of email objects with subject, from, date, body
 * @param {Object} config - Configuration object with emailLinks, includeWebLinks
 * @returns {string} - Formatted prompt for AI summarization
 */
function buildSummaryPrompt_(emailContents, config) {
  // Build email reference mapping with subjects and Gmail URLs for the AI
  let emailReferenceMap = 'EMAIL REFERENCE MAP:\n';
  for (let i = 0; i < emailContents.length; i++) {
    const email = emailContents[i];
    // Find the corresponding Gmail URL from the emailLinks config
    const correspondingLink = config.emailLinks ? config.emailLinks.find(link => link.subject === email.subject) : null;
    const gmailUrl = correspondingLink ? correspondingLink.url : `https://mail.google.com/mail/u/0/#inbox/${email.id}`;
    emailReferenceMap += `Email ${i + 1}: Subject="${email.subject}" URL=${gmailUrl}\n`;
  }

  // Combine all email content for single AI request
  let combinedContent = `EMAILS TO SUMMARIZE (${emailContents.length} total):\n\n`;

  for (let i = 0; i < emailContents.length; i++) {
    const email = emailContents[i];
    combinedContent += `--- EMAIL ${i + 1} ---\n`;
    combinedContent += `From: ${email.from}\n`;
    combinedContent += `Subject: ${email.subject}\n`;
    combinedContent += `Date: ${email.date}\n`;
    combinedContent += `Content: ${email.body.substring(0, 1200)}\n\n`;
  }

  // Build web links section if provided - these will be included inline by the AI
  let webLinksSection = '';
  if (config.includeWebLinks && config.includeWebLinks.length > 0) {
    webLinksSection = '\n\nWEB LINKS FOUND IN EMAILS (include these inline in relevant themes):\n' + config.includeWebLinks.join('\n');
  }

  // Build the main prompt
  const promptParts = [
    `Please create a consolidated summary of these ${emailContents.length} emails in the style of "The Economist's World in Brief" - concise, direct, and informative.`,
    '',
    'REQUIREMENTS:',
    '1. Create ONE unified summary covering all emails',
    '2. Use **bold formatting** for important terms, people, places, and proper nouns',
    '3. Use *italic formatting* for emphasis and context',
    '4. Group related topics together intelligently with clear theme headlines',
    '5. Keep the tone professional, authoritative, and concise',
    '6. Include important web URLs as inline markdown links: [link text](URL)',
    '7. Focus on key insights, decisions, and actionable information',
    '8. Maximum length: 400 words',
    '9. Structure each theme with a clear headline followed by content',
    '10. Include context that helps understand the significance of information',
    '',
    'MARKDOWN FORMATTING REQUIREMENTS:',
    '- Start each major theme with a clear headline (use ### format)',
    '- Group related emails under the same theme when appropriate',
    '- Include web URLs as proper markdown links: [descriptive text](URL) within sentences',
    '- At the end of each theme section, create Gmail links for source emails using this format:',
    '  **Sources:** [Email Subject 1](gmail_url_1), [Email Subject 2](gmail_url_2)',
    '- Use the exact subject lines and Gmail URLs from the EMAIL REFERENCE MAP provided below',
    "- If emails don't naturally group, create logical themes like \"Business Updates\", \"Project Status\", \"Action Items\", etc.",
    '- Use standard markdown formatting throughout (bold, italic, links, headers)',
    '',
    'STYLE NOTES:',
    '- Write like a seasoned journalist summarizing global events',
    '- Be direct and factual, avoid unnecessary adjectives',
    '- Use present tense where appropriate',
    '- Prioritize information by importance and urgency',
    '- Each theme should be self-contained with its relevant source attribution',
    '',
    emailReferenceMap,
    '',
    combinedContent + webLinksSection,
    '',
    'Please provide only the summary text using proper markdown formatting (bold, italic, links, headers). Do not include introductory phrases like "Here is a summary" - start directly with the content.'
  ];

  return promptParts.join('\n');
}
