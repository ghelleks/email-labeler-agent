function registerAgents() {
  Agents.register(
    'summarize',
    'demoExampleAgent',
    function(ctx) {
      ctx.log('demoExampleAgent running for thread ' + ctx.threadId);
      if (ctx.dryRun) return { status: 'skip', info: 'dry-run' };
      var labelName = 'demo_example_agent';
      var lbl = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
      ctx.thread.addLabel(lbl);
      return { status: 'ok', info: 'added demo_example_agent label' };
    },
    {
      idempotentKey: function(ctx) { return 'demoExampleAgent:' + ctx.threadId; },
      runWhen: 'afterLabel',
      timeoutMs: 20000
    }
  );
}


