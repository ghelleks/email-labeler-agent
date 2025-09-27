# Developer Guide: Mail Screener — Gmail Labeler (Apps Script)

This guide explains how the current system works and how to configure, extend, and troubleshoot it. It covers the Apps Script code in `src/`, the configuration via Script Properties, and local workflows using `clasp`.

## Overview
- Core flow: triage Gmail threads and apply exactly one action label per thread.
- Labels: `reply_needed`, `review`, `todo`, `summarize` (created if missing).
- Rules: Optional Google Doc text (or a built-in default policy) is embedded in the prompt.
- LLM: Uses Gemini via Generative Language API (API key) by default; Vertex mode is supported if configured.
- Execution: Manual (`run()`), or scheduled via a time-based trigger (`installTrigger()`).

## Repository Layout
- `src/Main.gs`: entry points (`run`, triggers) and orchestration
- `src/Config.gs`: loads Script Properties and defaults
- `src/Categorizer.gs`: batching, model calls, budget enforcement, normalization
- `src/Organizer.gs`: applies labels to threads, summarizes outcomes
- `src/RuleDocService.gs`: fetches rules from Drive, with a default fallback policy
- `src/LLMService.gs`: model request/response glue (used by categorizer)
- `src/GmailService.gs`: helpers for querying and shaping Gmail data
- `src/PromptBuilder.gs`: constructs the model prompt from emails + policy
- `src/appsscript.json`: script metadata (runtime, time zone)

## Configuration (Script Properties)
Set in Apps Script → Project Settings → Script properties.

Required for API-key mode (default):
- `GEMINI_API_KEY`: Generative Language API key

Optional / Advanced:
- `RULE_DOC_URL`: Google Doc or Drive URL to the triage rules (preferred)
- `RULE_DOC_ID`: Doc ID (legacy alternative)
- `DEFAULT_FALLBACK_LABEL`: default `review`
- `MAX_EMAILS_PER_RUN`: default `20`
- `BATCH_SIZE`: default `10`
- `BODY_CHARS`: default `1200` (max characters of body excerpt per email)
- `DAILY_GEMINI_BUDGET`: default `50` (max model calls per day)
- `DRY_RUN`: `true|false`, default `false`
- `DEBUG`: `true|false`, default `false`

Vertex mode (optional):
- `GOOGLE_CLOUD_PROJECT` (or `PROJECT_ID`): required only if no API key is set
- `GOOGLE_CLOUD_LOCATION`: default `us-central1`

## Local Development with clasp
Prereqs: Node 18+, `@google/clasp` installed and logged in.

```bash
npm install -g @google/clasp
```

### Multi-Account Setup (Recommended)

#### Initial Setup
```bash
# Configure accounts
npm run setup:account

# Authenticate each account
clasp --user personal login
clasp --user work login

# Create project files
npm run switch:create-project-files

# Validate setup
npm run validate:accounts
```

#### Daily Development Workflow
```bash
# Push to specific account
npm run push:personal
npm run push:work

# Open specific account editor
npm run open:personal
npm run open:work

# Deploy with triggers
npm run deploy:personal:all
npm run deploy:work:all

# Check account status
npm run switch:status
npm run status:all
```

### Legacy Single Account Workflow
For existing single-account setups or simple deployments:
```bash
clasp login --no-localhost
npm run create  # First time only
npm run push
npm run open
```

## Execution Flow
1. `run()` reads config via `getConfig_()`.
2. Ensures labels exist.
3. Loads rules text from Drive (or default policy) via `getRuleText_()`.
4. Queries candidate threads and extracts minimal email data.
5. Sends batches to Gemini and parses a JSON result per email: `{ id, required_action, reason }`.
6. Normalizes `required_action` to a valid label or falls back.
7. Applies exactly one label per thread and logs a summary.

