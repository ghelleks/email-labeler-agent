## Apps Script Gmail Labeler: Gemini-guided via Drive Rules Doc

A scheduled Google Apps Script that labels Gmail threads using Gemini categorization, guided entirely by a user-editable rules document stored in Google Drive. No local pattern-matching; no cache; no drafting or Slack for v1. The script skips threads already labeled with any action label.

---

## Goals and constraints

- Gemini-only categorization, guided by a rules document (plain text from Drive).
- Idempotent: skip threads that already have one of the action labels.
- Cost-aware: batch emails per call; daily call budget; fallback label on irrecoverable errors.
- Minimal v1: labeling only. Drafting and notifications can be added later.

---

## Labels

- Action labels (created if missing): `reply_needed`, `review`, `todo`, `summarize`

---

## Configuration (Script Properties)

- Required:
  - `GEMINI_API_KEY`
  - `RULE_DOC_ID` (Google Drive file ID; Google Doc or Markdown or plain text)
- Optional:
  - `DEFAULT_FALLBACK_LABEL` (default: `review`)
  - `MAX_EMAILS_PER_RUN` (default: `20`)
  - `BATCH_SIZE` (default: `10`)
  - `BODY_CHARS` (default: `1200`)
  - `DAILY_GEMINI_BUDGET` (default: `50`)
  - `DRY_RUN` (`true`|`false`, default: `false`)
  - `LOG_SHEET_ID` (optional Google Sheet for run summaries)

---

## Scheduling

- Provide `installTrigger()` to create a time-based trigger (e.g., hourly or every 15 min).
- Provide `deleteExistingTriggers_()` to avoid duplicate triggers.

---

## Scopes

- Gmail read/write
- Drive read (to fetch rules file)
- Optional Sheets read/write (if `LOG_SHEET_ID` used)
- UrlFetch (for Gemini API)

---

## Architecture and modules

- `Main.gs`
  - Entry `run()`, orchestrates the flow and logging.
  - Trigger helpers: `installTrigger()`, `deleteExistingTriggers_()`.
- `Config.gs`
  - `getConfig_()` returns resolved config from properties (with defaults).
  - `ensureLabels_()` verifies action labels exist; creates if missing.
- `GmailService.gs`
  - `findUnprocessed_(max)`: search inbox excluding already-labeled threads.
  - `minimalize_(threads, bodyChars)`: extract last message essentials and compute `ageDays`.
- `RuleDocService.gs`
  - `getRuleText_(docId)`: unified Drive export to plain text (Docs and files).
- `PromptBuilder.gs`
  - `buildCategorizePrompt_(rulesText, emails, allowed, fallback)`: policy + emails + strict JSON schema.
- `LLMService.gs`
  - `enforceBudget_(nCalls)`: date-keyed call budget guard.
  - `categorizeBatch_(emails, rulesText, model)`: call Gemini, parse/repair JSON, retry policy.
- `Categorizer.gs`
  - `categorizeWithGemini_(emails, rulesText, cfg)`: batch loop, normalization and validation.
- `Organizer.gs`
  - `apply_(categorized, cfg)`: skip if already labeled; apply exactly one returned label.

---

## Data flow

1) Ensure labels exist.
2) Load rules text from Drive (`RULE_DOC_ID`).
3) Find inbox threads without any action label (up to `MAX_EMAILS_PER_RUN`).
4) Extract minimal fields for the last message of each thread; truncate body.
5) Batch emails and send to Gemini with rules text embedded as “Policy”.
6) Parse strict JSON results; normalize; fill any missing with `DEFAULT_FALLBACK_LABEL`.
7) Apply labels to corresponding threads; skip threads already labeled.
8) Log counts: candidates, labeled, skipped, fallbacks, errors.

---

## Rules document handling (Drive)

- Use a single function that always returns plain text:
  - First try `file.getAs(MimeType.PLAIN_TEXT)`, else fallback to `file.getBlob().getDataAsString('utf-8')`.
