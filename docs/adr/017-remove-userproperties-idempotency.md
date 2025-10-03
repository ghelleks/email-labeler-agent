# ADR-017: Remove UserProperties-Based Agent Idempotency

**Status**: Proposed
**Date**: 2025-10-03
**Deciders**: Project team

## Context

The agent framework (ADR-004, ADR-011) uses UserProperties to store permanent idempotency keys that track which agents have processed which email threads. This mechanism creates state divergence between user-visible Gmail labels and hidden framework execution state.

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
    userProps.setProperty(idemStoreKey, '1');  // Persists forever
  }
  // ...
}
```

### The Problem: State Divergence

**Production Evidence**: Recent execution logs show `"labeled": 3, "agents": {"ok": 0, "skip": 6}` - three emails were successfully labeled with "summarize" but all six agent executions (2 agents × 3 emails) were skipped with 'idempotent-skip'. Result: emails were not archived as expected, causing user confusion.

**Root Cause Analysis**:
1. Email receives `summarize` label (initial classification or manual application)
2. `emailSummarizer` agent runs successfully, sets `agent_done:emailSummarizer:thread123`
3. User removes label (intentionally or for re-processing)
4. User re-applies `summarize` label expecting agent to run again
5. **Expected behavior**: Agent processes email again
6. **Actual behavior**: Agent skips with 'idempotent-skip' because UserProperties key persists

**Why This Matters**:
- **User Intent Violation**: Label re-application signals "process this again"
- **Invisible State**: UserProperties are hidden; users cannot see or manage them
- **No Recovery Path**: No way to reset agent state without manual script intervention
- **Confusing UX**: Labeled emails that don't get processed violate user expectations

### UserProperties Idempotency is REDUNDANT

Thorough analysis reveals that the framework already prevents re-processing through multiple mechanisms:

1. **Main workflow query excludes labeled emails** (`GmailService.gs` line 2):
   ```javascript
   const q = 'in:inbox -label:reply_needed -label:review -label:todo -label:summarize';
   ```
   Once an email has any action label, `findUnprocessed_()` will never return it again.

2. **Within-execution deduplication** (`Organizer.gs` line 15):
   ```javascript
   const byThread = new Map();
   results.forEach(function(r) { byThread.set(r.threadId, r); });
   ```
   Multiple classifications of the same thread within one execution are collapsed.

3. **Label application check** (`Organizer.gs` lines 3-4):
   ```javascript
   const hasAny = thread.getLabels().some(function(l) { return actionNames.includes(l.getName()); });
   if (hasAny) return 'skipped';
   ```
   Prevents re-labeling if any action label already exists.

**When UserProperties idempotency matters**:
- **Only if** a user manually removes an action label
- **And then** the email is re-classified or label is manually re-applied
- **Effect**: Without UserProperties check, agent would run again

**Conclusion**: UserProperties idempotency prevents intentional re-processing while providing no value for the normal workflow (which already prevents re-processing through Gmail label queries).

### Constraints and Context

- **Apps Script Environment**: No native Gmail label change triggers available
- **Execution Contexts**: Main classification (hourly), Email Summarizer (daily), other agents (varying schedules)
- **Label-Centric Design** (ADR-003): Four-label system where labels represent desired actions
- **User Mental Model**: Labels are the source of truth for email state
- **UserProperties Quotas**: 500KB total storage per user (limited but not currently constrained)

## Decision

**We will remove all UserProperties-based idempotency tracking from the agent framework.** Agents that require idempotency for non-idempotent operations will implement application-level checks (e.g., verifying external state before acting).

### What Changes

**1. Remove idempotency tracking from Agents.gs:**
- Delete idempotency key checking (lines 67-73)
- Delete idempotency key setting (line 79)
- Remove `idempotentKey` option from agent registration API
- Remove helper functions `defaultIdempotentKey_()` and UserProperties access

**2. Update agent registration pattern:**
- Remove `idempotentKey` option from all agent registrations
- Agents requiring idempotency implement their own state checks

**3. Provide migration utilities:**
- `clearAllAgentIdempotencyKeys_()`: Removes all existing `agent_done:*` keys
- Document migration process for existing deployments

### Architectural Philosophy

**Labels are the source of truth.** The presence of an action label on an email thread means "this action should be taken." If a user removes the label and re-applies it, they are explicitly requesting re-processing. The system should honor this intent.

**Agents are responsible for their own idempotency.** The framework provides execution hooks and context, but agents must handle their own side effects intelligently.

## Alternatives Considered

### Alternative 1: Label-Synchronized State (ADR-016)
**Description**: Keep UserProperties but automatically clear idempotency keys when action labels are removed from emails.

**Pros**:
- Preserves framework-level idempotency guarantees
- Allows granular control with `permanentState` option
- Addresses state divergence through synchronization

**Cons**:
- Adds significant complexity (label snapshots, change detection, clearing logic)
- Introduces execution overhead (scanning labeled emails every run)
- Creates more hidden state (label snapshots in UserProperties)
- Still maintains framework responsibility for application-level concerns
- Polling-based detection has inherent timing delays
- Doesn't solve the root problem: framework managing application state

**Why not chosen**: Adds complexity to solve a problem that shouldn't exist. Synchronization is a band-aid for an architectural smell - the framework shouldn't be tracking application-level execution state.

### Alternative 2: Time-Based Expiration
**Description**: Clear idempotency keys automatically after N days (e.g., 30 days).

**Pros**:
- Simple to implement with TTL-style properties
- Automatic cleanup prevents indefinite storage growth
- No label monitoring required

**Cons**:
- Arbitrary timeout doesn't respect user intent
- May clear state prematurely for infrequent agents
- Doesn't solve immediate re-processing needs
- Still maintains hidden state that diverges from labels

**Why not chosen**: Doesn't address the core problem of hidden state and ignores explicit user intent.

### Alternative 3: Status Quo (Keep Permanent Keys)
**Description**: Keep current behavior where idempotency keys persist forever.

**Pros**:
- Simple, predictable framework behavior
- Prevents accidental duplicate agent execution
- No implementation changes required

**Cons**:
- State divergence continues causing production issues
- Confuses users when re-applying labels
- No recovery path for stuck agents
- Violates user expectations about label semantics
- Accumulates unbounded UserProperties data

**Why not chosen**: Fails to meet user needs and creates confusing, unpredictable behavior in production.

### Alternative 4: Remove Idempotency Entirely (CHOSEN)
**Description**: Remove UserProperties idempotency from framework. Agents implement application-level checks when needed.

**Pros**:
- **Transparent state**: Labels fully represent system state
- **Simplifies framework**: Removes 20+ lines of state management code
- **User intent alignment**: Re-applying labels triggers re-processing
- **No hidden state**: All system state visible in Gmail
- **Reduced storage**: No permanent key accumulation
- **Agent responsibility**: Agents handle their own idempotency needs
- **Better debugging**: State is visible in Gmail UI

**Cons**:
- **Agent implementation burden**: Agents must check for existing state
- **Risk of duplicate side effects**: Without careful agent design
- **Wasted AI budget**: Duplicate classifications possible (mitigated by budget tracking)
- **Migration effort**: Need to clear existing keys

**Why chosen**: Benefits (transparency, simplicity, user alignment) outweigh risks (which are manageable through agent design patterns).

## Consequences

### Positive

- **Transparent System State**: All email state is visible through Gmail labels
- **User Intent Honored**: Label removal + re-application triggers re-processing as expected
- **Simpler Framework**: Removes 20+ lines of state management complexity
- **No Hidden State Divergence**: Labels and execution state cannot conflict
- **Reduced Storage**: No accumulation of permanent UserProperties keys
- **Clear Debugging**: Email state inspection happens in Gmail UI, not Apps Script console
- **Flexibility**: Users can force re-processing by removing/re-applying labels
- **Agent Autonomy**: Agents handle their own idempotency using application state

### Negative

- **Agent Implementation Responsibility**: Agents must implement idempotency checks when needed
- **Potential Duplicate Execution**: If agent doesn't check for existing side effects
- **Wasted AI Budget**: Duplicate classifications possible (limited by existing budget tracking)
- **Migration Required**: Existing deployments need to clear UserProperties keys
- **Documentation Updates**: Agent development patterns need clear guidance

### Neutral

- **Gmail Operations Unaffected**: Archive, label changes are naturally idempotent
- **Performance Impact**: Minimal - removing checks is faster than performing them
- **Testing Changes**: Simplifies testing by removing state management complexity

## Implementation Notes

### Framework Changes

**Agents.gs modifications:**
```javascript
// BEFORE (lines 5-14, 67-80):
function getUserProps_() {
  return PropertiesService.getUserProperties();
}

