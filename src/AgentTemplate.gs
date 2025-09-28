/**
 * AgentTemplate demonstrates the self-contained agent architecture pattern.
 *
 * This template shows how to create agents that manage their complete lifecycle:
 * - Configuration management (self-managed properties)
 * - Label management (creates own labels)
 * - Trigger management (manages own scheduling)
 * - Service integration (uses generic service layer)
 *
 * See ADR-011: Self-Contained Agent Architecture for detailed guidance.
 */

/**
 * TEMPLATE: Self-Contained Agent Pattern
 *
 * Copy this template and customize for your agent:
 * 1. Update configuration function with your agent's settings
 * 2. Update label management for your agent's labels
 * 3. Implement your agent's main logic
 * 4. Add trigger management if needed for scheduled execution
 * 5. Register your agent with appropriate label and options
 */
// ============================================================================
// TEMPLATE: Configuration Management (Self-Contained Pattern)
// ============================================================================

/**
 * Get agent-specific configuration with defaults
 * Agents manage their own PropertiesService keys without core Config.gs changes
 */
function getTemplateAgentConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    // Use agent-specific prefixes to avoid conflicts
    TEMPLATE_ENABLED: (props.getProperty('TEMPLATE_AGENT_ENABLED') || 'true').toLowerCase() === 'true',
    TEMPLATE_MAX_ITEMS: parseInt(props.getProperty('TEMPLATE_MAX_ITEMS') || '10', 10),
    TEMPLATE_DESTINATION: props.getProperty('TEMPLATE_DESTINATION') || Session.getActiveUser().getEmail(),
    // Add your agent's configuration options here
  };
}

// ============================================================================
// TEMPLATE: Label Management (Self-Contained Pattern)
// ============================================================================

/**
 * Ensure agent-specific labels exist
 * Agents create and manage their own labels independently
 */
function ensureTemplateAgentLabels_() {
  const labelName = 'template_processed'; // Use descriptive, agent-specific names
  return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
}

// ============================================================================
// TEMPLATE: Main Agent Logic
// ============================================================================

/**
 * Template agent handler function
 * ctx provides: label, decision, threadId, thread (GmailThread), cfg, dryRun, log(msg)
 * Returns { status: 'ok'|'skip'|'retry'|'error', info?: string }
 */
function templateAgentHandler(ctx) {
  try {
    // Get agent-specific configuration
    const config = getTemplateAgentConfig_();

    if (!config.TEMPLATE_ENABLED) {
      return { status: 'skip', info: 'agent disabled' };
    }

    ctx.log('templateAgent running for thread ' + ctx.threadId);

    if (ctx.dryRun) {
      return { status: 'skip', info: 'dry-run mode' };
    }

    // Ensure agent labels exist
    const processedLabel = ensureTemplateAgentLabels_();

    // TODO: Implement your agent's main logic here
    // Example: Add processed label to show agent ran
    ctx.thread.addLabel(processedLabel);

    return { status: 'ok', info: 'template agent processed thread' };

  } catch (error) {
    ctx.log('templateAgent error: ' + error.toString());
    return { status: 'error', info: error.toString() };
  }
}

// ============================================================================
// TEMPLATE: Trigger Management (Optional - for scheduled agents)
// ============================================================================

/**
 * Install scheduled trigger for this agent (if needed)
 * Agents manage their own trigger lifecycle
 */
function installTemplateAgentTrigger() {
  try {
    // Clean up existing triggers first
    deleteTemplateAgentTriggers_();

    // Create new trigger (example: daily at 5 AM)
    ScriptApp.newTrigger('runTemplateAgent')
      .timeBased()
      .everyDays(1)
      .atHour(5)
      .create();

    console.log('Template agent trigger installed successfully');
    return { success: true };
  } catch (error) {
    console.log('Error installing template agent trigger: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Entry point for scheduled execution
 */
function runTemplateAgent() {
  try {
    const config = getTemplateAgentConfig_();
    if (!config.TEMPLATE_ENABLED) {
      console.log('Template agent is disabled');
      return;
    }

    // TODO: Implement scheduled agent logic here
    // This runs independently of the main email processing workflow

    console.log('Template agent scheduled run completed');
  } catch (error) {
    console.log('Template agent scheduled run error: ' + error.toString());
  }
}

/**
 * Remove all triggers for this agent
 */
function deleteTemplateAgentTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runTemplateAgent')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

// ============================================================================
// TEMPLATE: Agent Registration
// ============================================================================

if (typeof AGENT_MODULES === 'undefined') {
  AGENT_MODULES = [];
}

AGENT_MODULES.push(function(api) {
  /**
   * Register template agent for demonstration
   * Disabled by default - enable for testing
   */
  api.register(
    'summarize',        // Label to trigger on
    'templateAgent',    // Agent name
    templateAgentHandler, // Handler function
    {
      idempotentKey: function(ctx) { return 'templateAgent:' + ctx.threadId; },
      runWhen: 'afterLabel',  // Run after labeling (respects dry-run)
      timeoutMs: 30000,       // Soft timeout guidance
      enabled: false          // Disabled by default
    }
  );
});


