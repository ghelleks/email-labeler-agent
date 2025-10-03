# ADR-016: Label-Synchronized Agent State Management

**Status**: Superseded by ADR-017
**Date**: 2025-10-02
**Deciders**: Project team

**Note**: This ADR proposed label-synchronized state management to address UserProperties/label divergence. However, ADR-017 takes a simpler approach by removing UserProperties idempotency entirely, eliminating the need for synchronization.

## Context

The email-agent system uses two independent state management mechanisms that can diverge:

1. **Gmail Labels** (User-Visible State): Labels represent the current desired action for an email (`reply_needed`, `review`, `todo`, `summarize`)
2. **UserProperties** (Framework Execution State): Idempotency keys track which agents have processed which emails

### Current Architecture

**Agents.gs (lines 67-80)** implements permanent idempotency tracking:
```javascript
var idemKey = (isFunction_(keyFn) ? keyFn(ctx) : defaultIdempotentKey_(item.name, ctx));
var idemStoreKey = 'agent_done:' + String(idemKey);
if (userProps.getProperty(idemStoreKey)) {
  results.push({ agent: item.name, status: 'skip', info: 'idempotent-skip' });
  continue;
}

try {
  var result = item.handler(ctx) || { status: 'ok' };
  if (result && result.status === 'ok') {
    userProps.setProperty(idemStoreKey, '1');  // Set permanently
  }
  // ...
}
```

**Organizer.gs (lines 1-9)** prevents duplicate label application:
```javascript
function applyLabel_(thread, labelName, dryRun) {
  const actionNames = ['reply_needed','review','todo','summarize'];
  const hasAny = thread.getLabels().some(function(l) { return actionNames.includes(l.getName()); });
  if (hasAny) return 'skipped';  // Prevent re-labeling if any action label exists
  // ...
}
```

### The Problem

**Scenario**: User workflow expects label removal to reset agent processing state:
1. Email is classified with `summarize` label
2. `emailSummarizer` agent runs, sets `agent_done:emailSummarizer:thread123` = '1'
3. Agent archives email immediately (if `SUMMARIZER_ARCHIVE_ON_LABEL=true`)
4. Later, user removes `summarized` label and re-applies `summarize` label
5. **Expected**: Agent should re-process the email
6. **Actual**: Agent skips with 'idempotent-skip' because UserProperties key still exists

**Production Evidence**: Recent logs show `"ok": 0, "skip": 6` for 3 emails with `summarize` label - archive didn't happen because agents were in idempotent-skip state.

### Why This Matters

- **User Intent**: Label re-application signals "process this again"
- **State Divergence**: Gmail labels (current) vs. UserProperties (historical) are disconnected
- **Confusing Behavior**: Users don't understand why labeled emails aren't processing
- **No Recovery Path**: No way to reset agent state without manual intervention

### Current Constraints

- **No Gmail Label Events**: Apps Script has no native trigger for label removal
- **Polling-Based Detection**: Can only detect label changes during scheduled runs
- **UserProperties Quotas**: Limited to 500KB total storage per user
- **Execution Time Limits**: 6 minutes per execution for Apps Script
- **Two Execution Contexts**:
  - Main classification workflow (hourly) - applies initial labels
  - Email Summarizer agent (daily) - processes labeled emails in batch

## Decision

**We will implement label-synchronized agent state management** that automatically clears agent idempotency keys when action labels are removed from emails.

### Core Mechanism

**Label Change Detection**: During each scheduled execution, compare current email labels with expected agent state to detect removed labels.

**State Clearing Logic**:
1. When an action label (`reply_needed`, `review`, `todo`, `summarize`) is removed from an email
2. Clear all agent idempotency keys associated with that label and threadId
3. Preserve keys for agents that explicitly opt into permanence via `permanentState: true` option

**Opt-Out for Permanence**: Agents can explicitly declare permanent state via registration options:
```javascript
api.register('summarize', 'emailSummarizer', summarizerAgentHandler, {
  permanentState: true,  // Keys never cleared, even on label removal
  // ...
});
```

### Implementation Approach

**Phase 1: Label Monitoring Infrastructure**
- Add `detectLabelChanges_()` function to track label removal events
- Store snapshot of labeled emails in UserProperties (`label_snapshot:{label}`)
- Compare current state vs. snapshot to detect removals

**Phase 2: State Clearing Function**
- Implement `clearAgentState_(threadId, label)` to remove idempotency keys
- Respect `permanentState` option from agent registration
- Log all state clearing operations for debugging

**Phase 3: Integration with Main Workflow**
- Call `detectLabelChanges_()` at start of `Main.gs run()`
- Clear appropriate agent keys before agent execution
- Update snapshots after labeling operations