function defaultIdempotentKey_(name, ctx) {
  return name + ':' + ctx.threadId;
}

// In runFor():
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
    userProps.setProperty(idemStoreKey, '1');  // REMOVE THIS
  }
  // ...
}

// AFTER (simplified):
// Remove getUserProps_() function entirely
// Remove defaultIdempotentKey_() function entirely
// Remove idempotency checking and setting from runFor()

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

    // Respect per-agent enabled flag
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

    // REMOVED: idempotency check - agents handle their own state

    try {
      runCountThisExecution++;
      var result = item.handler(ctx) || { status: 'ok' };
      results.push({
        agent: item.name,
        status: result.status || 'ok',
        info: result.info,
        retryAfterMs: result.retryAfterMs
      });
    } catch (e) {
      results.push({
        agent: item.name,
        status: 'error',
        info: (e && e.toString ? e.toString() : String(e))
      });
    }
  }
  return results;
}
```

**Agent registration changes:**
```javascript
// BEFORE:
AGENT_MODULES.push(function(api) {
  api.register('summarize', 'emailSummarizer', summarizerAgentHandler, {
    idempotentKey: function(ctx) { return 'emailSummarizer:' + ctx.threadId; },  // REMOVE
    runWhen: 'afterLabel',
    enabled: true
  });
});

