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
 * @param {Object} knowledge - Knowledge object from KnowledgeService (optional)
 * @param {Object} config - Configuration object with emailLinks, includeWebLinks
 * @returns {string} - Formatted prompt for AI summarization
 */
function buildSummaryPrompt_(emailContents, knowledge, config) {
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
    `Please create a consolidated summary of these ${emailContents.length} emails in the style of "The Economist's World in Brief" - concise, direct, and informative.`
  ];

  // CONDITIONAL KNOWLEDGE INJECTION (new behavior)
  if (knowledge && knowledge.configured) {
    promptParts.push('');
    promptParts.push('=== SUMMARIZATION GUIDELINES ===');
    promptParts.push(knowledge.knowledge);

    // Token utilization logging (when SUMMARIZER_DEBUG enabled)
    if (knowledge.metadata && knowledge.metadata.utilizationPercent) {
      const summarizerCfg = getSummarizerConfig_();
      if (summarizerCfg.SUMMARIZER_DEBUG) {
        console.log(JSON.stringify({
          summarizerKnowledgeUtilization: knowledge.metadata.utilizationPercent,
          estimatedTokens: knowledge.metadata.estimatedTokens,
          modelLimit: knowledge.metadata.modelLimit
        }, null, 2));
      }
    }
  }

  promptParts.push('');
  promptParts.push('REQUIREMENTS:');
  promptParts.push('1. Create ONE unified summary covering all emails');
  promptParts.push('2. Use **bold formatting** for important terms, people, places, and proper nouns');
  promptParts.push('3. Use *italic formatting* for emphasis and context');
  promptParts.push('4. Group related topics together intelligently with clear theme headlines');
  promptParts.push('5. Keep the tone professional, authoritative, and concise');
  promptParts.push('6. Include important web URLs as inline markdown links: [link text](URL)');
  promptParts.push('7. Focus on key insights, decisions, and actionable information');
  promptParts.push('8. Maximum length: 400 words');
  promptParts.push('9. Structure each theme with a clear headline followed by content');
  promptParts.push('10. Include context that helps understand the significance of information');
  promptParts.push('');
  promptParts.push('MARKDOWN FORMATTING REQUIREMENTS:');
  promptParts.push('- Start each major theme with a clear headline (use ### format)');
  promptParts.push('- Group related emails under the same theme when appropriate');
  promptParts.push('- Include web URLs as proper markdown links: [descriptive text](URL) within sentences');
  promptParts.push('- At the end of each theme section, create Gmail links for source emails using this format:');
  promptParts.push('  **Sources:** [Email Subject 1](gmail_url_1), [Email Subject 2](gmail_url_2)');
  promptParts.push('- Use the exact subject lines and Gmail URLs from the EMAIL REFERENCE MAP provided below');
  promptParts.push("- If emails don't naturally group, create logical themes like \"Business Updates\", \"Project Status\", \"Action Items\", etc.");
  promptParts.push('- Use standard markdown formatting throughout (bold, italic, links, headers)');
  promptParts.push('');
  promptParts.push('STYLE NOTES:');
  promptParts.push('- Write like a seasoned journalist summarizing global events');
  promptParts.push('- Be direct and factual, avoid unnecessary adjectives');
  promptParts.push('- Use present tense where appropriate');
  promptParts.push('- Prioritize information by importance and urgency');
  promptParts.push('- Each theme should be self-contained with its relevant source attribution');
  promptParts.push('');
  promptParts.push(emailReferenceMap);
  promptParts.push('');
  promptParts.push(combinedContent + webLinksSection);
  promptParts.push('');
  promptParts.push('Please provide only the summary text using proper markdown formatting (bold, italic, links, headers). Do not include introductory phrases like "Here is a summary" - start directly with the content.');

  return promptParts.join('\n');
}

/**
 * Format email thread for inclusion in prompt
 * @private
 * @param {Object} emailThread - Thread object with messages array
 * @returns {string} - Formatted email thread
 */
function formatEmailThread_(emailThread) {
  if (!emailThread || !emailThread.messages || emailThread.messages.length === 0) {
    return 'No email thread available.';
  }

  return emailThread.messages.map(function(msg, idx) {
    const parts = [];
    parts.push('--- Email ' + (idx + 1) + ' ---');
    parts.push('From: ' + (msg.from || 'Unknown'));
    parts.push('To: ' + (msg.to || 'Unknown'));
    parts.push('Date: ' + (msg.date || 'Unknown'));
    parts.push('Subject: ' + (msg.subject || '(No subject)'));
    parts.push('');
    parts.push(msg.body || '(No content)');
    return parts.join('\n');
  }).join('\n\n');
}

/**
 * Build reply draft prompt with optional knowledge injection
 * @param {Object} emailThread - Thread object with messages array
 * @param {Object} knowledge - Knowledge object from KnowledgeService (optional)
 * @returns {string} - Complete prompt for reply generation
 */
function buildReplyDraftPrompt_(emailThread, knowledge) {
  const parts = ['You are drafting a professional email reply.'];

  // CONDITIONAL KNOWLEDGE INJECTION
  if (knowledge && knowledge.configured) {
    parts.push('');
    parts.push('=== YOUR DRAFTING INSTRUCTIONS ===');
    parts.push(knowledge.knowledge);

    // Add source attribution if available
    if (knowledge.metadata && knowledge.metadata.sources && knowledge.metadata.sources.length > 0) {
      parts.push('');
      const sourceNames = knowledge.metadata.sources.map(function(s) { return s.name; });
      parts.push('Context sources: ' + sourceNames.join(', '));
    }

    // Token utilization logging (when REPLY_DRAFTER_DEBUG enabled)
    if (knowledge.metadata && knowledge.metadata.utilizationPercent) {
      const cfg = getConfig_();
      if (cfg.REPLY_DRAFTER_DEBUG) {
        console.log(JSON.stringify({
          replyDrafterKnowledgeUtilization: knowledge.metadata.utilizationPercent,
          estimatedTokens: knowledge.metadata.estimatedTokens,
          modelLimit: knowledge.metadata.modelLimit
        }, null, 2));
      }
    }
  } else {
    // Basic instructions when no knowledge configured
    parts.push('');
    parts.push('=== DRAFTING GUIDELINES ===');
    parts.push('- Match the tone and formality of the original email');
    parts.push('- Be concise and actionable');
    parts.push('- Address all questions and concerns raised');
    parts.push('- Use a professional but friendly tone');
    parts.push('- End with appropriate next steps or closing');
  }

  parts.push('');
  parts.push('=== EMAIL THREAD ===');
  parts.push(formatEmailThread_(emailThread));
  parts.push('');
  parts.push('Draft a professional reply that addresses all points raised in the most recent email.');
  parts.push('Return ONLY the reply text, no preamble or explanation.');

  return parts.join('\n');
}