**Phase 4: Migration Support**
- Provide `resetAllAgentState_()` utility for manual state reset
- Add `listAgentState_(threadId)` for debugging

### Execution Timing

Label change detection happens **before** agent execution in both contexts:

**Main Workflow (hourly)**:
```javascript
function run() {
  // ... existing setup ...

  // NEW: Detect and clear state for removed labels
  detectAndClearRemovedLabels_();

  const threads = findUnprocessed_(cfg.MAX_EMAILS_PER_RUN);
  // ... continue with classification ...
}
```

**Email Summarizer (daily)**:
```javascript
function runEmailSummarizer() {
  // NEW: Detect and clear state for removed labels
  detectAndClearRemovedLabels_();

  // ... continue with summarization workflow ...
}
```

## Alternatives Considered

### Alternative 1: Time-Based Expiration
**Description**: Clear idempotency keys automatically after N days (e.g., 30 days).

**Pros**:
- Simple to implement with TTL-style properties
- Automatic cleanup prevents indefinite storage growth
- No label monitoring required

**Cons**:
- Arbitrary timeout doesn't respect user intent
- May clear state prematurely for infrequent agents
- Doesn't solve immediate re-processing needs
- Still allows state divergence within expiration window

**Why not chosen**: Doesn't address the core problem of label-state disconnect and ignores explicit user intent.

### Alternative 2: Manual Clearing Function
**Description**: Provide `clearAgentHistory(threadId, agentName)` function that users call manually.

**Pros**:
- Explicit user control over state
- Simple implementation with no automatic logic
- No risk of unintended state clearing

**Cons**:
- Requires user awareness of internal state mechanism
- Cumbersome for bulk operations
- Doesn't align with user mental model (labels = state)
- No discovery mechanism for when clearing is needed

**Why not chosen**: Violates principle of least surprise and adds cognitive burden.

### Alternative 3: Status Quo (No Synchronization)
**Description**: Keep current behavior where idempotency keys persist forever.

**Pros**:
- Simple, predictable behavior
- Prevents accidental duplicate processing
- No implementation complexity

**Cons**:
- Confuses users when re-applying labels
- Creates state divergence that's invisible to users
- No recovery path for stuck agents
- Violates user expectations about label semantics

**Why not chosen**: Fails to meet user needs and creates confusing behavior.

### Alternative 4: Label-State-as-Source-of-Truth
**Description**: Remove UserProperties state entirely, use only Gmail labels to track processing.

**Pros**:
- Single source of truth eliminates divergence
- Simpler mental model
- Labels fully represent system state

**Cons**:
- Can't distinguish "labeled but not yet processed" from "processed"
- Loses ability to track agent execution independently
- Breaks idempotency for agents with multi-step workflows
- Risk of duplicate processing on execution failures

**Why not chosen**: Loses critical execution tracking needed for reliable agent operation.

### Alternative 5: Event-Driven Label Monitoring
**Description**: Use Apps Script triggers to detect label changes in real-time.

**Pros**:
- Immediate detection of label removal
- No polling overhead
- Precise timing of state clearing

**Cons**:
- Apps Script has no native label change triggers
- Would require Gmail API push notifications (webhook infrastructure)
- Contradicts serverless Apps Script architecture
- Adds external infrastructure dependencies

**Why not chosen**: Technically infeasible within Apps Script constraints.

## Consequences

### Positive

- **User Intent Alignment**: Label removal → state reset matches user expectations
- **Predictable Behavior**: Re-applying labels triggers re-processing as expected
- **Recovery Path**: Users can reset agent state by removing/re-applying labels
- **State Consistency**: Reduces divergence between labels and agent state
- **Debugging Clarity**: State clearing events are logged for troubleshooting
- **Flexible Control**: Agents can opt into permanent state when appropriate
- **Backward Compatible**: Existing agents work without modification (default: synchronized)

### Negative

- **Execution Overhead**: Additional label monitoring logic in each run
- **Storage Growth**: Snapshot storage for label change detection
- **Potential Race Conditions**: Label changes between detection and clearing
- **Complexity**: More sophisticated state management logic
- **Testing Requirements**: Need comprehensive tests for edge cases
- **Performance Impact**: Scanning labeled emails adds processing time

### Neutral

- **UserProperties Usage**: Slight increase for snapshots, decrease for cleared keys
- **Migration Effort**: Existing deployed agents continue working unchanged
- **Documentation Needs**: Must document label-state relationship clearly
- **Learning Curve**: Developers need to understand synchronization behavior

## Implementation Notes

### Label Change Detection

