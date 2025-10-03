# ADR-018: Dual-Hook Agent Architecture

**Status**: Accepted
**Date**: 2025-10-03
**Deciders**: Project team

## Context

The original pluggable agent architecture (ADR-004) and self-contained agent pattern (ADR-011) provided a foundation for extending email processing functionality. However, as the system evolved, significant limitations emerged in how agents interacted with the classification pipeline:

**Previous Architecture Limitations:**
1. **Single Handler Pattern**: Agents registered only one handler function per label
2. **Classification-Only Execution**: Agents could only act on emails during the classification pipeline
3. **Manual Label Gap**: Manually-labeled emails (e.g., user applies `reply_needed` label directly) required separate scheduled triggers to be processed
4. **Trigger Proliferation**: Each action agent potentially needed its own independent trigger (e.g., Reply Drafter had a separate 30-minute trigger)
5. **No Immediate + Cleanup Pattern**: No clean way to implement "immediate action for auto-classified emails + periodic scan for manual labels"

**Concrete Example - Reply Drafter Pain Points:**
- Auto-classified emails: Draft created immediately during classification ✅
- Manually-labeled emails: Required waiting up to 30 minutes for separate trigger 🐌
- System complexity: Two execution paths (agent handler + independent trigger)
- Trigger management: Each agent needing scanning behavior required separate trigger setup

**Architectural Tension:**
The system needed to support two fundamentally different execution patterns:
1. **Immediate per-email actions**: React to individual emails as they're classified (forward, draft, notify)
2. **Inbox-wide scanning**: Periodically scan for emails with specific labels, regardless of how they were labeled (catch manual labels, cleanup operations)

The previous single-handler pattern forced agents to choose one or implement complex workarounds with separate triggers.

## Decision

We implemented a **dual-hook agent architecture** that provides two distinct execution points within the same hourly classification run:

### Hook 1: `onLabel` - Immediate Per-Email Actions
- **When**: Called once per email as the label is applied during classification
- **Purpose**: Immediate actions on newly-classified emails
- **Context**: Receives full context about the specific email being labeled
- **Use Cases**: Draft reply, forward email, send notification, apply additional labels
- **Execution**: Runs inline during `Organizer.apply_()` for each labeled thread

### Hook 2: `postLabel` - Inbox-Wide Scanning
- **When**: Called once after all email labeling is complete
- **Purpose**: Scan entire inbox for emails with specific labels
- **Context**: No parameters provided - hook scans independently
- **Use Cases**: Catch manually-labeled emails, cleanup operations, batch processing
- **Execution**: Runs once via `Agents.runPostLabelHandlers()` after labeling phase

### Registration API

**New Dual-Hook Pattern (BREAKING CHANGE):**
```javascript
AGENT_MODULES.push(function(api) {
  api.register(
    'label_name',           // Label to trigger on
    'AgentName',            // Agent name for logging
    {
      onLabel: function(ctx) {
        // Immediate per-email action
        // ctx: { label, decision, threadId, thread, cfg, dryRun, log() }
        return { status: 'ok', info: 'processed' };
      },
      postLabel: function() {
        // Inbox-wide scan (no parameters)
        // Scan for manually-labeled emails
        const threads = findEmailsByLabelWithAge_('label_name', 1);
        // Process threads...
      }
    },
    {
      enabled: true,        // Optional: default true
      runWhen: 'afterLabel', // Optional: 'afterLabel' | 'always'
      timeoutMs: 30000      // Optional: soft timeout for monitoring
    }
  );
});
```

**Requirements:**
- At least one hook (`onLabel` or `postLabel`) must be provided
- Both hooks are optional, but at least one must exist
- Hooks parameter must be an object with `onLabel` and/or `postLabel` properties
- Each hook must be a function if provided

**Old Single-Handler Pattern (DEPRECATED):**
```javascript
// NO LONGER SUPPORTED - WILL THROW ERROR
api.register('label', 'AgentName', handlerFunction, options);
```

### Execution Flow

```
Hourly Trigger Fires
  └─> findUnprocessed_() identifies unlabeled threads
  └─> categorizeWithGemini_() classifies emails
  └─> Organizer.apply_() processes results
       ├─> For each thread:
       │    ├─> Apply label
       │    └─> Call onLabel hooks (immediate per-email actions)
       │
       └─> After all labeling complete:
            └─> Call postLabel hooks (inbox-wide scans)
```

