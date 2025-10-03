var Agents = (function() {
  var registryByLabel = new Map();
  var runCountThisExecution = 0;

  function isFunction_(f) {
    return typeof f === 'function';
  }

  function register(label, name, handler, options) {
    if (!label || !name || !isFunction_(handler)) return;
    var list = registryByLabel.get(label);
    if (!list) {
      list = [];
      registryByLabel.set(label, list);
    }
    list.push({ name: name, handler: handler, options: options || {} });
  }

  function runFor(label, ctx) {
    var results = [];
    var cfg = ctx && ctx.cfg || {};
    if (cfg.AGENTS_ENABLED === false) return results;

    var list = registryByLabel.get(label) || [];

    // Optional filtering by config map
    var allowList = cfg.AGENTS_LABEL_MAP && cfg.AGENTS_LABEL_MAP[label];
    if (allowList && allowList.length) {
      list = list.filter(function(item) { return allowList.indexOf(item.name) !== -1; });
    }

    if (!list.length) return results;

    var budget = typeof cfg.AGENTS_BUDGET_PER_RUN === 'number' ? cfg.AGENTS_BUDGET_PER_RUN : 50;

    for (var i = 0; i < list.length; i++) {
      var item = list[i];

      // Respect per-agent enabled flag (default: enabled)
      var isEnabled = !(item.options && item.options.enabled === false);
      if (!isEnabled) {
        results.push({ agent: item.name, status: 'skip', info: 'disabled' });
        continue;
      }

      if (runCountThisExecution >= budget) {
        results.push({ agent: item.name, status: 'skip', info: 'budget-exceeded' });
        continue;
      }

      var runWhen = item.options && item.options.runWhen || 'afterLabel';
      var shouldSkipForDryRun = ctx.dryRun && runWhen !== 'always' && (cfg.AGENTS_DRY_RUN !== false);
      if (shouldSkipForDryRun) {
        results.push({ agent: item.name, status: 'skip', info: 'dry-run' });
        continue;
      }

      // ADR-017: Removed UserProperties-based idempotency tracking
      // Agents implement application-level idempotency checks as needed

      try {
        runCountThisExecution++;
        var result = item.handler(ctx) || { status: 'ok' };
        results.push({ agent: item.name, status: result.status || 'ok', info: result.info, retryAfterMs: result.retryAfterMs });
      } catch (e) {
        results.push({ agent: item.name, status: 'error', info: (e && e.toString ? e.toString() : String(e)) });
      }
    }
    return results;
  }

  function registerAllModules() {
    try {
      var mods = (typeof AGENT_MODULES !== 'undefined' && AGENT_MODULES) || [];
      if (!mods || !mods.length) return 0;
      for (var i = 0; i < mods.length; i++) {
        var registrar = mods[i];
        if (typeof registrar === 'function') {
          try { registrar({ register: register }); } catch (e) {
            // swallow to avoid breaking startup; errors will be visible in DEBUG logs elsewhere
          }
        }
      }
      // drain the queue so repeated calls don't duplicate registrations
      if (typeof AGENT_MODULES !== 'undefined') {
        AGENT_MODULES = [];
      }
      return mods.length;
    } catch (e) {
      return 0;
    }
  }

  return {
    register: register,
    runFor: runFor,
    registerAllModules: registerAllModules
  };
})();

// ============================================================================
// Migration Utilities (ADR-017)
// ============================================================================

/**
 * Clear all legacy agent idempotency keys from UserProperties
 * Run once after deploying ADR-017 changes
 *
 * This removes all 'agent_done:*' keys that were used for framework-level
 * idempotency tracking. After ADR-017, agents implement their own
 * application-level idempotency checks as needed.
 *
 * @returns {Object} Summary of cleanup operation
 */
function clearAllAgentIdempotencyKeys() {
  const userProps = PropertiesService.getUserProperties();
  const allProps = userProps.getProperties();
  const agentKeys = Object.keys(allProps).filter(function(k) {
    return k.startsWith('agent_done:');
  });

  console.log('Found ' + agentKeys.length + ' legacy agent idempotency keys to clear');

  // Clear all agent state keys
  agentKeys.forEach(function(key) {
    userProps.deleteProperty(key);
  });

  const summary = {
    keysCleared: agentKeys.length,
    sampleKeys: agentKeys.slice(0, 5), // Show first 5 for verification
    timestamp: new Date().toISOString()
  };

  console.log('Migration complete: ' + JSON.stringify(summary, null, 2));
  return summary;
}