```javascript
/**
 * Detect and clear agent state for removed action labels
 * Compares current labeled emails with snapshot to identify removals
 */
function detectAndClearRemovedLabels_() {
  const cfg = getConfig_();
  const actionLabels = ['reply_needed', 'review', 'todo', 'summarize'];
  const userProps = PropertiesService.getUserProperties();
  let totalCleared = 0;

  for (const label of actionLabels) {
    // Get current threads with this label
    const currentThreads = getLabeledThreadIds_(label);

    // Get snapshot of previously labeled threads (with error handling)
    const snapshotKey = 'label_snapshot:' + label;
    const snapshot = userProps.getProperty(snapshotKey);
    let previousThreads = [];

    if (snapshot) {
      try {
        previousThreads = JSON.parse(snapshot);
      } catch (e) {
        console.error(`Failed to parse snapshot for label ${label}: ${e}`);
        // Treat as empty snapshot and continue - will create fresh baseline
        previousThreads = [];
      }
    }

    // Detect removed labels: in snapshot but not in current
    const removedThreads = previousThreads.filter(id => !currentThreads.includes(id));

    // Clear agent state for removed threads
    for (const threadId of removedThreads) {
      const clearedKeys = clearAgentState_(threadId, label);
      totalCleared += clearedKeys.length;

      if (cfg.DEBUG) {
        console.log(`Cleared agent state for thread ${threadId} (label "${label}" removed)`);
        console.log(`  Cleared keys: ${clearedKeys.join(', ')}`);
      }
    }

    // Update snapshot with current state
    userProps.setProperty(snapshotKey, JSON.stringify(currentThreads));
  }

  // Always log summary for monitoring
  if (totalCleared > 0) {
    console.info(`Label sync: cleared ${totalCleared} agent states across all labels`);
  }
}

/**
 * Get thread IDs currently labeled with specified label
 */
function getLabeledThreadIds_(labelName) {
  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) return [];

  const threads = label.getThreads();
  return threads.map(t => t.getId());
}

/**
 * Get registered agents for a specific label
 * Accesses the agent registry from Agents.gs without requiring core configuration
 */
function getAgentsForLabel_(label) {
  // Access the registry via the Agents module's internal structure
  // This assumes Agents.registerAllModules() has been called
  if (typeof Agents === 'undefined' || !Agents.registryByLabel) {
    return [];
  }

  const list = Agents.registryByLabel.get(label) || [];
  return list;
}

/**
 * Clear agent idempotency keys for a specific thread and label
 * Respects permanentState option from agent registration
 */
function clearAgentState_(threadId, label) {
  const userProps = PropertiesService.getUserProperties();
  const clearedKeys = [];

  // Get registered agents for this label
  const agents = getAgentsForLabel_(label);

  for (const agent of agents) {
    // Skip agents with permanent state
    if (agent.options && agent.options.permanentState === true) {
      continue;
    }

    // Build idempotency key using agent's key function or default
    const keyFn = agent.options && agent.options.idempotentKey;
    const idemKey = (typeof keyFn === 'function')
      ? keyFn({ threadId: threadId, label: label })
      : agent.name + ':' + threadId;

    const idemStoreKey = 'agent_done:' + idemKey;

    // Clear the key
    userProps.deleteProperty(idemStoreKey);
    clearedKeys.push(idemStoreKey);
  }

  return clearedKeys;
}
```

### Agent Registration with Permanent State

```javascript
// Example: Agent that should NOT clear state on label removal
AGENT_MODULES.push(function(api) {
  api.register('summarize', 'emailArchiver', archiverHandler, {
    permanentState: true,  // Once archived, stay archived
    idempotentKey: function(ctx) { return 'emailArchiver:' + ctx.threadId; }
  });
});

// Example: Agent that SHOULD clear state on label removal (default)
AGENT_MODULES.push(function(api) {
  api.register('summarize', 'emailSummarizer', summarizerHandler, {
    // permanentState: false is implicit default
    idempotentKey: function(ctx) { return 'emailSummarizer:' + ctx.threadId; }
  });
});
```

### Migration Path

**Immediate (No Breaking Changes)**:
- Existing agents continue functioning with default synchronization
- Agents that need permanence can add `permanentState: true`
- Users can manually reset state with utility functions

**First-Run Behavior**:
- On initial deployment, no label snapshots exist (`previousThreads = []`)
- First execution creates baseline snapshots without clearing any state
- **Implication**: Existing labeled emails retain their agent idempotency state
- To reset state for existing labeled emails, use `resetAllAgentState_()` utility after deployment
- Subsequent runs will detect label changes and clear state appropriately

