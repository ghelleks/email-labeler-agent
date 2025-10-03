# ADR-004: Pluggable Agents Architecture

**Status**: Accepted
**Date**: 2025-01-26
**Deciders**: Project team

## Context

After implementing the core email classification system, there was a need to extend functionality with post-processing actions that could:
- Perform additional tasks after emails are labeled
- Customize behavior based on specific email types or labels
- Add new capabilities without modifying the core triage logic
- Support different user workflows and preferences
- Maintain system performance and budget constraints

The system needed an extensible architecture that would allow custom actions to be triggered after the primary email classification process, while ensuring these extensions don't interfere with core functionality or exceed processing budgets.

## Decision

We implemented a pluggable agents architecture that executes after the main email labeling process:

**Agent Framework Characteristics:**
- **Post-processing execution**: Agents run after core email classification is complete
- **Idempotent operations**: Agents can be safely re-run without creating duplicate effects
- **Budget-aware**: Agent execution is constrained by daily API call budgets
- **State tracking**: Uses PropertiesService to track which agents have run on which emails
- **Modular design**: Each agent is a separate module with standardized interface
- **Optional execution**: Agents can be enabled/disabled via configuration

**Agent Lifecycle:**
1. Core email classification completes successfully
2. System identifies emails that need agent processing
3. Each enabled agent processes applicable emails
4. Agent state is persisted to prevent duplicate processing
5. Budget tracking prevents excessive API usage

## Alternatives Considered

### Alternative 1: Inline Processing During Classification
- **Pros**: Single execution pass, simpler flow control
- **Cons**: Complicates core logic, harder to debug, all-or-nothing execution
- **Why not chosen**: Violates separation of concerns and makes system fragile

### Alternative 2: Webhook-Based External Agents
- **Pros**: Complete decoupling, language flexibility, scalable
- **Cons**: Requires external infrastructure, complex authentication, network dependencies
- **Why not chosen**: Contradicts Apps Script platform choice and adds infrastructure complexity

### Alternative 3: Event-Driven Queue System
- **Pros**: Highly scalable, fault-tolerant, supports complex workflows
- **Cons**: Requires additional infrastructure, overengineered for current needs
- **Why not chosen**: Too complex for the scale and Apps Script environment

### Alternative 4: Rule-Based Configuration Only
- **Pros**: Simple configuration, no code changes needed
- **Cons**: Limited flexibility, cannot handle complex logic or external integrations
- **Why not chosen**: Insufficient for advanced automation requirements

### Alternative 5: Monolithic Extension Points
- **Pros**: Simple to implement, all logic in one place
- **Cons**: Poor separation of concerns, difficult to maintain, testing challenges
- **Why not chosen**: Violates modularity principles and creates maintenance burden

## Consequences

### Positive
- **Extensibility**: New functionality can be added without modifying core classification logic
- **Separation of concerns**: Core triage logic remains focused and simple
- **Customization**: Users can enable/disable specific agents based on needs
- **Idempotency**: Safe to re-run agents without creating duplicate side effects
- **Budget control**: Agent execution respects API usage limits
- **Debugging**: Agent failures don't affect core email classification
- **Modularity**: Each agent can be developed, tested, and maintained independently

### Negative
- **Complexity**: Additional layer of abstraction and execution logic
- **Performance**: Extra processing time for agent execution
- **State management**: Requires tracking which agents have processed which emails
- **Error handling**: Need robust handling of agent failures

### Neutral
- **Development overhead**: New agents require following framework patterns
- **Configuration management**: Agents require proper configuration and documentation
- **Testing requirements**: Agent framework needs comprehensive test coverage

## Implementation Notes

### Agent Architecture Evolution

**Original Pattern (Deprecated):**
```javascript
class EmailAgent {
  constructor(config) { /* initialization */ }
  shouldProcess(email, label) { /* filtering logic */ }
  async process(email, label) { /* main logic */ }
  getStateKey(email) { /* state management */ }
}
```

**Current Pattern (Dual-Hook Self-Contained Agents):**
See ADR-011: Self-Contained Agent Architecture and ADR-018: Dual-Hook Agent Architecture for detailed guidance.

```javascript
// Self-contained agent structure
function getAgentConfig_() { /* agent-managed configuration */ }
function ensureAgentLabels_() { /* agent-managed labels */ }
function agentOnLabel_(ctx) { /* immediate per-email action */ }
function agentPostLabel_() { /* inbox-wide scanning */ }

// Registration with dual-hook pattern (ADR-018)
AGENT_MODULES.push(function(api) {
  api.register('label', 'agentName', {
    onLabel: agentOnLabel_,    // Optional: immediate action
    postLabel: agentPostLabel_  // Optional: periodic scan
  }, options);
});
```

### State Management
- Use PropertiesService to track agent execution state
- Key format: `agent:${agentName}:${emailId}:${version}`
- Store execution timestamps and results
- Implement state cleanup for old entries
- **New**: Agents manage their own state keys and cleanup logic

### Budget Integration
- Agents must respect daily API call limits
- Track API usage per agent type
- Implement graceful degradation when budgets are exceeded
- Priority system for critical vs. optional agents
- **New**: Agents can define their own budget categories and limits

### Error Handling
- Agent failures don't block other agents
- Comprehensive logging for debugging
- Retry logic for transient failures
- Fallback behaviors for critical functionality
- **New**: Agents handle their own error logging and recovery

### Agent Discovery and Registration
- Standardized agent registration pattern using `AGENT_MODULES.push()`
- **New**: Agents are self-registering and don't require core system configuration
- **New**: Agent-specific configuration managed through PropertiesService
- **New**: Agents create their own labels and manage lifecycle independently

### Self-Contained Agent Guidelines

#### Configuration Management
- Agents define their own configuration keys with appropriate prefixes
- Provide sensible defaults to minimize required setup
- Document all configuration options within the agent file
- Use PropertiesService directly rather than core Config.gs

#### Label Management
- Agents create and manage their own labels using `GmailApp.getUserLabelByName() || GmailApp.createLabel()`
- Use descriptive, agent-specific label names
- Document label lifecycle and cleanup responsibilities

#### Service Integration
- Use generic service functions from ADR-012: Generic Service Layer Pattern
- Avoid duplicating Gmail operations across agents
- Contribute reusable patterns back to service layer when appropriate

#### Trigger Lifecycle
- **Note**: As of ADR-018, most agents no longer need separate triggers
- Dual-hook pattern (`onLabel` + `postLabel`) runs in single hourly trigger
- Legacy pattern: Agents can still manage separate triggers if needed for specific use cases
- Clean up existing triggers before creating new ones
- Implement both installation and cleanup functions
- Use distinctive trigger names that identify the agent

## References

- ADR-011: Self-Contained Agent Architecture (independence and self-management patterns)
- ADR-018: Dual-Hook Agent Architecture (current execution model - replaces separate triggers)
- ADR-012: Generic Service Layer Pattern (supporting infrastructure)
- PropertiesService documentation for state persistence
- Apps Script execution time limits and quotas
- Plugin architecture patterns and best practices