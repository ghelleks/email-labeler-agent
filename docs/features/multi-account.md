# Multi-Account Deployment

Manage multiple Gmail accounts (personal, work, etc.) from a single codebase. Deploy and maintain email automation across all your accounts with streamlined commands.

## What It Adds

Multi-account support enables you to:

- **Separate work and personal**: Keep work and personal email processing independent
- **Single codebase**: Manage all accounts from one development environment
- **Account-specific deployment**: Deploy to specific accounts or all at once
- **Independent configuration**: Each account has its own settings and API quotas
- **Streamlined workflows**: Simple commands for switching between accounts

## Why Use Multi-Account

**Use cases**:
- Personal Gmail + Work Google Workspace accounts
- Multiple personal accounts (main + side projects)
- Testing environment + production environment
- Family accounts with different needs

**Benefits**:
- No duplicate code to maintain
- Deploy updates to all accounts with one command
- Account-specific configurations (different rules, quotas)
- Better API quota management (separate limits per account)

## Prerequisites

Beyond the basic prerequisites, you'll need:

- **Multiple Google accounts** with Gmail access
- **Apps Script projects** for each account (we'll help you create these)
- **Basic understanding** of the [basic setup](../../README.md#setup-guide)

## Quick Start

### Step 1: Initial Multi-Account Configuration

#### Run the Account Setup Wizard

```bash
npm run setup:account
```

This interactive wizard will:
- Detect and offer to import your existing single-account setup
- Guide you through adding multiple accounts
- Create the `accounts.json` configuration file
- Set up account switching capabilities

#### Add Your Accounts

For each Gmail account you want to manage:

1. **Log into the Google account** in your browser
2. **Authenticate with clasp**:
   ```bash
   clasp --user personal login    # Replace 'personal' with your account name
   # OR for first-time users:
   clasp login --no-localhost
   ```
3. **Create a new Apps Script project** for that account:
   ```bash
   clasp create --type standalone --title "Email Agent - Personal" --rootDir ./src
   ```
4. **Note the Script ID** from the output (looks like: `1BxKMGtEE123abc456def789...`)
5. **Add to configuration** using the setup wizard or manually edit `accounts.json`

### Step 2: Configure Each Account

#### Authenticate and Create Project Files

```bash
# Authenticate each account (one-time setup)
clasp --user personal login
clasp --user work login

# Create project files for all accounts
npm run switch:create-project-files

# Deploy to specific accounts (includes code upload + web app + triggers)
npm run deploy:personal
npm run deploy:work
```

#### Configure Script Properties

Open each account's Apps Script editor:

```bash
npm run open:personal  # Opens personal account
npm run open:work      # Opens work account
```

In each account's Apps Script editor, add the same Script Properties as the single account setup:

| Property | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your API key for this account |
| `DRY_RUN` | Optional | `true` (recommended for initial testing) |
| `DEBUG` | Optional | `true` (helpful for troubleshooting) |

**Important**: Each Google account can use the **same Gemini API key**, OR you can create **separate API keys** for better quota isolation.

### Step 3: Test Multi-Account Setup

#### Validate Configuration

```bash
npm run validate:accounts
```

This checks that all accounts are properly configured and accessible.

#### Test Each Account

```bash
# Test personal account
npm run deploy:personal
npm run open:personal  # Test manually in Apps Script editor

# Test work account
npm run deploy:work
npm run open:work      # Test manually in Apps Script editor
```

#### Check Account Status

```bash
npm run switch:status  # Shows all account statuses
npm run status:all     # Shows status for all configured accounts
```

### Step 4: Deploy to All Accounts

```bash
npm run deploy:all    # Deploys to ALL configured accounts with confirmation
```

## Account Configuration Format

The system uses `accounts.json` to manage multiple Google Apps Script deployments:

```json
{
  "defaultAccount": "personal",
  "accounts": {
    "personal": {
      "scriptId": "1BxKMGtEE123abc456def789...",
      "description": "Personal Gmail Account",
      "webAppDeploymentId": "AKfycbxH3nXXSOQ1teErs4nA8uojO2AI_qVLIeVY8HLHkkBv"
    },
    "work": {
      "scriptId": "1CyLNHuFF456ghi789jkl012...",
      "description": "Red Hat",
      "webAppDeploymentId": "AKfycbx1L7phZrDzB699TRLDhSb5PCLbufYiGXcRU9ZPz2A"
    }
  }
}
```

**Fields**:
- **scriptId**: Apps Script project ID (57+ characters)
- **description**: Human-readable account name
- **webAppDeploymentId**: Automatically managed by deployment script (maintains consistent URLs)

**Security Note**: `accounts.json` contains only Script IDs, not API keys or sensitive data. Safe to commit to version control (but check your security requirements).

## Authentication Requirements

Each account requires separate authentication:

```bash
clasp --user personal login    # Log into personal account
clasp --user work login        # Log into work account
```

**Why separate authentication?**
- Each Google account has independent permissions
- Prevents accidental cross-account operations
- Maintains security boundaries

**Authentication tips**:
- Use `--no-localhost` flag if browser issues occur
- Re-authenticate if seeing "login required" errors
- Check authentication status with `npm run switch:status`

## Daily Workflow

### Account Status and Information

```bash
npm run switch:status      # Check all account statuses
npm run status:personal    # Check personal account status
npm run status:work        # Check work account status
```

### Account-Specific Operations

```bash
# Deploy changes to specific account (includes push + web app + triggers)
npm run deploy:personal
npm run deploy:work

# View logs from specific account
npm run logs:personal
npm run logs:work

# Open Apps Script editor
npm run open:personal
npm run open:work

# Get web app URLs
npm run url:personal
npm run url:work
```

### Bulk Operations

```bash
npm run status:all       # Check status of ALL accounts
npm run deploy:all       # Deploy to ALL accounts (with confirmation)
npm run url:all          # Get all web app URLs
```

## Available Commands Reference

### Account Setup and Management

```bash
# Initial Setup
npm run setup:account               # Interactive account configuration wizard
npm run switch:create-project-files # Create project files for all accounts
npm run validate:accounts           # Validate account configuration
npm run auth:help                   # Show authentication guidance

# Status and Information
npm run switch:status               # Show all account statuses
```

### Deployment Operations

```bash
# Core Deployment Commands (Push + Web App + Triggers)
npm run deploy:personal             # Complete deployment to personal account
npm run deploy:work                 # Complete deployment to work account
npm run deploy:all                  # Deploy to all configured accounts

# Monitoring and Logs
npm run logs:personal               # View execution logs from personal account
npm run logs:work                   # View execution logs from work account
npm run status:personal             # Check status of personal account
npm run status:work                 # Check status of work account

# Apps Script Editor Access
npm run open:personal               # Open Apps Script editor for personal account
npm run open:work                   # Open Apps Script editor for work account

# Web App URL Retrieval
npm run url:personal                # Get web app URL for personal account
npm run url:work                    # Get web app URL for work account
npm run url:all                     # Get web app URLs for all accounts
```

### Multi-Account Operations

```bash
# Batch Operations (All Accounts)
npm run status:all                  # Show status for all configured accounts
```

## Deployment Strategy

### Complete Deployment

Use `npm run deploy:[account]` for full system deployment:
- Pushes code with `--force` flag (prevents "skipping push" issues)
- Creates or updates web app deployment
- Maintains consistent web app URLs
- Attempts automated trigger installation
- Shows web app URL immediately

**When to use**:
- After code changes
- Setting up new account
- Major updates (model changes, new features)
- Regular maintenance deployments

### Deployment to All Accounts

```bash
npm run deploy:all
```

**What it does**:
- Prompts for confirmation before deploying
- Deploys to each configured account sequentially
- Shows progress and results for each account
- Maintains separate web app URLs per account

**When to use**:
- Batch updates to core functionality
- Deploying new features across all accounts
- Regular updates when managing multiple accounts

### Smart Web App Deployment

The deployment script:
- Maintains consistent URLs by redeploying to existing deployments
- Stores `webAppDeploymentId` in `accounts.json`
- Creates new deployments only when necessary
- Shows URL after each deployment for bookmarking

## Tips and Best Practices

### Security Considerations

**API Keys**:
- Each account can use the same API key OR separate keys for quota isolation
- Separate keys recommended for work vs personal (better quota tracking)
- Same key acceptable for personal accounts (simpler management)

**Permissions**:
- Each Apps Script project has independent permissions
- Work account only accesses work Gmail
- Personal account only accesses personal Gmail

**Access Control**:
- Use work Google accounts for work email
- Use personal accounts for personal email
- Never mix credentials across account boundaries

### Deployment Strategy

**All changes**: Use `npm run deploy:[account]` for complete deployment
- Includes `--force` push to prevent skipping
- Ensures web app and triggers are updated
- Shows web app URL for verification

**Production**: Use `npm run deploy:[account]` for stable releases
- Maintains consistent web app URLs
- Creates versioned deployments
- Safe for regular use

**Bulk Updates**: Use `npm run deploy:all` when updating core functionality
- Deploys to all accounts at once
- Prompts for confirmation before proceeding
- Shows progress for each account

### Configuration Management

**Same configuration across accounts**:
- Use same `GEMINI_API_KEY` (simpler)
- Use same batch sizes and limits
- Use same classification rules

**Different configuration per account**:
- Different `SUMMARIZER_DESTINATION_EMAIL` per account
- Different `MAX_EMAILS_PER_RUN` (work might process more)
- Different `RULE_DOC_URL` (work-specific vs personal rules)

**Best practice**:
- Start with same configuration everywhere
- Adjust per-account as needs diverge
- Document differences in account descriptions

## Troubleshooting

### Multi-account commands not working

**Solution**: Run `npm run setup:account` to create initial configuration

**Solution**: Ensure you have the latest project version with multi-account support

**Solution**: Update `package.json` if missing multi-account scripts

### `accounts.json not found` error

**Solution**: Run `npm run setup:account` to create the configuration file

**Solution**: Check that you're running commands from the project root directory

**Solution**: Create `accounts.json` manually using the format above

### Wrong account project file is being used

**Solution**: Check account statuses with `npm run switch:status`

**Solution**: Ensure you're using account-specific commands: `npm run [command]:[account]`

**Solution**: Verify `.clasp.json.[account]` files exist with correct Script IDs

### Script ID errors in multi-account setup

**Solution**: Verify Script IDs in `accounts.json` are correct (57+ characters)

**Solution**: Get Script ID from Apps Script URL: `script.google.com/.../SCRIPT_ID/edit`

**Solution**: Re-create Apps Script project if Script ID is invalid

### `clasp login` required for each account

**Solution**: This is normal - each Google account needs separate authorization

**Solution**: Run `clasp --user [account] login` and authorize each account you want to use

**Solution**: Use `clasp --user [account] login --no-localhost` if having browser issues

### Account-specific commands fail

**Solution**: Run `npm run validate:accounts` to check configuration

**Solution**: Ensure all Script IDs in `accounts.json` are valid

**Solution**: Run `npm run switch:create-project-files` to recreate project files

### Trigger installation fails

**Solution**: Install triggers manually in Apps Script editor using `installTrigger` function

**Solution**: For Email Summarizer, use `installSummarizerTrigger` function

**Solution**: Automated `clasp run` trigger installation is unreliable due to permissions

### Authentication issues with specific account

**Solution**: Check authentication status with `npm run switch:status`

**Solution**: Re-authenticate problematic account: `clasp --user [account] login`

**Solution**: Clear browser cookies and re-authorize

### Deployment fails for specific account

**Solution**: Check that Script ID is correct in `accounts.json`

**Solution**: Verify authentication: `npm run switch:status`

**Solution**: Try manual deployment via Apps Script editor

**Solution**: Check execution logs: `npm run logs:[account]`

## Migrating from Single Account

If you already have a working single-account setup:

### Migration Steps

1. **Backup**: Your existing `.clasp.json` will be preserved
2. **Run Setup**: `npm run setup:account` will offer to import your current setup
3. **Add More Accounts**: Use the wizard to add additional accounts
4. **Gradual Migration**: You can use both old commands (`npm run deploy`) and new commands (`npm run deploy:personal`) simultaneously
5. **Switch When Ready**: Once comfortable, use multi-account commands exclusively

### Compatibility

- Existing setup continues to work throughout the migration process
- Old commands still function if single `.clasp.json` exists
- New multi-account commands work alongside old commands
- No data loss or disruption during migration

### Best Practice

1. Start by importing existing single account
2. Test multi-account commands with existing account
3. Add second account once comfortable
4. Gradually adopt multi-account workflow

## Architecture Decisions

- [ADR-009: Deployment Automation](../../docs/adr/009-deployment-automation.md)

## See Also

- [Back to README](../../README.md)
- [Configuration Reference](../guides/configuration.md) - Per-account configuration
- [Web App Dashboard](web-app.md) - Get URLs for each account
- [Email Summarizer Agent](../agents/email-summarizer.md) - Works independently per account
- [Troubleshooting Guide](../guides/troubleshooting.md) - General troubleshooting
