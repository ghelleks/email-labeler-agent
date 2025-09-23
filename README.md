# Mail Screener — Gmail Labeler (Apps Script)

A simple Google Apps Script that labels Gmail threads using Gemini (Generative Language API with an API key). You can guide it with a rules document in Google Drive. Managed with `clasp`.

## What it does
- Creates and uses four labels: `reply_needed`, `review`, `todo`, `summarize`
- Reads your triage rules from a Google Doc (optional; ships with a sensible default)
- Processes recent threads in batches and applies exactly one action label per thread

## What you need
- Node 18+ and `@google/clasp`
- A Google account that can access the target Gmail account
- A Gemini API key (Generative Language API)

```bash
npm install -g @google/clasp
clasp login --no-localhost
```

## Get an API key (one-time)
1. In Google Cloud Console, enable "Generative Language API" on any project.
2. Create an API key: APIs & Services → Credentials → Create credentials → API key.
3. Copy the key. You will paste it into Script Properties as `GEMINI_API_KEY`.

## Set up the project (first time)
```bash
cd /Users/gunnarhellekson/Code/email-labeler-agent
clasp create --type standalone --title "Gmail Labeler (Mail Screener)" --rootDir ./src
```

1. Push and open the Apps Script project:
   ```bash
   clasp push
   clasp open-script
   ```
2. In the Apps Script editor, set Script Properties (Project Settings → Script properties):
   - `GEMINI_API_KEY` = your API key
   - `RULE_DOC_URL` = optional Google Doc/Drive URL with your labeling rules
   - Optional: `DRY_RUN=true` to preview without applying labels
   - Optional: `DEBUG=true` for verbose logs
3. In the editor, run the function `run()` once to authorize.

## Schedule it (optional)
- In the editor, run `installTrigger()` to install an hourly trigger (adjust later if you like).

## Configuration (optional; defaults shown)
- `DEFAULT_FALLBACK_LABEL` = `review`
- `MAX_EMAILS_PER_RUN` = `20`
- `BATCH_SIZE` = `10`
- `BODY_CHARS` = `1200`
- `DAILY_GEMINI_BUDGET` = `50`
- `DRY_RUN` = `false`
- `DEBUG` = `false`

You do not need to change models; it uses `gemini-1.5-flash` by default.

## How it works (in short)
1. Ensures labels exist.
2. Loads your rules from Drive (or uses the built-in default).
3. Finds recent threads that don’t already have an action label.
4. Sends batched summaries to Gemini with your rules embedded.
5. Parses the model’s JSON and applies one action label per thread.

## Troubleshooting
- Everything becomes `review`:
  - Add clearer examples to your rules doc.
  - Increase `BODY_CHARS` to give the model more context.
- API key errors:
  - Make sure "Generative Language API" is enabled and the key is valid.
  - If your organization blocks API keys, contact your admin.
- See logs: set `DEBUG=true` in Script Properties.

## Update the script
```bash
clasp push
```

## Uninstall / cleanup
- Remove time-based triggers via `deleteExistingTriggers_()` or the Apps Script UI.
- Delete Script Properties if you’re done.