// AFTER:
AGENT_MODULES.push(function(api) {
  api.register('summarize', 'emailSummarizer', summarizerAgentHandler, {
    runWhen: 'afterLabel',
    enabled: true
  });
});
```

### Agent Idempotency Patterns

**Pattern 1: Naturally Idempotent Operations (No Changes Needed)**

Most Gmail operations are naturally idempotent:
```javascript
// Archive operation - naturally idempotent
function summarizerAgentHandler(ctx) {
  // Archive is safe to call multiple times
  ctx.thread.moveToArchive();
  return { status: 'ok', info: 'email archived' };
}

// Label management - naturally idempotent
function labelManagerAgentHandler(ctx) {
  const label = GmailApp.getUserLabelByName('processed') || GmailApp.createLabel('processed');
  ctx.thread.addLabel(label);  // Safe to call multiple times
  return { status: 'ok', info: 'label applied' };
}
```

**Pattern 2: Check Gmail State Before Acting**

For agents that create Gmail resources (drafts, sends):
```javascript
function replyDrafterAgentHandler(ctx) {
  // Check if draft already exists for this thread
  const existingDrafts = GmailApp.getDrafts().filter(function(draft) {
    return draft.getMessage().getThread().getId() === ctx.threadId;
  });

  if (existingDrafts.length > 0) {
    ctx.log('Draft already exists for this thread');
    return { status: 'skip', info: 'draft already exists' };
  }

  // Create draft only if none exists
  const draftBody = generateReplyContent_(ctx);
  GmailApp.createDraft(ctx.thread.getMessages()[0].getReplyTo(),
                       'Re: ' + ctx.thread.getFirstMessageSubject(),
                       draftBody);

  return { status: 'ok', info: 'draft created' };
}
```

**Pattern 3: Check External State**

For agents that interact with external systems:
```javascript
function webhookNotifierAgentHandler(ctx) {
  // Check if webhook was already sent (external system tracks this)
  const webhookId = 'email-' + ctx.threadId;
  const alreadySent = checkExternalWebhookStatus_(webhookId);

  if (alreadySent) {
    ctx.log('Webhook already sent for this thread');
    return { status: 'skip', info: 'webhook already sent' };
  }

  // Send webhook with idempotency key
  sendWebhook_(webhookId, ctx);
  return { status: 'ok', info: 'webhook sent' };
}
```

**Pattern 4: Use Application-Specific UserProperties (When Needed)**

For agents that truly need persistent state tracking:
```javascript
function complexWorkflowAgentHandler(ctx) {
  // Agent manages its own state with clear semantics
  const stateKey = 'myagent:workflow:' + ctx.threadId;
  const userProps = PropertiesService.getUserProperties();

  const existingState = userProps.getProperty(stateKey);
  if (existingState === 'completed') {
    ctx.log('Workflow already completed for this thread');
    return { status: 'skip', info: 'workflow completed' };
  }

  // Perform multi-step workflow
  performComplexWorkflow_(ctx);

  // Set state only after full completion
  userProps.setProperty(stateKey, 'completed');
  return { status: 'ok', info: 'workflow completed' };
}
```

**Key Principle**: Agents should check **application state** (Gmail drafts, external systems, custom properties) rather than relying on framework-managed execution state.

### Migration Path

**Step 1: Deploy Updated Framework**
```javascript
// Updated Agents.gs without idempotency tracking
// Updated agent registrations without idempotentKey option
```

**Step 2: Clear Existing Idempotency Keys**

Utility function to remove all existing agent idempotency keys:
```javascript
/**
 * Clear all agent idempotency keys from UserProperties
 * Run this once after deploying ADR-017 changes
 */
