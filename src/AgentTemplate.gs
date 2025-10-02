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
    // Basic agent settings
    TEMPLATE_ENABLED: (props.getProperty('TEMPLATE_AGENT_ENABLED') || 'true').toLowerCase() === 'true',
    TEMPLATE_MAX_ITEMS: parseInt(props.getProperty('TEMPLATE_MAX_ITEMS') || '10', 10),
    TEMPLATE_DESTINATION: props.getProperty('TEMPLATE_DESTINATION') || Session.getActiveUser().getEmail(),

    // Knowledge configuration (for AI-powered agents - ADR-015 semantic naming)
    // INSTRUCTIONS: How to perform the task (methodology, criteria, guidelines)
    // KNOWLEDGE: Contextual reference material (examples, background, patterns)
    TEMPLATE_INSTRUCTIONS_DOC_URL: props.getProperty('TEMPLATE_INSTRUCTIONS_DOC_URL'),
    TEMPLATE_KNOWLEDGE_FOLDER_URL: props.getProperty('TEMPLATE_KNOWLEDGE_FOLDER_URL'),
    TEMPLATE_KNOWLEDGE_MAX_DOCS: parseInt(props.getProperty('TEMPLATE_KNOWLEDGE_MAX_DOCS') || '5', 10),

    // Debugging
    TEMPLATE_DEBUG: (props.getProperty('TEMPLATE_DEBUG') || 'false').toLowerCase() === 'true',
    TEMPLATE_DRY_RUN: (props.getProperty('TEMPLATE_DRY_RUN') || 'false').toLowerCase() === 'true'
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

    // For AI-powered agents: Fetch knowledge before processing
    // Uncomment if your agent uses AI with customizable behavior
    // const knowledge = fetchTemplateAgentKnowledge_({
    //   instructionsUrl: config.TEMPLATE_INSTRUCTIONS_DOC_URL,
    //   knowledgeFolderUrl: config.TEMPLATE_KNOWLEDGE_FOLDER_URL,
    //   maxDocs: config.TEMPLATE_KNOWLEDGE_MAX_DOCS
    // });
    //
    // Build AI prompt with knowledge injection
    // const prompt = buildTemplatePrompt_(emailData, knowledge, config);
    //
    // Call LLMService with built prompt
    // const result = someAIFunction_(prompt, config);

    // TODO: Implement your agent's main logic here
    // Example: Add processed label to show agent ran
    ctx.thread.addLabel(processedLabel);

    return { status: 'ok', info: 'template agent processed thread' };

  } catch (error) {
    // Use shared utility for standardized error handling
    const errorResult = standardErrorHandler_(error, 'templateAgent');
    ctx.log('templateAgent error: ' + errorResult.message);
    return { status: 'error', info: errorResult.message };
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
  // Use shared utility for trigger management
  const result = createTimeTrigger_('runTemplateAgent', { type: 'daily', hour: 5 });
  if (result.success) {
    console.log('Template agent trigger installed successfully');
  }
  return result;
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
    // Use shared utility for error handling
    const errorResult = standardErrorHandler_(error, 'templateAgent scheduled run');
    console.log(errorResult.message);
  }
}

/**
 * Remove all triggers for this agent
 */
function deleteTemplateAgentTriggers_() {
  // Use shared utility for trigger cleanup
  return deleteTriggersByFunction_('runTemplateAgent');
}

// ============================================================================
// TEMPLATE: KnowledgeService Integration (For AI-Powered Agents)
// ============================================================================

/**
 * Example: Fetch agent-specific knowledge from Google Drive
 *
 * For AI-powered agents, use KnowledgeService to fetch customization documents:
 * - INSTRUCTIONS: How to perform tasks (methodology, style, criteria)
 * - KNOWLEDGE: Contextual reference material (examples, context, patterns)
 *
 * This pattern enables users to customize agent behavior without code changes.
 *
 * See ADR-015 for INSTRUCTIONS vs KNOWLEDGE semantic naming convention.
 * See Email Summarizer (AgentSummarizer.gs) for a complete working example.
 */
