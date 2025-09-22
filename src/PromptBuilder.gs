function buildCategorizePrompt_(rulesText, emails, allowed, fallback) {
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

  return [
    'You are an email triage assistant. Follow the Policy exactly.',
    'Policy:',
    rulesText,
    '',
    'Allowed labels: ' + allowed.join(', '),
    'If multiple labels could apply, follow the Policy’s precedence. If uncertain, choose: ' + fallback + '.',
    'Return ONLY valid JSON with this exact shape, no extra text:',
    schema,
    '',
    'Emails to categorize:',
    JSON.stringify(items, null, 2),
    '',
    'Return JSON for ALL items.'
  ].join('\n');
}
