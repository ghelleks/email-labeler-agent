/**
 * Fetch rule document text for email labeling
 *
 * @deprecated Use KnowledgeService.fetchDocument_() or fetchLabelingKnowledge_() instead
 *
 * This function is maintained for backward compatibility with existing code.
 * It wraps the new KnowledgeService but maintains the old behavior:
 * - Returns plain text (not structured object)
 * - Returns default rules if not configured (differs from KnowledgeService fail-fast)
 *
 * Migration path:
 * - Old: const rulesText = getRuleText_(cfg.RULE_DOC_URL);
 * - New: const knowledge = fetchLabelingKnowledge_({ instructionsUrl: cfg.LABEL_INSTRUCTIONS_DOC_URL });
 *
 * @param {string} docIdOrUrl - Document ID or URL (RULE_DOC_URL/RULE_DOC_ID)
 * @return {string} Rule document text or default rules
 */
function getRuleText_(docIdOrUrl) {
  const cfg = getConfig_();

  // Log deprecation warning
  if (cfg.DEBUG === 'true') {
    console.log('DEPRECATION WARNING: getRuleText_() is deprecated. ' +
                'Use KnowledgeService.fetchDocument_() or fetchLabelingKnowledge_() instead. ' +
                'See CLAUDE.md for migration guide.');
  }

  // Use new KnowledgeService
  try {
    const knowledge = fetchDocument_(docIdOrUrl, {
      propertyName: 'RULE_DOC_URL'
    });

    // Maintain backward compatibility: return default rules if not configured
    if (!knowledge.configured) {
      if (cfg.DEBUG === 'true') {
        console.log(JSON.stringify({ ruleDocSource: 'default', reason: 'no-doc-id-or-url-provided' }, null, 2));
      }
      return getDefaultPolicyText_();
    }

    // Return plain text (not structured object) for backward compatibility
    if (cfg.DEBUG === 'true') {
      console.log(JSON.stringify({
        ruleDocSource: 'knowledge-service',
        contentLength: knowledge.knowledge.length,
        estimatedTokens: knowledge.metadata.estimatedTokens,
        contentPreview: knowledge.knowledge.substring(0, 200) + (knowledge.knowledge.length > 200 ? '...' : '')
      }, null, 2));
    }

    return knowledge.knowledge;

  } catch (e) {
    // KnowledgeService throws errors when document is configured but inaccessible
    // Re-throw with original error message for backward compatibility
    throw e;
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
    '- **Email Summary sent to myself** → review\n',
    '- **Action words**: google workspace notifications, "your order", "please", "required", "due", "review" → todo or review\n' +
    '- **Time sensitivity**: "urgent", "asap", "deadline" → todo\n' +
    '- **Question format**: personal emails, direct questions → reply_needed\n' +
    '- **Calendar keywords**: "meeting", "schedule", "invite" → review\n' +
    '- **Automated confirmations**: calendar invitations, Notifications, updates, "we processed", "thank you for" → summarize\n'
  );
}