### Key Functions
- `run()` (in `Main.gs`): Orchestrates the entire run and logs a JSON summary.
- `installTrigger()` / `deleteExistingTriggers_()` (in `Main.gs`): Manage time-based triggers.
- `categorizeWithGemini_()` (in `Categorizer.gs`): Handles batching, budget checks, normalization.
- `categorizeBatch_()` (in `LLMService.gs`): Builds request, calls model endpoint, and parses responses.
- `getRuleText_()` (in `RuleDocService.gs`): Loads rule content from Docs or returns built-in policy.
- `Organizer.apply_()` (in `Organizer.gs`): Applies labels and returns counts.

## Prompt & Rules
- The prompt includes: action label definitions, your rules text, and email snippets.
- Improve results by adding clear, concrete examples to your rules document.
- If your rules cannot be fetched, the default policy is used.

## Model Calls
- Default model: `gemini-1.5-flash`
- API key mode endpoint: `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=...`
- Vertex mode endpoint: `https://<location>-aiplatform.googleapis.com/v1/projects/<project>/locations/<location>/publishers/google/models/<model>:generateContent`
- Debug logs include HTTP status and raw model output when `DEBUG=true`.

## Budgeting & Batching
- `DAILY_GEMINI_BUDGET`: soft limit on calls/day (tracked in Script Properties, reset daily).
- `BATCH_SIZE`: number of emails per model call.
- If budget is exceeded, items are marked with `reason: 'budget-exceeded'` and skipped.

## Error Handling & Normalization
- Robust JSON extraction: takes the first JSON object in the model output.
- If parsing fails, items fall back with `required_action: null` and reason `fallback-on-error`.
- Only allowed labels are accepted; others are treated as invalid and skipped.

## Scheduling

### Trigger Installation
**Important**: Automated trigger installation via `clasp run` is unreliable due to permission issues. Manual installation is recommended:

1. Open Apps Script editor: `npm run open:personal` or `npm run open:work`
2. Select `installTrigger` from function dropdown
3. Click Run button and grant permissions
4. Verify in Triggers section

### Programmatic Trigger Management
For manual execution in Apps Script editor:
```javascript
installTrigger();           // Install hourly trigger
deleteExistingTriggers_();  // Remove all triggers
```

### Multi-Account Trigger Management
Install triggers separately for each account:
- Personal: `npm run open:personal` → run `installTrigger`
- Work: `npm run open:work` → run `installTrigger`

## Troubleshooting
- Nothing happens: check that `run()` was authorized (run once in editor).
- All items labeled `review`: add examples to your rules, increase `BODY_CHARS`.
- API errors: verify `GEMINI_API_KEY`, ensure Generative Language API is enabled.
- Vertex errors: ensure project is linked in Apps Script and use numeric project number if needed.
- View logs: set `DEBUG=true` and re-run.

## Extending the System
- Add rules examples to improve accuracy.
- Adjust label set by editing `ensureLabels_()` and normalization in `Categorizer.gs`.
- Modify `BATCH_SIZE` and `BODY_CHARS` to trade off cost vs. context.

## Writing Agents
Agents let you plug in post-label actions (e.g., create a draft for `reply_needed`, forward `todo` items elsewhere) without changing core triage code.

### Where to put your agents
- Create a new file (e.g., `MyAgents.gs`) in `src/`.
- Define a global `registerAgents()` function. It is called at the start of `run()` if present.

### Registering an agent
```javascript
// In MyAgents.gs
function registerAgents() {
  Agents.register(
    'todo',            // label to respond to
    'forwarder',       // unique agent name
    function(ctx) {    // handler
      if (ctx.dryRun) return { status: 'skip', info: 'dry-run' };
      // do work here (e.g., UrlFetchApp.fetch(...))
      return { status: 'ok', info: 'forwarded' };
    },
    {
      // optional settings
      idempotentKey: function(ctx) { return 'forwarder:' + ctx.threadId; },
      runWhen: 'afterLabel', // or 'always' to ignore dry-run gating
      timeoutMs: 20000
    }
  );
}
```

