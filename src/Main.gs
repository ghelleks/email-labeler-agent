function run() {
  const cfg = getConfig_();
  if (!cfg.PROJECT_ID) throw new Error('GOOGLE_CLOUD_PROJECT (PROJECT_ID) is not set.');
  ensureLabels_();

  const rulesText = getRuleText_(cfg.RULE_DOC_URL || cfg.RULE_DOC_ID);
  if (!rulesText) throw new Error('Rules doc is empty or unreadable.');

  const threads = findUnprocessed_(cfg.MAX_EMAILS_PER_RUN);
  if (!threads.length) return console.log('No candidates.');

  const emails = minimalize_(threads, cfg.BODY_CHARS);
  const results = categorizeWithGemini_(emails, rulesText, cfg);

  const summary = Organizer.apply_(results, cfg);
  if (cfg.DEBUG) {
    console.log(JSON.stringify({ summary: summary, sample: results.slice(0, 5) }, null, 2));
  }
  console.log(JSON.stringify({ ...summary, dryRun: cfg.DRY_RUN }, null, 2));
}

function installTrigger() {
  deleteExistingTriggers_();
  ScriptApp.newTrigger('run').timeBased().everyHours(1).create();
}

function deleteExistingTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'run')
    .forEach(ScriptApp.deleteTrigger);
}
