# Mail Screener — Gmail Labeler (Apps Script)

A time-based Google Apps Script that labels Gmail threads using Gemini (Vertex AI or Generative Language API), guided by a user-editable rules document from Google Drive. Managed with `clasp`.

## Features
- Four action labels: `reply_needed`, `review`, `todo`, `summarize` (auto-created)
- Policy-driven triage using a Drive document (or a built-in default policy)
- Vertex AI (OAuth) or Generative Language API (API key) support
- Budget guard, batching, dry-run, and robust JSON parsing/normalization

## Prereqs
- Node 18+, `@google/clasp` installed
- Google account with access to target Gmail
- For Vertex mode: access to a Google Cloud project with Vertex AI enabled

```bash
npm install -g @google/clasp
clasp login --no-localhost
```

## Project setup (first time)
```bash
cd /Users/gunnarhellekson/Code/mail-screener
clasp create --type standalone --title "Gmail Labeler (Mail Screener)" --rootDir ./src
# (already done in this repo)
```

Ensure `src/appsscript.json` includes:
- `runtimeVersion: V8`
- Scopes: gmail.modify, drive.readonly, script.external_request, script.scriptapp, cloud-platform

## Auth modes

### 1) Vertex AI (recommended in Workspace)
- Enable Vertex AI API on your Google Cloud project
- Link the Apps Script project to that Cloud project (Apps Script → Project Settings → Google Cloud Platform project)
- Set Script Properties:
  - `GOOGLE_CLOUD_PROJECT` = your project ID or numeric project number
  - `GOOGLE_CLOUD_LOCATION` = region like `us-central1`
  - Optional: `DEBUG=true` for verbose logs
- The script will use `ScriptApp.getOAuthToken()` to call Vertex:
  - Endpoint: `https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT/locations/LOCATION/publishers/google/models/gemini-1.5-flash:generateContent`

Required permissions on the project for your user:
- `roles/aiplatform.user`
- If you use project ID and see `resourcemanager.projects.get` errors, use the numeric project number or request basic `roles/viewer`.

### 2) Generative Language API (API key)
- Enable "Generative Language API" on a project
- Create an API key (APIs & Services → Credentials → Create credentials → API key)
- Set Script Property:
  - `GEMINI_API_KEY` = your key
- The script will use the key to call:
  - `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY`

Note: Some organizations block this API; prefer Vertex if AI Studio is disabled.

## Rules document
- Set one of the following Script Properties:
  - `RULE_DOC_URL` = full Google Doc/Drive URL (preferred)
  - `RULE_DOC_ID` = Drive file ID (legacy)
- The content is embedded into the prompt as the triage policy.
- If unset or unreadable, a built-in default policy is used.

## Other Script Properties
- `DEFAULT_FALLBACK_LABEL` (default `review`)
- `MAX_EMAILS_PER_RUN` (default `20`)
- `BATCH_SIZE` (default `10`)
- `BODY_CHARS` (default `1200`)
- `DAILY_GEMINI_BUDGET` (default `50`)
- `DRY_RUN` (`true`/`false`, default `false`)
- `DEBUG` (`true`/`false`, default `false`)

## First run
```bash
clasp push
clasp open
# In the editor, set Script Properties (Project Settings → Script properties)
# Run the function `run()` once to authorize scopes
```

If using Vertex:
- Ensure the Cloud project is correctly linked in Apps Script
- Use the numeric project number in `GOOGLE_CLOUD_PROJECT` if you lack resourcemanager.get

## Scheduling
- In the editor, run `installTrigger()` once to install hourly execution (adjust as needed)

## How it works
1. Ensures labels exist
2. Loads rules text from Drive (or default policy)
3. Queries inbox for threads without action labels (limit by `MAX_EMAILS_PER_RUN`)
4. Extracts the last message (subject/from/date/body excerpt)
5. Batches and sends to Gemini with the policy embedded
6. Parses JSON: for each email → `{ id, required_action, reason }`
7. Normalizes the label, falls back on errors, applies exactly one label per thread
8. Logs a summary

## Debugging
- Set `DEBUG=true`
- Logs include:
  - Request mode (Vertex vs API key), HTTP status, raw response
  - Raw LLM outputs for each batch
  - Normalized `required_action`
  - Per-thread applied label and reason

Common issues:
- Everything labeled `review`:
  - Check DEBUG logs to confirm LLM output values
  - Ensure policy text includes clear examples
  - Increase `BODY_CHARS` if needed, or add examples to your rules doc
- Permission errors with Vertex:
  - Use numeric project number in `GOOGLE_CLOUD_PROJECT`
  - Request `roles/aiplatform.user` and possibly project viewer

## Updating
- Make edits, then:
```bash
clasp push
```

## Versioning/deployments
```bash
clasp version "Stable v1"
# If you later expose web endpoints:
clasp deploy --description "v1 labeling"
```

## Uninstall / cleanup
- Delete time-based triggers via `deleteExistingTriggers_()` or the UI
- Remove Script Properties if needed
- Unlink GCP project from Apps Script if you’re done