function fetchTemplateAgentKnowledge_(config) {
  config = config || {};

  const instructionsUrl = config.instructionsUrl;
  const knowledgeFolderUrl = config.knowledgeFolderUrl;
  const maxDocs = config.maxDocs || 5;

  // Nothing configured - agent runs with default behavior
  if (!instructionsUrl && !knowledgeFolderUrl) {
    return {
      configured: false,
      knowledge: null,
      metadata: null
    };
  }

  const parts = [];
  const sources = [];
  let totalChars = 0;
  let totalDocs = 0;

  // Fetch instructions document (how to perform the task)
  if (instructionsUrl) {
    const instructionsResult = fetchDocument_(instructionsUrl, {
      propertyName: 'TEMPLATE_INSTRUCTIONS_DOC_URL'
    });

    if (instructionsResult.configured) {
      parts.push(instructionsResult.knowledge);
      sources.push(instructionsResult.metadata.source);
      totalChars += instructionsResult.metadata.chars;
      totalDocs++;
    }
  }

  // Fetch knowledge folder (contextual reference material)
  if (knowledgeFolderUrl) {
    const knowledgeResult = fetchFolder_(knowledgeFolderUrl, {
      propertyName: 'TEMPLATE_KNOWLEDGE_FOLDER_URL',
      maxDocs: maxDocs
    });

    if (knowledgeResult.configured) {
      parts.push(knowledgeResult.knowledge);
      sources.push(...knowledgeResult.metadata.sources);
      totalChars += knowledgeResult.metadata.totalChars;
      totalDocs += knowledgeResult.metadata.docCount;
    }
  }

  const combinedKnowledge = parts.join('\n\n');
  const estimatedTokens = estimateTokens_(combinedKnowledge);
  const modelLimit = 1048576; // Gemini 2.5 supports 1M tokens

  const result = {
    configured: true,
    knowledge: combinedKnowledge,
    metadata: {
      docCount: totalDocs,
      totalChars: totalChars,
      estimatedTokens: estimatedTokens,
      modelLimit: modelLimit,
      utilizationPercent: (estimatedTokens / modelLimit * 100).toFixed(1) + '%',
      sources: sources
    }
  };

  // Log token warnings if approaching capacity
  logTokenWarnings_(result.metadata);

  return result;
}

/**
 * Example: Build AI prompt with knowledge injection
 *
 * For agents that use LLMService, build prompts in PromptBuilder.gs (preferred)
 * or within the agent if prompt structure is agent-specific.
 *
 * This example shows in-agent prompt building. For shared prompts, add to PromptBuilder.gs.
 */
function buildTemplatePromptWithKnowledge_(items, knowledge, config) {
  const parts = [
    'You are an AI assistant for [AGENT PURPOSE].'
  ];

  // CONDITIONAL KNOWLEDGE INJECTION
  if (knowledge && knowledge.configured) {
    parts.push('');
    parts.push('=== AGENT GUIDELINES ===');
    parts.push(knowledge.knowledge);

    // Token utilization logging (when DEBUG enabled)
    if (knowledge.metadata && knowledge.metadata.utilizationPercent) {
      const agentConfig = getTemplateAgentConfig_();
      if (agentConfig.TEMPLATE_DEBUG) {
        console.log(JSON.stringify({
          templateAgentKnowledgeUtilization: knowledge.metadata.utilizationPercent,
          estimatedTokens: knowledge.metadata.estimatedTokens,
          modelLimit: knowledge.metadata.modelLimit
        }, null, 2));
      }
    }
  }

  parts.push('');
  parts.push('Items to process:');
  parts.push(JSON.stringify(items, null, 2));
  parts.push('');
  parts.push('Please process according to guidelines above.');

  return parts.join('\n');
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