- The document content is included verbatim in the prompt as “Policy”.
- Optional (but recommended): include a fenced JSON block in the doc documenting allowed labels and fallback. If absent, code uses defaults.

---

## Example rules document (Markdown)

Use a Google Doc or Markdown file with the following content. The script will read it as plain text and embed it as the Policy for Gemini. You can edit this document at any time without changing the code.

# Email Triage Policy

This policy defines how to categorize inbox emails into exactly one of the allowed action labels. Follow these rules strictly.

## Allowed labels

- reply_needed: Requires a reply to someone.
- review: Requires thoughtful reading or consideration, but not an immediate reply or task creation.
- todo: Requires an action or task creation (follow up, complete a form, fix something, etc.).
- summarize: Informational only; include in a summary but no other action required.

## Precedence (if multiple could apply)

1. reply_needed
2. todo
3. review
4. summarize

Pick the highest-precedence label that applies.

## General directives

- Choose exactly one label from the Allowed labels list.
- Do not invent new labels.
- Use the full email content, including body and recent thread context (if available).
- If uncertain, choose the configured fallback (default: review).

## Decision rules

- Action words → todo or review:
  - Phrases like: "please", "required", "due", "review", "your order", "account notice", Google Workspace notifications.
  - If a concrete action is requested (submit, approve, fix, confirm, schedule), prefer todo.
- Time sensitivity → todo:
  - Mentions of urgency: "urgent", "asap", "deadline", explicit dates/times with required action.
- Question format / personal emails → reply_needed:
  - Emails directly asking you a question, or from known personal contacts requesting a response.
- Calendar keywords → review:
  - "meeting", "schedule", "invite", "proposal", unless the sender asks you to confirm/accept (then todo).
- Automated confirmations / notifications → summarize:
  - Receipts, order confirmations, automated updates, subscription notices, success/failure alerts without requested action.

## Special handling examples

- Receipts and invoices: usually summarize (for labeling). They can be archived later by other workflows.
- Newsletters and digests: summarize unless they explicitly ask for an action.
- GitHub/CI alerts: if purely informational → summarize; if they ask you to take an action → todo.
- Google Workspace admin/user notices: often todo if an action is requested; otherwise summarize.

## Output expectation (for implementers)

For each input email, return JSON with: id, required_action ∈ {reply_needed, review, todo, summarize}, and a short reason. Example schema is provided in the implementation plan.

## Examples

### reply_needed

- Subject: Can you review our note on Tuesday?
  Body: "Hi Gunnar, could you let me know if Tuesday 3pm works?"
  Label: reply_needed (a direct question requiring a response)

- Subject: Quick question about the RFP timeline
  Body: "What deadline are we targeting for submission?"
  Label: reply_needed (explicit question)

### todo

- Subject: Action required: Update your billing information
  Body: "Your payment method needs to be updated by Friday."
  Label: todo (explicit action with time sensitivity)

- Subject: Please approve the draft contract
  Body: "Open the link and approve by EOD."
  Label: todo (explicit approval request)

### review

- Subject: Meeting invite: Product roadmap discussion
  Body: "Please see the attached agenda and background."
  Label: review (requires thoughtful reading; no specific action requested)

- Subject: Proposal for team offsite
  Body: "Sharing a proposal for your consideration; feedback welcome."
  Label: review (consideration without a concrete call to action)

### summarize

- Subject: Your order has shipped
  Body: "We processed your order; tracking attached."
  Label: summarize (confirmation only)

- Subject: Weekly newsletter — Engineering updates
  Body: "Highlights from the week..."
  Label: summarize (newsletter/digest without action)

## Optional configuration block (metadata)

If desired, include this fenced JSON block to document allowed labels, fallback, and precedence. The script does not require it but will include the text in the Policy.

```json
{
  "allowed_labels": ["reply_needed", "review", "todo", "summarize"],
  "fallback": "review",
  "precedence": ["reply_needed", "todo", "review", "summarize"]
}
```