function clearAllAgentIdempotencyKeys_() {
  const userProps = PropertiesService.getUserProperties();
  const allProps = userProps.getProperties();

  const agentKeys = Object.keys(allProps).filter(function(key) {
    return key.startsWith('agent_done:');
  });

  agentKeys.forEach(function(key) {
    userProps.deleteProperty(key);
  });

  console.log('Migration complete: Cleared ' + agentKeys.length + ' agent idempotency keys');
  return {
    success: true,
    clearedCount: agentKeys.length,
    message: 'Agent idempotency keys cleared successfully'
  };
}
```

**Step 3: Update Agent Implementations**

Review each agent for side effects that require idempotency:
- **Email Summarizer**: Archive operation is naturally idempotent - NO CHANGES NEEDED
- **Reply Drafter** (future): Add draft existence check - PATTERN 2
- **Webhook agents** (future): Use external idempotency - PATTERN 3

**Step 4: Monitor Production**

After deployment, monitor for:
- Duplicate agent executions (should be rare due to label-based workflow)
- Unexpected side effects (duplicate drafts, duplicate webhooks)
- UserProperties quota usage (should decrease)

### Testing Strategy

**Unit Tests**:
- Verify agent executes on first label application
- Verify agent executes again after label removal + re-application
- Verify agent idempotency checks work correctly (draft existence, etc.)

**Integration Tests**:
- Label email → verify agent runs → verify expected side effects
- Remove label → re-apply label → verify agent runs again
- Concurrent label applications → verify no duplicate side effects

**Production Monitoring**:
- Track agent execution success/failure rates
- Monitor for duplicate side effects
- Verify UserProperties storage decreases
- Confirm user-reported issues are resolved

### Agent Risk Assessment

| Agent Type | Side Effects | Idempotency Risk | Mitigation Strategy |
|------------|--------------|------------------|---------------------|
| Email Archiver | `moveToArchive()` | **NONE** | Gmail operation is naturally idempotent |
| Label Manager | `addLabel()`, `removeLabel()` | **NONE** | Gmail operations are naturally idempotent |
| Email Summarizer | Archive + send email | **LOW** | Archive is idempotent; duplicate summaries harmless |
| Reply Drafter | Create Gmail draft | **MODERATE** | Check `GmailApp.getDrafts()` before creating |
| Webhook Notifier | External API call | **MODERATE-HIGH** | Use external system's idempotency keys |
| Task Creator | Create external task | **MODERATE-HIGH** | Check external system state before creating |
| Database Writer | Write to external DB | **HIGH** | Use external transaction IDs or duplicate detection |

**Recommendation**: Start with low-risk agents (Summarizer) and add idempotency patterns progressively as agents with higher-risk side effects are developed.

### Edge Cases and Handling

**Edge Case 1: User removes and re-applies label within same execution window**
- **Before ADR-017**: Agent would skip due to idempotency key
- **After ADR-017**: Agent runs again (desired behavior)
- **Risk**: Minimal - user explicitly requested re-processing

**Edge Case 2: Multiple users manipulate same email in shared mailbox**
- **Before ADR-017**: First agent run sets key, subsequent runs skip
- **After ADR-017**: Each label application triggers agent run
- **Risk**: Potentially duplicate actions if not coordinated
- **Mitigation**: Agents check application state (drafts, external systems)

**Edge Case 3: Classification changes email label (e.g., review → reply_needed)**
- **Before ADR-017**: Agents for both labels would run (idempotency keys differ by label)
- **After ADR-017**: Same behavior - agents run based on final label
- **Risk**: None - behavior unchanged

**Edge Case 4: Agent fails mid-execution**
- **Before ADR-017**: Idempotency key not set on failure; agent retries
- **After ADR-017**: Same behavior - agent can retry on next execution
- **Risk**: None - failure handling unchanged

**Edge Case 5: Budget limits prevent agent execution**
- **Before ADR-017**: Agent skipped due to budget, idempotency key not set
- **After ADR-017**: Same behavior - agent waits for next execution
- **Risk**: None - budget handling unchanged

## References

- ADR-003: Label-Based Email Classification (four-label architecture foundation)
- ADR-004: Pluggable Agents Architecture (original agent framework)
- ADR-011: Self-Contained Agent Architecture (agent lifecycle patterns)
- ADR-012: Generic Service Layer Pattern (agent support functions)
- ADR-016: Label-Synchronized Agent State Management (superseded by this ADR)
- Google Apps Script PropertiesService documentation
- Gmail API Labels and Threads documentation
- Production logs: Issue showing `"ok": 0, "skip": 6` pattern causing user confusion
