# ADR-014: Configuration Management and Ownership

**Status**: Accepted
**Date**: 2025-10-02
**Deciders**: Project team

## Context

As the email automation system evolved to support multiple core services (LLMService, KnowledgeService, WebApp) and pluggable agents (Email Summarizer, custom agents), a clear pattern emerged around configuration management. However, this pattern was implicit rather than explicitly documented, creating potential confusion about:

- Where should new configuration properties be defined?
- Should agents access configuration through `getConfig_()` or directly via PropertiesService?
- How do we prevent configuration conflicts between core services and agents?
- What naming conventions should be followed to maintain clarity?

**Current Implementation Evidence:**

The codebase shows a consistent but undocumented separation:

1. **Core services** define their configuration in `Config.gs`:
   ```javascript
   function getConfig_() {
     const p = PropertiesService.getScriptProperties();
     return {
       // LLMService
       GEMINI_API_KEY: p.getProperty('GEMINI_API_KEY'),
       PROJECT_ID: p.getProperty('PROJECT_ID'),

       // KnowledgeService
       LABEL_KNOWLEDGE_DOC_URL: p.getProperty('LABEL_KNOWLEDGE_DOC_URL'),
       KNOWLEDGE_DEBUG: p.getProperty('KNOWLEDGE_DEBUG'),

       // WebApp
       WEBAPP_ENABLED: p.getProperty('WEBAPP_ENABLED'),

       // Core processing
       MAX_EMAILS_PER_RUN: parseInt(p.getProperty('MAX_EMAILS_PER_RUN') || '20', 10),
       DEBUG: p.getProperty('DEBUG')
     };
   }
   ```

2. **Agents** define their own configuration functions:
   ```javascript
   // AgentSummarizer.gs
   function getSummarizerConfig_() {
     const props = PropertiesService.getScriptProperties();
     return {
       SUMMARIZER_ENABLED: (props.getProperty('SUMMARIZER_ENABLED') || 'true').toLowerCase() === 'true',
       SUMMARIZER_MAX_AGE_DAYS: parseInt(props.getProperty('SUMMARIZER_MAX_AGE_DAYS') || '7', 10)
     };
   }
   ```

**Architectural Context:**

This decision builds on established patterns:
- **ADR-004**: Pluggable Agents Architecture - established agent modularity
- **ADR-011**: Self-Contained Agent Architecture - agents manage their own lifecycle

Configuration management is the final piece of the self-contained agent pattern that needed formal documentation.

## Decision

We establish a **dual ownership model** for configuration management:

### Core Services: Centralized Configuration

**Core services MUST define their configuration properties in `Config.gs`:**

- Core services are defined as: components required for the system's primary email processing workflow
- Examples: LLMService, KnowledgeService, GmailService, WebAppController, Organizer, Main
- All configuration for core services is accessed through `getConfig_()`
- Core configuration properties are the single source of truth for system-wide settings

**Rationale:**
- Provides single point of configuration discovery for core functionality
- Enables system-wide settings like DEBUG and DRY_RUN to affect all components
- Simplifies configuration auditing and documentation
- Maintains backward compatibility with existing deployment patterns

### Pluggable Agents: Decentralized Configuration

**Pluggable agents MUST define their own configuration functions:**

- Agents access PropertiesService directly, not through `getConfig_()`
- Each agent implements its own `get[AgentName]Config_()` function
- Agent configuration properties use agent-specific prefixes (e.g., `SUMMARIZER_*`, `TEMPLATE_*`)
- Agents provide sensible defaults to minimize required setup

**Rationale:**
- Maintains agent independence and modularity (ADR-011)
- Prevents core system changes when adding/removing agents
- Reduces coupling between agents and core infrastructure
- Simplifies agent development and testing

### Conflict Prevention

To prevent configuration conflicts, the following rules apply:

1. **Naming Conventions:**
   - Core properties: Use descriptive names without prefixes (`GEMINI_API_KEY`, `DEBUG`, `MAX_EMAILS_PER_RUN`)
   - Agent properties: Use agent-specific prefixes (`SUMMARIZER_ENABLED`, `NOTIFIER_WEBHOOK_URL`)

2. **Reserved Property Names:**
   - Core system properties defined in `Config.gs` are reserved and MUST NOT be used by agents
   - Agents MUST NOT create properties that conflict with core property names
   - If an agent needs a core setting, it accesses it through the agent context (`ctx.cfg`) provided by the framework

