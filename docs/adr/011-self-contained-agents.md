# ADR-011: Self-Contained Agent Architecture

**Status**: Accepted
**Date**: 2025-09-28
**Deciders**: Project team

## Context

The original pluggable agents architecture (ADR-004) established a framework for extending email processing functionality. However, as we develop new agents like the Email Summarizer, several architectural challenges emerged:

- **Core system coupling**: Adding agent-specific labels and configuration required modifying core system files (`Config.gs`, `ensureLabels_()`)
- **Maintenance burden**: Each new agent increased the complexity of core configuration management
- **Testing complexity**: Agent-specific functionality was mixed with core system logic
- **Modularity limitations**: Agents couldn't be truly independent modules due to dependencies on core system changes

The Email Summarizer agent specifically needs to:
- Create and manage a "summarized" label for processed emails
- Define agent-specific configuration options (max age, destination email, etc.)
- Manage its own trigger lifecycle for scheduled execution
- Operate independently without requiring core system modifications

## Decision

We adopt a **self-contained agent architecture** where agents manage their complete lifecycle independently:

**Agent Self-Management Responsibilities:**
- **Label management**: Agents create and manage their own labels without core system involvement
- **Configuration management**: Agents define and handle their own configuration keys and defaults
- **Trigger lifecycle**: Agents manage their own scheduled execution triggers
- **State management**: Agents handle their own persistence and idempotency tracking
- **Dependency management**: Agents ensure their required infrastructure exists

**Implementation Pattern:**
```javascript
// Agent defines its own configuration
function getAgentConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    AGENT_MAX_AGE_DAYS: parseInt(props.getProperty('AGENT_MAX_AGE_DAYS') || '7', 10),
    AGENT_DESTINATION_EMAIL: props.getProperty('AGENT_DESTINATION_EMAIL') || Session.getActiveUser().getEmail(),
    AGENT_ENABLED: (props.getProperty('AGENT_ENABLED') || 'true').toLowerCase() === 'true'
  };
}

// Agent creates its own labels
function ensureAgentLabels_() {
  const labelName = 'agent_processed';
  return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
}

// Agent manages its own triggers
function installAgentTrigger() {
  deleteAgentTriggers_();
  ScriptApp.newTrigger('runAgent').timeBased().everyDays(1).atHour(5).create();
}
```

## Alternatives Considered

### Alternative 1: Enhanced Core Configuration
- **Pros**: Centralized configuration, consistent patterns, easier global management
- **Cons**: Core system grows with every agent, tight coupling, testing complexity
- **Why not chosen**: Violates open/closed principle and creates maintenance burden

### Alternative 2: External Configuration Service
- **Pros**: Complete decoupling, scalable configuration management
- **Cons**: Adds infrastructure complexity, contradicts Apps Script simplicity
- **Why not chosen**: Overengineered for Apps Script environment constraints

### Alternative 3: Agent Metadata Registration
- **Pros**: Centralized agent discovery, unified configuration interface
- **Cons**: Still requires core system awareness of agent specifics
- **Why not chosen**: Doesn't solve the fundamental coupling problem

### Alternative 4: Configuration Injection Pattern
- **Pros**: Dependency inversion, testable configuration
- **Cons**: Complex initialization, requires framework changes
- **Why not chosen**: Too complex for the Apps Script environment

## Consequences

### Positive
- **True modularity**: Agents are completely independent, removable modules
- **Core system stability**: Adding/removing agents doesn't affect core files
- **Easier testing**: Agent functionality can be tested in isolation
- **Simplified deployment**: New agents don't require core system changes
- **Better separation of concerns**: Clear boundaries between core and agent functionality
- **Faster development**: Agents can be developed without understanding core system internals
- **Reduced merge conflicts**: Multiple agents can be developed simultaneously

### Negative
- **Potential duplication**: Agents might implement similar patterns independently
- **Discovery complexity**: No centralized registry of agent capabilities
- **Configuration fragmentation**: Agent settings spread across multiple PropertiesService keys
- **Initialization overhead**: Each agent must handle its own setup logic

### Neutral
- **Learning curve**: Developers need to understand agent self-management patterns
- **Documentation requirements**: Each agent needs comprehensive self-documentation
- **Migration effort**: Existing agents need refactoring to self-contained pattern

## Implementation Notes

### Agent Structure Template
```javascript
// 1. Configuration Management
function getAgentConfig_() { /* self-managed config */ }

// 2. Infrastructure Setup
function ensureAgentInfrastructure_() { /* labels, etc. */ }

// 3. Agent Logic
function agentHandler(ctx) { /* main processing */ }

// 4. Lifecycle Management
function installAgentTrigger() { /* scheduling */ }
function runAgent() { /* entry point */ }

// 5. Registration
AGENT_MODULES.push(function(api) {
  api.register('label', 'agentName', agentHandler, options);
});
```

### Configuration Naming Conventions
- Use agent-specific prefixes: `SUMMARIZER_MAX_AGE_DAYS`, `NOTIFIER_WEBHOOK_URL`
- Provide sensible defaults in code rather than requiring setup
- Document all configuration options within the agent file

### Label Management Guidelines
- Agents create labels on first use with `GmailApp.getUserLabelByName() || GmailApp.createLabel()`
- Use descriptive, agent-specific label names: `summarized`, `notified`, `processed_by_agent`
- Document label lifecycle and cleanup responsibilities

### Trigger Management Patterns
- Agents should clean up existing triggers before creating new ones
- Use distinctive trigger names that identify the agent
- Implement both installation and cleanup functions

### Generic Service Layer Integration
- Agents should use generic service functions when available
- Avoid duplicating Gmail operations across agents
- Contribute reusable patterns back to service layer when appropriate

## References

- ADR-004: Pluggable Agents Architecture (base framework)
- ADR-012: Generic Service Layer Pattern (supporting infrastructure)
- Google Apps Script PropertiesService documentation
- Open/Closed Principle and modular architecture patterns