**Race Condition Mitigation**:
- Label synchronization occurs at execution start (hourly for main workflow)
- Not continuous monitoring - acceptable delay window up to 1 hour
- If user removes and re-applies label within same hour, may not trigger state clearing
- **Recommendation**: Users should wait for next scheduled run after manual label changes
- No data loss risk - worst case is agent skips one execution cycle

**Utilities for Debugging**:
```javascript
/**
 * List all agent state for a specific thread
 */
function listAgentState_(threadId) {
  const userProps = PropertiesService.getUserProperties();
  const allProps = userProps.getProperties();
  const agentKeys = Object.keys(allProps).filter(k =>
    k.startsWith('agent_done:') && k.includes(threadId)
  );

  console.log(`Agent state for thread ${threadId}:`);
  agentKeys.forEach(key => {
    console.log(`  ${key} = ${allProps[key]}`);
  });

  return agentKeys;
}

/**
 * Reset all agent state (emergency recovery)
 */
function resetAllAgentState_() {
  const userProps = PropertiesService.getUserProperties();
  const allProps = userProps.getProperties();
  const agentKeys = Object.keys(allProps).filter(k => k.startsWith('agent_done:'));

  agentKeys.forEach(key => userProps.deleteProperty(key));

  console.log(`Reset ${agentKeys.length} agent state entries`);
  return agentKeys.length;
}

/**
 * Monitor UserProperties quota usage
 * UserProperties has a 500KB limit
 */
function checkUserPropertiesQuota_() {
  const userProps = PropertiesService.getUserProperties();
  const allProps = userProps.getProperties();
  const totalSize = JSON.stringify(allProps).length;
  const limit = 500000; // 500KB limit
  const percentUsed = (totalSize / limit * 100).toFixed(1);

  console.log(`UserProperties usage: ${totalSize} bytes (${percentUsed}% of ${limit} limit)`);

  if (parseFloat(percentUsed) > 80) {
    console.warn(`⚠️  UserProperties quota warning: ${percentUsed}% used`);
  }

  // Count agent state keys
  const agentKeys = Object.keys(allProps).filter(k => k.startsWith('agent_done:'));
  console.log(`  Agent state entries: ${agentKeys.length}`);

  return {
    totalSize: totalSize,
    limit: limit,
    percentUsed: parseFloat(percentUsed),
    agentKeyCount: agentKeys.length
  };
}
```

### Performance Considerations

**Label Scanning Overhead**:
- Fetching threads for 4 labels: ~4 Gmail API calls per run
- Minimal impact for typical usage (<100 labeled emails)
- Snapshot storage: ~200 bytes per label × 4 labels = 800 bytes

**Gmail API Quota Constraints**:
- Gmail API daily quotas: typically 1000+ calls/day for personal accounts
- Each label scan requires 1 API call per label (4 calls total)
- With hourly triggers: 24 runs/day × 4 calls = 96 calls/day (well under quota)
- For large-scale deployments (500+ labeled emails), monitor quota usage
- Consider implementing label scan throttling if approaching quota limits

**UserProperties Quota Management**:
- Current: Potentially unlimited key accumulation
- After: Bounded by number of actively labeled emails
- Net effect: Reduced long-term storage usage

**Execution Time Impact**:
- Label detection: ~1-2 seconds per run
- State clearing: <100ms for typical cases
- Total overhead: <5% of 6-minute execution limit

### Agent Handler Return Values

The decision **does not change** existing agent return value semantics:

- **`status: 'ok'`**: Agent completed successfully, idempotency key is set
- **`status: 'skip'`**: Agent chose not to process (not idempotent-skip)
- **`status: 'retry'`**: Agent wants to retry later (key not set)
- **`status: 'error'`**: Agent failed (key not set)

Label synchronization only affects the **pre-execution** idempotency check, not the handler's behavior.

### Testing Strategy

**Unit Tests**:
- `detectLabelChanges_()` with various scenarios
- `clearAgentState_()` with permanent and non-permanent agents
- Edge cases: empty snapshots, concurrent removals

**Integration Tests**:
- Remove label → verify keys cleared → re-apply label → verify re-execution
- Permanent state agents: verify keys not cleared
- Mixed agents: verify selective clearing

**Production Monitoring**:
- Log all state clearing events
- Track idempotent-skip vs. successful execution rates
- Monitor UserProperties storage usage

## References

- ADR-003: Label-Based Email Classification System (four-label architecture)
- ADR-004: Pluggable Agents Architecture (agent framework foundation)
- ADR-011: Self-Contained Agent Architecture (agent lifecycle management)
- ADR-014: Configuration Management and Ownership (core vs. agent config separation)
- Google Apps Script PropertiesService quotas and limitations
- Gmail API Labels documentation
- GitHub Issue: Production logs showing `"ok": 0, "skip": 6` agent execution pattern