### Handler contract
The handler receives an `AgentContext` and returns an `AgentResult`.

- Context (`ctx`):
  - `label`: one of `reply_needed|review|todo|summarize`
  - `decision`: `{ required_action, reason }` as decided by the model
  - `threadId`: Gmail thread ID
  - `thread`: `GmailThread` (already fetched)
  - `cfg`: result of `getConfig_()` (includes `AGENTS_*` values)
  - `dryRun`: boolean; mirrors `DRY_RUN`
  - `log(msg)`: convenience logger that emits only when `DEBUG=true`

- Return (`AgentResult`):
  - `status`: `ok | skip | retry | error`
  - `info?`: string for human-readable details
  - `retryAfterMs?`: suggest a delay before retry (informational; scheduling is deferred to future enhancements)

### Idempotency
- Default key: `${name}:${threadId}`; once an agent returns `ok`, it will not run again for that thread.
- Override with `options.idempotentKey(ctx)` if you need finer control.

### Dry-run behavior
- If `DRY_RUN=true`, agents are skipped by default with `status: 'skip'`.
- To force execution in dry-run (for testing), set `runWhen: 'always'` in the agent options or set `AGENTS_DRY_RUN=false` in Script Properties to disable dry-run skipping for all agents.

### Budgets and filters
- `AGENTS_BUDGET_PER_RUN` (default `50`): maximum agent executions per `run()`.
- `AGENTS_LABEL_MAP` (JSON): optional allowlist of agent names per label, e.g.:
  ```json
  { "todo": ["forwarder"], "reply_needed": ["draftReply"] }
  ```

### Observability
- `Organizer.apply_()` aggregates agent outcomes in the final summary: `{ agents: { ok, skip, retry, error } }`.
- Use `ctx.log('message')` to add per-agent debug logs gated by `DEBUG=true`.

## Code Pointers
- Configuration shape is defined in `getConfig_()`:
```text
/Users/gunnarhellekson/Code/email-labeler-agent/src/Config.gs
```
- Main orchestration:
```text
/Users/gunnarhellekson/Code/email-labeler-agent/src/Main.gs
```
- Label application:
```text
/Users/gunnarhellekson/Code/email-labeler-agent/src/Organizer.gs
```
- Model interaction & parsing:
```text
/Users/gunnarhellekson/Code/email-labeler-agent/src/LLMService.gs
/Users/gunnarhellekson/Code/email-labeler-agent/src/Categorizer.gs
```
- Rule document handling:
```text
/Users/gunnarhellekson/Code/email-labeler-agent/src/RuleDocService.gs
```

## Security & Permissions
- Scopes required: Gmail modify, Drive read-only, external requests, script runtime, cloud-platform.
- The script stores daily budget counters and flags in Script Properties.

## Versioning & Releases

### Multi-Account Deployment
```bash
# Deploy to specific account
npm run deploy:personal:all    # Complete deployment (code + triggers)
npm run deploy:work:all        # Complete deployment (code + triggers)

# Deploy to all accounts
npm run deploy:all-accounts     # Batch deployment with confirmation

# Account-specific operations
npm run push:personal           # Push code only
npm run deploy:personal         # Deploy code only
npm run logs:personal           # View execution logs
npm run status:personal         # Check account status
```

### Validation and Troubleshooting
```bash
npm run validate:accounts       # Validate multi-account configuration
npm run switch:status          # Show all account statuses
npm run auth:help              # Authentication guidance
```

### Legacy Single Account Commands
```bash
npm run version:stable         # Create timestamped version
npm run deploy:all             # Deploy complete system (if using legacy setup)
npm run deploy:webapp          # Deploy web app only (if using legacy setup)
```

## Notes
- Keep `DEBUG` off in regular runs to reduce log volume.
- Prefer API key mode unless your organization requires Vertex.
