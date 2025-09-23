var Agents = (function() {
  var registryByLabel = new Map();
  var runCountThisExecution = 0;

  function getUserProps_() {
    return PropertiesService.getUserProperties();
  }

  function defaultIdempotentKey_(name, ctx) {
    return name + ':' + ctx.threadId;
  }

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
    var userProps = getUserProps_();

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

      var keyFn = item.options && item.options.idempotentKey;
      var idemKey = (isFunction_(keyFn) ? keyFn(ctx) : defaultIdempotentKey_(item.name, ctx));
      var idemStoreKey = 'agent_done:' + String(idemKey);
      if (userProps.getProperty(idemStoreKey)) {
        results.push({ agent: item.name, status: 'skip', info: 'idempotent-skip' });
        continue;
      }

      try {
        runCountThisExecution++;
        var result = item.handler(ctx) || { status: 'ok' };
        if (result && result.status === 'ok') {
          userProps.setProperty(idemStoreKey, '1');
        }
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