3. **Validation:**
   - Code reviews should verify new agent properties use appropriate prefixes
   - Agent configuration functions should document all properties within the agent file
   - Configuration conflicts discovered in testing should be resolved by renaming agent properties

## Alternatives Considered

### Alternative 1: Centralized Configuration for Everything
- **Pros**:
  - Single configuration discovery point
  - Consistent access patterns
  - Easier to document all settings
- **Cons**:
  - Violates agent self-containment (ADR-011)
  - Core system grows with every agent
  - Creates tight coupling between agents and core
  - Increases merge conflicts
- **Why not chosen**: Contradicts the modularity and independence goals of self-contained agents

### Alternative 2: External Configuration Service
- **Pros**:
  - Complete decoupling
  - Advanced features (validation, versioning, encryption)
  - Scalable configuration management
- **Cons**:
  - Adds infrastructure complexity
  - Requires network dependencies
  - Contradicts Apps Script simplicity
  - Overengineered for current needs
- **Why not chosen**: Too complex for the Apps Script environment and current scale

### Alternative 3: Configuration Namespaces
- **Pros**:
  - Explicit ownership through namespaces
  - Supports hierarchical configuration
  - Programmatic conflict detection
- **Cons**:
  - Requires framework changes
  - More complex API for simple use cases
  - Namespace management overhead
- **Why not chosen**: Added complexity not justified by current needs

### Alternative 4: JSON Configuration Document
- **Pros**:
  - Structured configuration schema
  - Supports nested settings
  - Single document for all settings
- **Cons**:
  - Parsing overhead on every access
  - Size limits with PropertiesService
  - Loses Apps Script Properties UI benefits
  - Migration burden for existing deployments
- **Why not chosen**: Sacrifices simplicity and existing tooling benefits

### Alternative 5: No Separation (Agents Use getConfig_)
- **Pros**:
  - Simplest possible approach
  - Consistent access pattern
- **Cons**:
  - Violates separation of concerns
  - Forces core changes for every agent
  - Creates hidden dependencies
  - Breaks agent modularity
- **Why not chosen**: Contradicts fundamental design goals of pluggable architecture

## Consequences

### Positive
- **Clear ownership**: Obvious where each type of configuration belongs
- **Reduced coupling**: Agents independent from core configuration changes
- **Conflict prevention**: Naming conventions prevent accidental property collisions
- **Easier testing**: Agent configuration can be mocked independently
- **Faster development**: New agents don't require core system modifications
- **Better modularity**: Agents truly self-contained as per ADR-011
- **Documentation clarity**: Configuration documented at the point of use

### Negative
- **Split discovery**: Configuration split between `Config.gs` and agent files
- **Potential duplication**: Similar patterns repeated across agent configuration functions
- **Learning curve**: Developers must understand the ownership model
- **Validation complexity**: No single validation point for all configuration

### Neutral
- **Configuration count**: Total number of properties same regardless of approach
- **Apps Script Properties UI**: Still the primary configuration interface
- **Migration effort**: Existing agents already follow this pattern

## Implementation Notes

### Adding Core Service Configuration

When adding configuration for a core service:

1. **Identify the scope**: Confirm the component is a core service, not an agent
2. **Add to Config.gs**: Define the property in `getConfig_()` function
3. **Provide defaults**: Include sensible defaults where appropriate
4. **Document**: Add to CLAUDE.md configuration section
5. **Access pattern**: Components access via `const cfg = getConfig_()`

**Example:**
```javascript
// In Config.gs
function getConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    // ... existing properties ...

    // New core service configuration
    NEW_SERVICE_API_KEY: p.getProperty('NEW_SERVICE_API_KEY'),
    NEW_SERVICE_TIMEOUT: parseInt(p.getProperty('NEW_SERVICE_TIMEOUT') || '30', 10)
  };
}

// In NewService.gs
function callNewService_() {
  const cfg = getConfig_();
  const apiKey = cfg.NEW_SERVICE_API_KEY;
  // ... use configuration ...
}
```

### Creating Agent-Specific Configuration

When creating a new agent:

1. **Choose prefix**: Select descriptive agent-specific prefix (e.g., `NOTIFIER_`, `ARCHIVER_`)
2. **Create config function**: Implement `get[AgentName]Config_()` in agent file
3. **Access PropertiesService**: Use `PropertiesService.getScriptProperties()` directly
4. **Provide defaults**: Include sensible defaults to minimize required setup
5. **Document properties**: Add inline documentation in the agent file
6. **Access pattern**: Agent code calls `const config = get[AgentName]Config_()`

