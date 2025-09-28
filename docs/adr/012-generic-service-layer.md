# ADR-012: Generic Service Layer Pattern

**Status**: Accepted
**Date**: 2025-09-28
**Deciders**: Project team

## Context

As we implement the self-contained agent architecture (ADR-011), agents need to perform common Gmail operations like finding emails by label, managing label transitions, archiving emails, and sending notifications. Without shared service functions, we face several challenges:

- **Code duplication**: Each agent would implement similar Gmail operations independently
- **Maintenance burden**: Bug fixes and improvements would need to be replicated across agents
- **Testing complexity**: Each agent would need to test the same Gmail interaction patterns
- **Inconsistent patterns**: Different agents might implement similar operations differently
- **Performance variations**: Each agent might optimize Gmail operations differently

The Email Summarizer agent specifically needs to:
- Find emails with "summarize" label within a specific age range
- Transition emails from "summarize" to "summarized" labels
- Archive processed emails efficiently
- Send formatted HTML summary emails

Similar needs will arise for future agents, creating an opportunity to establish reusable service patterns.

## Decision

We implement a **generic service layer pattern** that provides reusable, well-tested functions for common agent operations while maintaining clear boundaries between generic services and agent-specific logic:

**Generic Service Characteristics:**
- **Parameter-driven**: Functions accept parameters to customize behavior rather than hard-coding agent specifics
- **Error handling**: Consistent error handling and logging patterns across all services
- **Performance optimized**: Efficient Gmail API usage patterns built into service functions
- **Well-documented**: Clear interfaces and usage examples for agent developers
- **Testable**: Functions designed for unit testing with predictable inputs/outputs

**Service Layer Functions:**
```javascript
// Generic email finding with flexible filtering
function findEmailsByLabelWithAge_(labelName, maxAgeDays, maxCount)

// Flexible label management for any transition pattern
function manageLabelTransition_(emailIds, removeLabels, addLabels)

// Efficient batch archiving
function archiveEmailsByIds_(emailIds)

// Standardized email composition and sending
function sendFormattedEmail_(to, subject, htmlContent, sourceEmails)
```

**Agent Usage Pattern:**
Agents call generic functions with their specific parameters rather than implementing Gmail operations directly.

## Alternatives Considered

### Alternative 1: Agent-Specific Service Functions
- **Pros**: Highly optimized for each agent's needs, simple to understand per agent
- **Cons**: Code duplication, maintenance burden, inconsistent patterns
- **Why not chosen**: Violates DRY principle and creates long-term maintenance issues

### Alternative 2: Monolithic Service Class
- **Pros**: All Gmail operations centralized, object-oriented interface
- **Cons**: Large API surface, potential for bloat, difficult to test isolated functions
- **Why not chosen**: Too complex for Apps Script environment and agent simplicity needs

### Alternative 3: Agent Base Class Inheritance
- **Pros**: Shared functionality through inheritance, consistent agent interface
- **Cons**: Tight coupling, complex inheritance hierarchies, difficult to modify
- **Why not chosen**: Apps Script doesn't have strong OOP patterns, adds unnecessary complexity

### Alternative 4: Utility Namespace Pattern
- **Pros**: Organized into logical groups, clear separation of concerns
- **Cons**: Additional abstraction layer, potential for namespace pollution
- **Why not chosen**: Generic functions in existing GmailService.gs provide sufficient organization

### Alternative 5: No Shared Services (Each Agent Independent)
- **Pros**: Complete agent independence, no service layer dependencies
- **Cons**: Massive code duplication, inconsistent implementations, testing overhead
- **Why not chosen**: Creates unsustainable maintenance burden as agent count grows

## Consequences

### Positive
- **Reduced code duplication**: Common patterns implemented once and reused
- **Consistent Gmail operations**: All agents use the same well-tested patterns
- **Easier testing**: Generic functions can be thoroughly tested independently
- **Performance optimization**: Service layer can be optimized for efficient Gmail API usage
- **Faster agent development**: Agents focus on business logic rather than Gmail integration
- **Centralized bug fixes**: Gmail operation bugs fixed once benefit all agents
- **Better error handling**: Consistent error patterns across all agent operations

### Negative
- **Additional abstraction**: Agents must understand service layer interfaces
- **Potential over-generalization**: Functions might become complex to handle all use cases
- **Service layer maintenance**: Generic functions need to evolve with agent needs
- **Debugging complexity**: Issues might occur in service layer rather than agent code

### Neutral
- **Learning curve**: Developers need to understand available service functions
- **Documentation overhead**: Service functions require comprehensive documentation
- **Interface stability**: Service function signatures should remain stable for agent compatibility

## Implementation Notes

### Service Function Design Principles

#### 1. Parameter-Driven Flexibility
```javascript
// Good: Flexible parameters allow different agent use cases
function findEmailsByLabelWithAge_(labelName, maxAgeDays, maxCount)

// Bad: Hard-coded for specific agent
function findSummarizeEmails_()
```

#### 2. Consistent Error Handling
```javascript
function genericServiceFunction_(params) {
  try {
    // ... operation logic
    return { success: true, data: result };
  } catch (error) {
    Logger.log(`Service error in ${arguments.callee.name}: ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}
```

#### 3. Efficient Batch Operations
```javascript
// Optimize for Gmail API limits and performance
function manageLabelTransition_(emailIds, removeLabels, addLabels) {
  // Batch operations where possible
  // Handle Gmail API rate limits
  // Provide progress feedback for large operations
}
```

#### 4. Clear Return Patterns
```javascript
// Consistent return structure across all service functions
{
  success: boolean,
  data?: any,
  error?: string,
  metadata?: { count: number, processed: number, skipped: number }
}
```

### Service Function Locations
- **GmailService.gs**: Email finding, label management, archiving, sending
- **LLMService.gs**: AI operations (already well-established)
- **PromptBuilder.gs**: Prompt generation (already well-established)

### Agent Integration Pattern
```javascript
function agentHandler(ctx) {
  // Use generic services with agent-specific parameters
  const emails = findEmailsByLabelWithAge_('agent_label', 7, 50);
  const result = manageLabelTransition_(emailIds, ['old_label'], ['new_label']);
  const sent = sendFormattedEmail_(destination, subject, content, sources);
}
```

### Testing Strategy
- Unit tests for each generic service function
- Mock Gmail operations for consistent testing
- Integration tests with real Gmail operations in test environment
- Performance tests for batch operations

### Documentation Requirements
Each service function must include:
- Purpose and use cases
- Parameter descriptions and types
- Return value structure
- Usage examples
- Error conditions and handling

## References

- ADR-011: Self-Contained Agent Architecture (architectural context)
- ADR-004: Pluggable Agents Architecture (foundational framework)
- Google Apps Script Gmail API documentation
- DRY (Don't Repeat Yourself) principle
- Service Layer pattern in enterprise architecture