---

## Prompt and output schema

- Allowed labels: `reply_needed`, `review`, `todo`, `summarize`.
- Fallback: `DEFAULT_FALLBACK_LABEL` when uncertain or on hard errors.
- Output schema (JSON only, no extra text):

```json
{
  "emails": [
    {
      "id": "string",
      "required_action": "reply_needed|review|todo|summarize",
      "reason": "short rationale string"
    }
  ]
}
```

- Email inputs per item: `id`, `subject`, `from`, `date`, `age_days`, `body_excerpt` (truncated to BODY_CHARS).

---

## Gemini usage strategy

- Model: `gemini-1.5-flash` for primary categorization; on retry, optionally escalate to `gemini-1.5-pro` (configurable).
- Batch size: `BATCH_SIZE` (e.g., 10).
- Robust parsing:
  - Expect JSON-only. If text wraps JSON, extract first JSON object and re-parse.
  - Retry once on malformed output; on second failure, assign fallback.
- Budget guard:
  - Track calls per day in Properties; if `DAILY_GEMINI_BUDGET` exceeded, skip calls and assign fallback to all inputs.

---

## Orchestrator pseudocode

```javascript
function run() {
  const cfg = getConfig_();
  ensureLabels_(cfg);

  const rulesText = getRuleText_(cfg.RULE_DOC_ID);
  if (!rulesText) throw new Error('Unable to load rules document text.');

  const threads = findUnprocessed_(cfg.MAX_EMAILS_PER_RUN);
  if (!threads.length) return logSummary_({ candidates: 0 });

  const emails = minimalize_(threads, cfg.BODY_CHARS);
  const results = categorizeWithGemini_(emails, rulesText, cfg);

  const outcome = Organizer.apply_(results, cfg);
  logSummary_(outcome);
}
```

---

## Module stubs (Apps Script)

### Config and labels

```javascript
function getConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    GEMINI_API_KEY: p.getProperty('GEMINI_API_KEY'),
    RULE_DOC_ID: p.getProperty('RULE_DOC_ID'),
    DEFAULT_FALLBACK_LABEL: p.getProperty('DEFAULT_FALLBACK_LABEL') || 'review',
    MAX_EMAILS_PER_RUN: parseInt(p.getProperty('MAX_EMAILS_PER_RUN') || '20', 10),
    BATCH_SIZE: parseInt(p.getProperty('BATCH_SIZE') || '10', 10),
    BODY_CHARS: parseInt(p.getProperty('BODY_CHARS') || '1200', 10),
    DAILY_GEMINI_BUDGET: parseInt(p.getProperty('DAILY_GEMINI_BUDGET') || '50', 10),
    DRY_RUN: (p.getProperty('DRY_RUN') || 'false').toLowerCase() === 'true',
    MODEL_PRIMARY: 'gemini-1.5-flash',
    MODEL_ESCALATE: 'gemini-1.5-pro'
  };
}

function ensureLabels_() {
  ['reply_needed','review','todo','summarize'].forEach(name => {
    if (!GmailApp.getUserLabelByName(name)) GmailApp.createLabel(name);
  });
}
```

### Rule doc retrieval (unified)

```javascript
function getRuleText_(docId) {
  if (!docId) throw new Error('RULE_DOC_ID is not set.');
  const file = DriveApp.getFileById(docId);
  try {
    return file.getAs(MimeType.PLAIN_TEXT).getDataAsString('utf-8');
  } catch (e) {
    return file.getBlob().getDataAsString('utf-8');
  }
}
```

### Gmail search and minimal extraction

