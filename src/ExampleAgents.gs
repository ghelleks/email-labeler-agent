/**
 * ExampleAgents demonstrates how to register a simple, safe agent.
 *
 * Behavior:
 * - Triggers when a thread is labeled 'summarize'.
 * - Adds a secondary label 'demo_example_agent' to the thread.
 * - Honors dry-run by skipping side effects.
 * - Uses idempotency to avoid re-running for the same thread.
 */
/**
 * Preferred pattern: push a registrar into the global AGENT_MODULES queue.
 * The runtime will drain this queue at startup and call each registrar
 * with an API exposing Agents.register(). This avoids load-order issues.
 */
if (typeof AGENT_MODULES === 'undefined') {
  AGENT_MODULES = [];
}

AGENT_MODULES.push(function(api) {
  /**
   * Register a demo agent named 'demoExampleAgent' for the 'summarize' label.
   * The agent does something innocuous so developers can see the pattern.
   */
  api.register(
    'summarize',
    'demoExampleAgent',
    /**
     * Agent handler.
     * ctx provides: label, decision, threadId, thread (GmailThread), cfg, dryRun, log(msg)
     * Returns { status: 'ok'|'skip'|'retry'|'error', info?: string }
     */
    function(ctx) {
      ctx.log('demoExampleAgent running for thread ' + ctx.threadId);
      if (ctx.dryRun) return { status: 'skip', info: 'dry-run' };
      // Add an extra label to the thread as a harmless side effect
      var labelName = 'demo_example_agent';
      var lbl = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
      ctx.thread.addLabel(lbl);
      return { status: 'ok', info: 'added demo_example_agent label' };
    },
    /**
     * Agent options:
     * - idempotentKey: ensure we run at most once per thread
     * - runWhen: 'afterLabel' respects dry-run (use 'always' to bypass)
     * - timeoutMs: soft guidance for long work (no hard enforcement here)
     */
    {
      idempotentKey: function(ctx) { return 'demoExampleAgent:' + ctx.threadId; },
      runWhen: 'afterLabel',
      timeoutMs: 20000
    }
  );
});