### Idempotency Strategy

Both hooks leverage label-based idempotency (ADR-016):
- **onLabel**: Processes emails as they receive labels during classification
- **postLabel**: Scans for emails with labels, uses application-level checks to prevent duplicate processing
- **Example**: Reply Drafter checks for existing drafts before creating new ones
- **Result**: Same email may be seen by both hooks, but idempotency prevents duplicate actions

## Alternatives Considered

### Alternative 1: Keep Separate Triggers Per Agent
- **Pros**: Simple to understand, each agent fully independent, flexible scheduling
- **Cons**: Trigger proliferation (4+ triggers), harder to manage, separate execution contexts, quota fragmentation
- **Why not chosen**: Violated simplicity principle and made system harder to maintain

### Alternative 2: Single Hook with Mode Parameter
```javascript
api.register('label', 'Agent', handler, { mode: 'immediate' | 'scan' | 'both' });
```
- **Pros**: Single registration call, simpler API surface
- **Cons**: Forces handlers to implement branching logic, less clear separation of concerns, single function handles two distinct use cases
- **Why not chosen**: Violates single responsibility principle and makes handlers more complex

### Alternative 3: Separate Agent Types (ImmediateAgent vs. ScanAgent)
- **Pros**: Clear type distinction, enforces pattern adherence
- **Cons**: Requires duplicate registration for agents needing both behaviors, more complex agent framework
- **Why not chosen**: Creates unnecessary complexity for the common "immediate + scan" use case

### Alternative 4: Event Queue with Workers
- **Pros**: Highly scalable, retry logic built-in, fault-tolerant
- **Cons**: Requires external infrastructure, overengineered for Apps Script, contradicts serverless architecture
- **Why not chosen**: Too complex for the Apps Script environment and current scale

### Alternative 5: onLabel + Scheduled Batch (Status Quo)
- **Pros**: Already implemented, agents can use independent scheduling
- **Cons**: Trigger proliferation, separate execution contexts, manual labels have delay, complex debugging
- **Why not chosen**: This is the problem we're solving - architectural limitations led to this decision

## Consequences

### Positive
- **Zero Trigger Proliferation**: All agents run in single hourly trigger, no need for separate scheduled triggers
- **Immediate Action**: Auto-classified emails get instant processing via `onLabel`
- **Manual Label Coverage**: `postLabel` catches manually-labeled emails within the hour
- **Clean Separation**: Immediate vs. scanning logic separated into distinct hooks
- **Simpler Agent Development**: Clear pattern for "immediate + cleanup" behavior
- **Unified Execution Context**: Both hooks run in same execution, share budget and configuration
- **Better Debugging**: Single execution log contains all agent activity
- **Consistent Timing**: All agents run hourly, predictable behavior

### Negative
- **🚨 BREAKING CHANGE**: All existing agents must migrate to dual-hook pattern
- **Reduced Frequency for Manual Labels**: Reply Drafter now runs hourly instead of every 30 minutes for manually-labeled emails
- **API Complexity**: Registration requires object parameter instead of simple function
- **Learning Curve**: Developers must understand when to use each hook
- **Migration Effort**: All three existing agents required updates

### Neutral
- **Hook Selection Flexibility**: Agents choose which hooks they need (onLabel-only, postLabel-only, or both)
- **Idempotency Still Required**: Agents must implement application-level checks for duplicate prevention
- **No Performance Change**: Same number of emails processed, just different execution pattern

## Implementation Notes

### Migration Impact

**All agents MUST migrate from old pattern to new pattern. The old single-function handler pattern is no longer supported.**

#### Migrated Agents

**Reply Drafter (AgentReplyDrafter.gs):**
- **Before**: Single handler + separate 30-minute scheduled trigger
- **After**: Dual hooks (immediate draft + hourly scan for manual labels)
- **Changes**:
  - Removed `installReplyDrafterTrigger()` function
  - Removed `runReplyDrafter()` scheduled entry point
  - Implemented `replyDrafterOnLabel_()` for immediate drafts
  - Implemented `replyDrafterPostLabel_()` for manual label scanning
  - Registration changed to `{ onLabel, postLabel }` object