```javascript
function findUnprocessed_(max) {
  const q = 'in:inbox -label:reply_needed -label:review -label:todo -label:summarize';
  return GmailApp.search(q, 0, max);
}

function minimalize_(threads, bodyChars) {
  return threads.map(t => {
    const msg = t.getMessages().pop();
    const subj = msg.getSubject() || '';
    const from = msg.getFrom() || '';
    const date = msg.getDate();
    const days = Math.floor((Date.now() - date.getTime()) / (1000*60*60*24));
    const body = (msg.getPlainBody() || msg.getBody() || '').slice(0, bodyChars);
    return {
      id: msg.getId(),
      threadId: t.getId(),
      subject: subj,
      from: from,
      date: date.toISOString().slice(0,10),
      ageDays: days,
      plainBody: body
    };
  });
}
```

### Prompt builder

```javascript
function buildCategorizePrompt_(rulesText, emails, allowed, fallback) {
  const schema = JSON.stringify({
    emails: [{ id: 'string', required_action: allowed.join('|'), reason: 'string' }]
  }, null, 2);

  const items = emails.map(e => ({
    id: e.id,
    subject: e.subject || '',
    from: e.from || '',
    date: e.date || '',
    age_days: e.ageDays || 0,
    body_excerpt: (e.plainBody || '').slice(0, 1200)
  }));

  return [
    'You are an email triage assistant. Follow the Policy exactly.',
    'Policy:',
    rulesText,
    '',
    'Allowed labels: ' + allowed.join(', '),
    'If multiple labels could apply, follow the Policy’s precedence. If uncertain, choose: ' + fallback + '.',
    'Return ONLY valid JSON with this exact shape, no extra text:',
    schema,
    '',
    'Emails to categorize:',
    JSON.stringify(items, null, 2),
    '',
    'Return JSON for ALL items.'
  ].join('\n');
}
```

### Gemini call (batch with parsing and retry)

```javascript
function categorizeBatch_(emails, rulesText, model, apiKey, fallback) {
  const prompt = buildCategorizePrompt_(rulesText, emails, ['reply_needed','review','todo','summarize'], fallback);
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);
  const payload = { contents: [{ role: 'user', parts: [{ text: prompt }]}] };
  const opts = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };

  const parseOut = txt => {
    try {
      const first = extractFirstJson_(txt);
      return first && Array.isArray(first.emails) ? first.emails : null;
    } catch (e) { return null; }
  };

  let res = UrlFetchApp.fetch(url, opts);
  let txt = JSON.parse(res.getContentText()).candidates?.[0]?.content?.parts?.[0]?.text || '';
  let out = parseOut(txt);

  if (!out) {
    // Retry once (optional escalate)
    const model2 = model; // or escalate to cfg.MODEL_ESCALATE
    res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model2 + ':generateContent?key=' + encodeURIComponent(apiKey), opts);
    txt = JSON.parse(res.getContentText()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    out = parseOut(txt);
  }

  if (!out) {
    // Hard failure: fallback all
    return emails.map(e => ({ id: e.id, required_action: fallback, reason: 'fallback-on-error' }));
  }
  return out;
}

function extractFirstJson_(txt) {
  // Extract the first {...} JSON object
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  return JSON.parse(m[0]);
}
```

### Categorizer orchestration

```javascript
function categorizeWithGemini_(emails, rulesText, cfg) {
  const allowed = new Set(['reply_needed','review','todo','summarize']);
  const batches = [];
  for (let i = 0; i < emails.length; i += cfg.BATCH_SIZE) {
    batches.push(emails.slice(i, i + cfg.BATCH_SIZE));
  }

  const results = [];
  for (const batch of batches) {
    if (!enforceBudget_(1, cfg.DAILY_GEMINI_BUDGET)) {
      // Budget exceeded: assign fallback
      results.push(...batch.map(e => ({ id: e.id, required_action: cfg.DEFAULT_FALLBACK_LABEL, reason: 'budget-exceeded' })));
      continue;
    }
    const out = categorizeBatch_(batch, rulesText, cfg.MODEL_PRIMARY, cfg.GEMINI_API_KEY, cfg.DEFAULT_FALLBACK_LABEL);
    // Normalize and validate
    const byId = new Map(out.map(o => [o.id, o]));
    for (const e of batch) {
      const r = byId.get(e.id);
      const valid = r && allowed.has(r.required_action);
      results.push({
        id: e.id,
        threadId: e.threadId,
        required_action: valid ? r.required_action : cfg.DEFAULT_FALLBACK_LABEL,
        reason: valid ? (r.reason || 'ok') : 'invalid-or-missing'
      });
    }
  }
  return results;
}

function enforceBudget_(nCalls, dailyLimit) {
  const d = new Date();
  const key = 'BUDGET_' + d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  const props = PropertiesService.getScriptProperties();
  const cur = parseInt(props.getProperty(key) || '0', 10);
  if (cur + nCalls > dailyLimit) return false;
  props.setProperty(key, String(cur + nCalls));
  return true;
}
```

