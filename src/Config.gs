function getConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    GEMINI_API_KEY: p.getProperty('GEMINI_API_KEY'),
    PROJECT_ID: p.getProperty('GOOGLE_CLOUD_PROJECT') || p.getProperty('PROJECT_ID'),
    LOCATION: p.getProperty('GOOGLE_CLOUD_LOCATION') || 'us-central1',
    RULE_DOC_ID: p.getProperty('RULE_DOC_ID'),
    RULE_DOC_URL: p.getProperty('RULE_DOC_URL'),
    DEFAULT_FALLBACK_LABEL: p.getProperty('DEFAULT_FALLBACK_LABEL') || 'review',
    MAX_EMAILS_PER_RUN: parseInt(p.getProperty('MAX_EMAILS_PER_RUN') || '20', 10),
    BATCH_SIZE: parseInt(p.getProperty('BATCH_SIZE') || '10', 10),
    BODY_CHARS: parseInt(p.getProperty('BODY_CHARS') || '1200', 10),
    DAILY_GEMINI_BUDGET: parseInt(p.getProperty('DAILY_GEMINI_BUDGET') || '50', 10),
    DRY_RUN: (p.getProperty('DRY_RUN') || 'false').toLowerCase() === 'true',
    DEBUG: (p.getProperty('DEBUG') || 'false').toLowerCase() === 'true',
    MODEL_PRIMARY: 'gemini-2.5-flash',
    MODEL_ESCALATE: 'gemini-2.5-pro',
    // Agents framework
    AGENTS_ENABLED: (p.getProperty('AGENTS_ENABLED') || 'true').toLowerCase() === 'true',
    AGENTS_DRY_RUN: (p.getProperty('AGENTS_DRY_RUN') || '').toLowerCase() === 'true' ? true : ((p.getProperty('AGENTS_DRY_RUN') || '').toLowerCase() === 'false' ? false : null),
    AGENTS_BUDGET_PER_RUN: parseInt(p.getProperty('AGENTS_BUDGET_PER_RUN') || '50', 10),
    AGENTS_LABEL_MAP: (function(){
      try { return JSON.parse(p.getProperty('AGENTS_LABEL_MAP') || 'null'); } catch (e) { return null; }
    })(),
    // Web App Configuration
    WEBAPP_ENABLED: (p.getProperty('WEBAPP_ENABLED') || 'true').toLowerCase() === 'true',
    WEBAPP_MAX_EMAILS_PER_SUMMARY: parseInt(p.getProperty('WEBAPP_MAX_EMAILS_PER_SUMMARY') || '50', 10),
    // KnowledgeService Configuration
    // Global Knowledge (applies to ALL AI operations - ADR-019)
    GLOBAL_KNOWLEDGE_FOLDER_URL: p.getProperty('GLOBAL_KNOWLEDGE_FOLDER_URL'),
    GLOBAL_KNOWLEDGE_MAX_DOCS: parseInt(p.getProperty('GLOBAL_KNOWLEDGE_MAX_DOCS') || '5', 10),
    // Email Labeling Knowledge (INSTRUCTIONS = how to label, KNOWLEDGE = contextual reference)
    LABEL_INSTRUCTIONS_DOC_URL: p.getProperty('LABEL_INSTRUCTIONS_DOC_URL'),
    LABEL_KNOWLEDGE_FOLDER_URL: p.getProperty('LABEL_KNOWLEDGE_FOLDER_URL'),
    LABEL_KNOWLEDGE_MAX_DOCS: parseInt(p.getProperty('LABEL_KNOWLEDGE_MAX_DOCS') || '5', 10),
    // KnowledgeService Core Settings
    KNOWLEDGE_CACHE_DURATION_MINUTES: parseInt(p.getProperty('KNOWLEDGE_CACHE_DURATION_MINUTES') || '30', 10),
    KNOWLEDGE_DEBUG: (p.getProperty('KNOWLEDGE_DEBUG') || 'false').toLowerCase() === 'true',
    KNOWLEDGE_LOG_SIZE_WARNINGS: (p.getProperty('KNOWLEDGE_LOG_SIZE_WARNINGS') || 'true').toLowerCase() === 'true',
    // KnowledgeService Test Configuration
    TEST_DOC_URL: p.getProperty('TEST_DOC_URL'),
    TEST_FOLDER_URL: p.getProperty('TEST_FOLDER_URL'),
    // Budget History Configuration
    BUDGET_HISTORY_DAYS: parseInt(p.getProperty('BUDGET_HISTORY_DAYS') || '3', 10)
  };
}

function ensureLabels_() {
  ['reply_needed','review','todo','summarize'].forEach(function(name) {
    if (!GmailApp.getUserLabelByName(name)) GmailApp.createLabel(name);
  });
}

/**
 * Clean up old budget properties to prevent property accumulation
 * Removes date-based budget properties older than BUDGET_HISTORY_DAYS (default: 3 days)
 * Budget properties follow the format: BUDGET-YYYY-MM-DD
 *
 * @param {Object} cfg - Configuration object from getConfig_()
 * @returns {Object} - Cleanup summary with counts of deleted and retained properties
 */
function cleanupOldBudgetProperties_(cfg) {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const retentionDays = cfg.BUDGET_HISTORY_DAYS;

  // Calculate cutoff date
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));

  let deletedCount = 0;
  let retainedCount = 0;
  const deletedKeys = [];

  // Pattern to match budget properties: BUDGET-YYYY-MM-DD
  const budgetPattern = /^BUDGET-(\d{4})-(\d{2})-(\d{2})$/;

  Object.keys(allProps).forEach(function(key) {
    const match = key.match(budgetPattern);
    if (match) {
      // Parse date from property key
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
      const day = parseInt(match[3], 10);
      const propDate = new Date(year, month, day);

      // Delete if older than cutoff
      if (propDate < cutoffDate) {
        props.deleteProperty(key);
        deletedKeys.push(key);
        deletedCount++;
        if (cfg.DEBUG) {
          console.log('Deleted old budget property: ' + key + ' (date: ' + propDate.toISOString().split('T')[0] + ')');
        }
      } else {
        retainedCount++;
      }
    }
  });

  const summary = {
    deleted: deletedCount,
    retained: retainedCount,
    retentionDays: retentionDays,
    cutoffDate: cutoffDate.toISOString().split('T')[0]
  };

  if (cfg.DEBUG && deletedCount > 0) {
    console.log('Budget cleanup summary: ' + JSON.stringify(summary, null, 2));
  } else if (deletedCount > 0) {
    console.log('Cleaned up ' + deletedCount + ' old budget properties (retained ' + retainedCount + ' recent)');
  }

  return summary;
}