- **Impact**: Manual labels now processed hourly instead of every 30 minutes

**Email Summarizer (AgentSummarizer.gs):**
- **Before**: Single handler (onLabel-only behavior)
- **After**: Dual-hook registration (onLabel-only, postLabel omitted)
- **Changes**:
  - Wrapped existing handler in `{ onLabel: summarizerHandler }` object
  - No behavioral change (still immediate-only)
- **Impact**: Registration syntax updated for consistency

**Template Agent (AgentTemplate.gs):**
- **Before**: Outdated template showing old pattern
- **After**: Complete rewrite demonstrating dual-hook pattern
- **Changes**:
  - Added `templateAgentOnLabel_()` example
  - Added `templateAgentPostLabel_()` example
  - Updated documentation to explain hook selection
  - Added ADR-018 reference
- **Impact**: Template now shows best practices for new agents

### Hook Selection Guide

**Use `onLabel` only when:**
- Agent needs immediate per-email action
- No need to catch manually-labeled emails
- Example: Email Summarizer (archive on label, scheduled summary runs separately)

**Use `postLabel` only when:**
- Agent needs periodic inbox scanning
- No immediate action required
- Example: Cleanup agent that processes old emails

**Use both hooks when:**
- Immediate action for auto-classified emails
- Need to catch manually-labeled emails
- Example: Reply Drafter (immediate drafts + scan for manual labels)

### Context Objects

**onLabel Context (`ctx` parameter):**
```javascript
{
  label: 'reply_needed',           // Label being applied
  decision: {                      // Classification result
    required_action: 'reply_needed',
    reason: 'Email asks question'
  },
  threadId: 'thread_123',          // Gmail thread ID
  thread: GmailThread,             // Full GmailThread object
  cfg: { DEBUG: true, ... },       // Configuration
  dryRun: false,                   // Dry-run mode flag
  log: function(msg) { ... }       // Logging function
}
```

**postLabel Context:**
```javascript
// No parameters provided
// Hook scans inbox independently using GmailService functions:
const threads = findEmailsByLabelWithAge_('label_name', maxAgeDays);
```

### Error Handling

**onLabel Errors:**
- Caught and logged per agent
- Don't block other agents on same label
- Don't block postLabel hooks
- Return `{ status: 'error', info: errorMessage }`

**postLabel Errors:**
- Caught and logged per agent
- Don't block other agents
- Stats tracked separately: `{ executed, skipped, errors }`
- Soft timeout warnings if `timeoutMs` exceeded

### Budget and Performance

**Budget Tracking:**
- `onLabel` hooks count against `AGENTS_BUDGET_PER_RUN` (default: 50)
- Budget only applies to onLabel hooks (per-email)
- `postLabel` hooks don't count against per-run budget (one-time execution)

**Performance:**
- Both hooks run in same execution (no additional trigger overhead)
- `postLabel` hooks should implement efficient label searches
- Use `findEmailsByLabelWithAge_()` for optimal performance
- Soft timeout warnings help identify slow agents

### Testing and Debugging

**Debug Logging:**
```javascript
// In Organizer.apply_():
console.log('Running onLabel for thread: ' + threadId);

// In Agents.runPostLabelHandlers():
Logger.log('Running postLabel handlers for ' + allAgents.length + ' agents...');
Logger.log('postLabel handlers complete: executed=X, skipped=Y, errors=Z');
```

**Dry-Run Behavior:**
- `onLabel` hooks respect `ctx.dryRun` flag
- Agents should check `ctx.dryRun` and return without side effects
- `postLabel` hooks can check `cfg.DRY_RUN` if needed

## References

- ADR-004: Pluggable Agents Architecture (original framework)
- ADR-011: Self-Contained Agent Architecture (independence pattern)
- ADR-016: Label-Synchronized Agent State (idempotency via labels)
- ADR-017: Remove UserProperties Idempotency Mechanism (application-level checks)
- AgentReplyDrafter.gs: Reference implementation of dual-hook pattern
- AgentTemplate.gs: Template demonstrating hook selection and patterns