### Label application

```javascript
function applyLabel_(thread, labelName, dryRun) {
  const actionNames = ['reply_needed','review','todo','summarize'];
  const hasAny = thread.getLabels().some(l => actionNames.includes(l.getName()));
  if (hasAny) return 'skipped';
  if (dryRun) return 'would-label:' + labelName;
  const lbl = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
  thread.addLabel(lbl);
  return 'labeled';
}

const Organizer = {
  apply_: function(results, cfg) {
    let labeled = 0, skipped = 0, errors = 0;
    const byThread = new Map(); // prefer thread-level labeling
    results.forEach(r => byThread.set(r.threadId, r));

    for (const [threadId, r] of byThread.entries()) {
      try {
        const thread = GmailApp.getThreadById(threadId);
        const status = applyLabel_(thread, r.required_action, cfg.DRY_RUN);
        if (status === 'labeled') labeled++;
        else if (status === 'skipped' || status.startsWith('would-label')) skipped++;
      } catch (e) {
        errors++;
        console.log('Error labeling thread ' + threadId + ': ' + e);
      }
    }
    return { candidates: results.length, labeled, skipped, errors };
  }
};
```

### Orchestrator and trigger

```javascript
function run() {
  const cfg = getConfig_();
  if (!cfg.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');
  ensureLabels_();

  const rulesText = getRuleText_(cfg.RULE_DOC_ID);
  if (!rulesText) throw new Error('Rules doc is empty or unreadable.');

  const threads = findUnprocessed_(cfg.MAX_EMAILS_PER_RUN);
  if (!threads.length) return console.log('No candidates.');

  const emails = minimalize_(threads, cfg.BODY_CHARS);
  const results = categorizeWithGemini_(emails, rulesText, cfg);

  const summary = Organizer.apply_(results, cfg);
  console.log(JSON.stringify({ ...summary, dryRun: cfg.DRY_RUN }, null, 2));
}

function installTrigger() {
  deleteExistingTriggers_();
  ScriptApp.newTrigger('run').timeBased().everyHours(1).create();
}

function deleteExistingTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'run')
    .forEach(ScriptApp.deleteTrigger);
}
```

---

## Testing and rollout

1) Set Script Properties: `GEMINI_API_KEY`, `RULE_DOC_ID`; verify Drive read access.
2) Create a simple rules document with:
   - Clear policy text describing how to choose among the four labels.
   - Optionally include a fenced JSON snippet documenting allowed labels and precedence (not required).
3) Set `DRY_RUN=true`, run `run()` manually on a small inbox (limit 5). Inspect logs and outputs.
4) Turn `DRY_RUN=false`, run manually again.
5) Install the time-based trigger for hourly or every 15 minutes.
6) Monitor logs; adjust `MAX_EMAILS_PER_RUN`, `BATCH_SIZE`, `DAILY_GEMINI_BUDGET` as needed.

---

## Future extensions

- Drafting: create reply drafts for `reply_needed` with strict JSON drafting prompts.
- Slack notifications: post run summaries and errors.
- Advanced policy tooling: validate the rules doc structure (optional fenced JSON), include examples in prompt.
- Admin panel (Sheet-bound): property editor, counters, and logs dashboard.

---