**Example:**
```javascript
// In AgentNotifier.gs
/**
 * Get Notifier agent configuration with sensible defaults
 *
 * Configuration Properties:
 * - NOTIFIER_ENABLED: Enable/disable agent (default: true)
 * - NOTIFIER_WEBHOOK_URL: Webhook URL for notifications (required)
 * - NOTIFIER_MAX_RETRIES: Maximum retry attempts (default: 3)
 */
function getNotifierConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    NOTIFIER_ENABLED: (props.getProperty('NOTIFIER_ENABLED') || 'true').toLowerCase() === 'true',
    NOTIFIER_WEBHOOK_URL: props.getProperty('NOTIFIER_WEBHOOK_URL'),
    NOTIFIER_MAX_RETRIES: parseInt(props.getProperty('NOTIFIER_MAX_RETRIES') || '3', 10)
  };
}

// In agent handler
function notifierAgentHandler(ctx) {
  const config = getNotifierConfig_();
  if (!config.NOTIFIER_ENABLED) {
    return { status: 'skip', info: 'agent disabled' };
  }
  // ... use configuration ...
}
```

### Accessing Core Configuration from Agents

Agents can access core configuration through the context object:

```javascript
function myAgentHandler(ctx) {
  // Access core configuration
  const coreDebug = ctx.cfg.DEBUG;
  const dryRun = ctx.dryRun; // Core dry-run setting

  // Access agent-specific configuration
  const agentConfig = getMyAgentConfig_();

  // Use both configurations as needed
  if (coreDebug || agentConfig.MY_AGENT_DEBUG) {
    ctx.log('Detailed debug information');
  }
}
```

### Validating No Conflicts Exist

When reviewing configuration changes:

1. **Check for prefixes**: Agent properties MUST use agent-specific prefixes
2. **Verify uniqueness**: New properties don't conflict with existing core or agent properties
3. **Review naming**: Core properties descriptive but not agent-specific
4. **Test access patterns**: Agents use their own config functions, not `getConfig_()`

**Conflict Detection:**
```javascript
// Tool for detecting potential conflicts (can be added to test suite)
function validateConfigurationConflicts_() {
  const coreProps = Object.keys(getConfig_());
  const agentPrefixes = ['SUMMARIZER_', 'TEMPLATE_', 'NOTIFIER_']; // Add as agents are created

  const props = PropertiesService.getScriptProperties().getKeys();
  const conflicts = [];

  props.forEach(function(prop) {
    // Check if property looks like agent config but lacks prefix
    const hasAgentPrefix = agentPrefixes.some(function(prefix) {
      return prop.startsWith(prefix);
    });

    const isCoreProp = coreProps.indexOf(prop) !== -1;

    if (!hasAgentPrefix && !isCoreProp) {
      conflicts.push(prop + ' - unclear ownership (missing prefix or not in Config.gs)');
    }
  });

  return conflicts;
}
```

### Migration Checklist

For existing code not following this pattern:

- [ ] Identify if component is core service or agent
- [ ] If core service: add properties to `Config.gs`
- [ ] If agent: create `get[AgentName]Config_()` function
- [ ] Update property access patterns
- [ ] Verify naming conventions followed
- [ ] Update documentation in CLAUDE.md
- [ ] Test configuration in both development and production

### Configuration Documentation Guidelines

Each configuration property should be documented in appropriate location:

**For Core Properties (in CLAUDE.md):**
```markdown
#### Core Email Processing
- `GEMINI_API_KEY`: Gemini API authentication (API key mode)
- `MAX_EMAILS_PER_RUN`: Limits emails processed per execution (default: 20)
```

**For Agent Properties (in agent file comments):**
```javascript
/**
 * Get Summarizer agent configuration with sensible defaults
 *
 * Configuration Properties:
 * - SUMMARIZER_ENABLED: Enable/disable agent (default: true)
 * - SUMMARIZER_MAX_AGE_DAYS: Maximum age of emails to include (default: 7)
 */
```

## References

- ADR-004: Pluggable Agents Architecture - established agent modularity
- ADR-011: Self-Contained Agent Architecture - agents manage own lifecycle
- Google Apps Script PropertiesService documentation
- CLAUDE.md configuration management section
- AgentSummarizer.gs and AgentTemplate.gs as reference implementations
