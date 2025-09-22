function applyLabel_(thread, labelName, dryRun) {
  const actionNames = ['reply_needed','review','todo','summarize'];
  const hasAny = thread.getLabels().some(function(l) { return actionNames.includes(l.getName()); });
  if (hasAny) return 'skipped';
  if (dryRun) return 'would-label:' + labelName;
  const lbl = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
  thread.addLabel(lbl);
  return 'labeled';
}

const Organizer = {
  apply_: function(results, cfg) {
    let labeled = 0, skipped = 0, errors = 0;
    const byThread = new Map();
    results.forEach(function(r) { byThread.set(r.threadId, r); });

    for (const entry of byThread.entries()) {
      const threadId = entry[0];
      const r = entry[1];
      try {
        if (cfg.DEBUG) {
          console.log(JSON.stringify({ action: 'apply', threadId: threadId, decided_label: r.required_action, reason: r.reason }, null, 2));
        }
        const thread = GmailApp.getThreadById(threadId);
        if (!r.required_action) {
          skipped++;
          continue;
        }
        const status = applyLabel_(thread, r.required_action, cfg.DRY_RUN);
        if (status === 'labeled') labeled++;
        else if (status === 'skipped' || status.indexOf('would-label') === 0) skipped++;
      } catch (e) {
        errors++;
        console.log('Error labeling thread ' + threadId + ': ' + e);
      }
    }
    return { candidates: results.length, labeled: labeled, skipped: skipped, errors: errors };
  }
};
