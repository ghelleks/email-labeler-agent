function categorizeWithGemini_(emails, rulesText, cfg) {
  const allowed = new Set(['reply_needed','review','todo','summarize']);
  const batches = [];
  for (let i = 0; i < emails.length; i += cfg.BATCH_SIZE) {
    batches.push(emails.slice(i, i + cfg.BATCH_SIZE));
  }

  const results = [];
  for (const batch of batches) {
    if (!enforceBudget_(1, cfg.DAILY_GEMINI_BUDGET)) {
      results.push.apply(results, batch.map(function(e) { return { id: e.id, required_action: null, reason: 'budget-exceeded', threadId: e.threadId }; }));
      continue;
    }
    const out = categorizeBatch_(batch, rulesText, cfg.MODEL_PRIMARY, cfg.PROJECT_ID, cfg.LOCATION, cfg.DEFAULT_FALLBACK_LABEL, cfg.GEMINI_API_KEY);
    if (cfg.DEBUG) {
      console.log(JSON.stringify({ batchSize: batch.length, llmRaw: out }, null, 2));
    }
    const byId = new Map(out.map(function(o) { return [o.id, o]; }));
    for (const e of batch) {
      const r = byId.get(e.id);
      const normalized = r && typeof r.required_action === 'string' ? String(r.required_action).toLowerCase().trim() : null;
      const valid = normalized && allowed.has(normalized);
      results.push({
        id: e.id,
        threadId: e.threadId,
        required_action: valid ? normalized : null,
        reason: valid ? (r.reason || 'ok') : 'invalid-or-missing'
      });
    }
  }
  return results;
}
