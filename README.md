# Gmail Labeler — Automated Email Triage with AI

An intelligent Google Apps Script that automatically organizes your Gmail inbox by analyzing emails with Google's Gemini AI and applying helpful labels. Perfect for busy professionals who want to stay on top of their email without manual sorting.

## What This Does

This system automatically reads your incoming Gmail and sorts it into four actionable categories:

- **`reply_needed`** — Emails requiring your personal response (questions, meeting requests, urgent items)
- **`review`** — Emails to read but no immediate response needed (updates, newsletters, FYI messages)
- **`todo`** — Emails representing tasks or action items (assignments, deadlines, follow-ups)
- **`summarize`** — Long emails or threads that benefit from AI summarization

**Example**: A meeting invitation gets labeled `reply_needed`, while a weekly newsletter gets labeled `review`.

## Quick Start Summary

**New to this?** Here's what you'll accomplish:

✅ **Main Goal**: Set up automatic email labeling that runs in Google's cloud
✅ **Time Required**: 5-10 minutes for basic setup
✅ **Technical Level**: Beginner-friendly with step-by-step instructions
✅ **What You'll Get**: Your Gmail automatically organized into 4 helpful categories

**Ready?** Follow the setup guide below. You can stop after the basic setup and add advanced features anytime.

## Prerequisites

Before you start, make sure you have:

- **A Google account** with Gmail access (the account you want to organize)
- **Node.js 18 or higher** (we'll install this using Homebrew below)
- **Basic command line familiarity** (don't worry, we'll guide you through each step)
- **5-10 minutes** for initial setup

**No prior Google Apps Script experience required!** This guide assumes you're starting from scratch.

### Install Node.js using Homebrew

If you don't have Node.js installed, we'll use Homebrew (the best package manager for Mac):

1. **Install Homebrew** (if you don't have it):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js**:
   ```bash
   brew install node
   ```

3. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

**Why use Homebrew?** It makes installing and updating development tools much easier than downloading individual installers. Homebrew manages dependencies and keeps everything organized.

## What is Google Apps Script?

Google Apps Script is Google's cloud-based JavaScript platform that lets you automate Google services like Gmail, Drive, and Sheets. Think of it as a way to create custom mini-programs that run in Google's cloud and can access your Google services automatically.

**Why use Apps Script for this project?**
- **No server needed**: Your script runs in Google's cloud, not on your computer
- **Built-in Gmail access**: No complex authentication setup required
- **Free to run**: Google provides generous free quotas for personal use
- **Automatic scheduling**: Can run on its own without your computer being on

## Setup Guide

### Step 1: Install Required Tools

First, install Google's command-line tool for managing Apps Script projects:

```bash
npm install -g @google/clasp
```

**Why this step is necessary**: `clasp` (Command Line Apps Script Projects) lets you work with Apps Script code locally on your computer and upload it to Google's servers.

Next, log in to your Google account:

```bash
clasp login --no-localhost
```

**Why this step is necessary**: This connects `clasp` to your Google account so it can create and manage Apps Script projects for you.

### Step 2: Get a Gemini API Key (One-time Setup)

The system uses Google's Gemini AI to analyze your emails. You need an API key to access it:

#### 2a. Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top (next to "Google Cloud")
3. Click "New Project" (or select an existing one if you prefer)
4. Enter a project name like "Gmail Labeler" → Click "Create"
5. Wait for the project to be created (usually 10-30 seconds)

**Why this step is necessary**: Google Cloud projects organize your API usage and billing. Even though this is free, Google requires a project container.

#### 2b. Enable the Generative Language API

1. In the Google Cloud Console, use the search bar at the top
2. Type "Generative Language API" and click on it
3. Click the blue "Enable" button
4. Wait for it to enable (usually a few seconds)

**Why this step is necessary**: This gives your project permission to use Google's Gemini AI models.

#### 2c. Create an API Key

1. In the left sidebar, click "APIs & Services" → "Credentials"
2. Click the blue "Create credentials" button → "API key"
3. Copy the API key that appears (it looks like: `AIzaSyC-abc123def456...`)
4. **Important**: Store this key securely — you'll need it in the next step

**Optional but recommended**: Click "Restrict key" to improve security, then select "Generative Language API" under "API restrictions".

### Step 3: Set Up the Apps Script Project

#### 3a. Download and Create the Project

1. Download or clone this repository to your computer
2. Open your terminal/command prompt and navigate to the project folder:
   ```bash
   cd /path/to/your/download/email-agent
   ```
3. Create the Apps Script project:
   ```bash
   npm run create
   ```

**Why this step is necessary**: This creates a new Apps Script project in your Google account and links it to the code on your computer.

#### 3b. Upload the Code

Upload your code to Google's servers:

```bash
npm run push
```

**Why this step is necessary**: This copies your local code files to the Apps Script project in Google's cloud where they can run.

#### 3c. Open and Configure the Project

Open the Apps Script editor in your browser:

```bash
npm run open
```

This will open the Google Apps Script editor. You'll see your code files listed on the left.

### Step 4: Configure Your Settings

In the Apps Script editor, configure your project:

1. **Click "Project Settings" in the left sidebar**
2. **Scroll down to "Script properties"**
3. **Click "Add script property" and add these settings**:

   | Property Name | Value | Purpose |
   |---------------|-------|---------|
   | `GEMINI_API_KEY` | Your API key from Step 2 | Connects to Gemini AI |
   | `DRY_RUN` | `true` | Test mode (optional, recommended for first run) |
   | `DEBUG` | `true` | Verbose logging (optional, helpful for troubleshooting) |

**Why this step is necessary**: Script Properties are like settings that tell your script how to behave. They're stored securely in Google's cloud.

### Step 5: Test Your Setup

#### 5a. Authorize the Script

1. In the Apps Script editor, click on "Code.gs" in the file list
2. Make sure "run" is selected in the function dropdown at the top
3. Click the "Run" button (▶️)
4. **You'll see authorization prompts** — click "Review permissions"
5. Choose your Google account
6. Click "Advanced" → "Go to Gmail Labeler (unsafe)" → "Allow"

**Why this step is necessary**: Google needs your permission to let the script access your Gmail. This is a one-time authorization.

**What you're authorizing**: The script to read your email, create labels, and modify labels on your emails.

#### 5b. Check the Results

1. Look at the "Execution log" at the bottom of the Apps Script editor
2. You should see messages like "No candidates" or "Processing X threads"
3. Check your Gmail — you should see new labels created: `reply_needed`, `review`, `todo`, `summarize`

If you set `DRY_RUN=true`, the script will analyze emails but won't apply labels yet (recommended for testing).

## Understanding Your Results

After running the script:

- **`reply_needed`**: Check these emails first — they need your response
- **`review`**: Read when you have time — informational content
- **`todo`**: Action items and tasks to add to your task list
- **`summarize`**: Long emails that benefit from AI summarization

Each email gets exactly one label to keep things simple and clear.

## 🎉 Congratulations!

You now have automated email labeling set up! Your Gmail will automatically organize new emails into helpful categories. You can run the script manually anytime by clicking "Run" in the Apps Script editor.

**Ready for more?** The following advanced features are completely optional. Each can be added independently:

- ✨ **Automatic Scheduling**: Run every hour without your intervention
- 📨 **Email Summarizer Agent**: Daily automated email summaries
- 📱 **Interactive Web App**: On-demand summarization from your phone
- 🔄 **Multi-Account Setup**: Manage multiple Gmail accounts
- 🎯 **Custom Classification Rules**: Fine-tune categorization logic

## Advanced Features (Optional)

The core email labeling system is now complete! The following features are optional add-ons that extend the system's capabilities. Each section is self-contained — you can enable any combination that suits your needs.

---

## 1. Automatic Scheduling

**What it adds**: Your script runs automatically every hour without your computer being on.

**Why you might want this**: Set it and forget it — your emails get organized continuously without manual intervention.

### Setup Instructions

To have the script run automatically every hour:

1. In the Apps Script editor, select "installTrigger" from the function dropdown
2. Click the "Run" button (▶️)
3. Grant necessary permissions when prompted
4. Check the "Triggers" section in the left sidebar to confirm it was created

**Note**: You can run the script manually anytime, but triggers make it truly automatic.

---

## 2. Email Summarizer Agent

**What it adds**: Automatic daily summaries of emails labeled with `summarize`.

**Why you might want this**: Perfect for processing newsletters, long email threads, or multiple related emails into digestible summaries delivered to your inbox.

### How the Email Summarizer Works

The **Email Summarizer** is an intelligent agent that:

- **Archives immediately** when you apply the `summarize` label (configurable, enabled by default)
- **Retrieves** emails with the `summarize` label from the past 7 days
- **Generates** Economist-style summaries using AI
- **Delivers** formatted HTML summaries via email with hyperlinks and source references
- **Relabels** processed emails as `summarized` and archives them (if not already archived)
- **Runs** on configurable daily triggers (default: 5 AM)

This agent operates independently and requires no manual intervention once configured. By default, emails are archived immediately when you apply the `summarize` label, keeping your inbox clean while the scheduled summarization process finds them via the label.

### Email Summarizer Setup

**Prerequisites**: Complete the basic email labeling setup first.

1. **Install the summarizer trigger**:
   - In the Apps Script editor, select "installSummarizerTrigger" from the function dropdown
   - Click the "Run" button (▶️) to install the daily trigger
   - The Email Summarizer will run daily at 5 AM

2. **Start using it**:
   - Apply the `summarize` label to emails in Gmail
   - Wait for the next daily run (or test manually by running `runSummarizerAgent` in the editor)
   - Receive summary emails in your inbox

### Email Summarizer Configuration

Customize the summarizer with these Script Properties:

| Setting | Default | Description |
|---------|---------|-------------|
| `SUMMARIZER_ENABLED` | `true` | Enable/disable the Email Summarizer agent |
| `SUMMARIZER_MAX_AGE_DAYS` | `7` | Maximum age of emails to include in summaries |
| `SUMMARIZER_MAX_EMAILS_PER_SUMMARY` | `50` | Maximum emails to process per summary |
| `SUMMARIZER_DESTINATION_EMAIL` | Your email | Email address to receive summaries |
| `SUMMARIZER_ARCHIVE_ON_LABEL` | `true` | Archive emails immediately when `summarize` label is applied |
| `SUMMARIZER_DEBUG` | `false` | Enable detailed logging for the agent |
| `SUMMARIZER_DRY_RUN` | `false` | Test mode for the agent |

### Email Summarizer Troubleshooting

**🔍 Problem**: Email Summarizer not running automatically
- **Solution**: Install the summarizer trigger by running `installSummarizerTrigger` in Apps Script editor
- **Solution**: Check the "Triggers" section to verify the daily trigger exists
- **Solution**: Verify `SUMMARIZER_ENABLED=true` in Script Properties

**🔍 Problem**: No summary emails being received
- **Solution**: Check that you have emails with the `summarize` label from the past 7 days
- **Solution**: Verify `SUMMARIZER_DESTINATION_EMAIL` is set to your correct email address
- **Solution**: Check Gmail spam folder for summary emails

**🔍 Problem**: Email Summarizer times out or fails
- **Solution**: Reduce `SUMMARIZER_MAX_EMAILS_PER_SUMMARY` to a smaller number (try `25`)
- **Solution**: Check that `DAILY_GEMINI_BUDGET` hasn't been exceeded
- **Solution**: Enable `SUMMARIZER_DEBUG=true` and check execution logs

---

## 3. Interactive Web App Dashboard

**What it adds**: A mobile-optimized web interface for on-demand email summarization and archiving.

**Why you might want this**: Perfect for processing emails on-the-go from your phone, getting quick summaries of accumulated emails, or archiving processed emails with one tap.

### Web App Features

- **Works on phones and computers**: Touch-optimized interface for any device
- **AI Summarization**: Get short summaries of long emails in newspaper style
- **Email Count Accuracy**: Know exactly what will be archived before you confirm
- **Source Email Links**: Direct links back to your Gmail threads
- **Web Link Extraction**: Automatically finds and displays URLs from emails
- **Dark Mode Support**: Automatically adapts to your device preferences

### Web App Setup

**Prerequisites**: Complete the basic email labeling setup first.

#### Quick Setup (Automated)
```bash
npm run deploy:personal   # or deploy:work if using multi-account
```

This command will:
1. Upload your latest code to Apps Script
2. Create or update the web app deployment maintaining consistent URLs
3. Install triggers and **automatically display your web app URL** for bookmarking

#### Manual Setup Alternative
1. In the Apps Script editor, click "Deploy" → "New deployment"
2. Choose type: "Web app", Execute as: "Me", Access: "Only myself"
3. Click "Deploy" and copy the web app URL
4. Bookmark the URL for easy access

#### Getting Your Web App URL Anytime
```bash
npm run url:personal    # Get personal account web app URL
npm run url:work        # Get work account web app URL (multi-account)
npm run url:all         # Get all web app URLs (multi-account)
```

### How to Use the Web App

1. **Label emails for summarization**: Apply the `summarize` label to emails in Gmail
2. **Open the web dashboard**: Visit your web app URL
3. **Get Summary**: Tap "Get Summary" to process all emails with the `summarize` label
4. **Review the summary**: Read the AI-generated consolidated summary with source links
5. **Archive emails**: Tap "Archive X Emails" to remove labels and archive the processed emails

**Pro Tip**: The web app is perfect for processing newsletters, long email threads, or multiple related emails at once.

### Web App Configuration

Customize the web app with these Script Properties:

| Setting | Default | Description |
|---------|---------|-------------|
| `WEBAPP_ENABLED` | `true` | Enable/disable web app functionality |
| `WEBAPP_MAX_EMAILS_PER_SUMMARY` | `50` | Maximum emails to process in web app per summary |

### Web App Troubleshooting

**🔍 Problem**: Web app shows "Web app functionality is disabled"
- **Solution**: Set `WEBAPP_ENABLED=true` in Script Properties
- **Solution**: Redeploy the web app if the setting was changed after deployment

**🔍 Problem**: "No emails found with 'summarize' label"
- **Solution**: Apply the `summarize` label to some emails in Gmail first
- **Solution**: Verify the label exists and is spelled correctly (all lowercase)

**🔍 Problem**: Web app times out during summarization
- **Solution**: Reduce `WEBAPP_MAX_EMAILS_PER_SUMMARY` to a smaller number (try `10`)
- **Solution**: Check that `DAILY_GEMINI_BUDGET` hasn't been exceeded

**🔍 Problem**: Archive button doesn't work
- **Solution**: Ensure you've generated a summary first before trying to archive
- **Solution**: Check that emails still have the `summarize` label applied

**🔍 Problem**: Web app URL not working
- **Solution**: Redeploy the web app and get a new URL
- **Solution**: Check that deployment type is set to "Web app" not "API executable"

---

## 4. Multi-Account Setup

**What it adds**: Manage multiple Gmail accounts (personal, work, etc.) from one codebase.

**Why you might want this**: Keep work and personal email processing separate while managing both from a single development environment.

### Prerequisites for Multi-Account

Beyond the basic prerequisites, you'll need:
- **Multiple Google accounts** with Gmail access
- **Apps Script projects** for each account (we'll help you create these)
- **Basic understanding** of Google Apps Script project IDs

### Step 1: Initial Multi-Account Configuration

#### 1a. Run the Account Setup Wizard

```bash
npm run setup:account
```

This interactive wizard will:
- Detect and offer to import your existing single-account setup
- Guide you through adding multiple accounts
- Create the `accounts.json` configuration file
- Set up account switching capabilities

#### 1b. Add Your Accounts

For each Gmail account you want to manage:

1. **Log into the Google account** in your browser
2. **Create a new Apps Script project** for that account:
   ```bash
   clasp login  # Login to the specific Google account
   clasp create --type standalone --title "Email Agent - [Account Name]" --rootDir ./src
   ```
3. **Note the Script ID** from the output (looks like: `1BxKMGtEE123abc456def789...`)
4. **Add to configuration** using the setup wizard

**Example Multi-Account Configuration:**
```json
{
  "defaultAccount": "personal",
  "accounts": {
    "personal": {
      "scriptId": "1BxKMGtEE123abc456def789...",
      "description": "Personal Gmail account"
    },
    "work": {
      "scriptId": "1CyLNHuFF456ghi789jkl012...",
      "description": "Work Gmail account"
    }
  }
}
```

### Step 2: Configure Each Account

For each account in your configuration:

#### 2a. Authenticate and Create Project Files
```bash
# Authenticate each account
clasp --user personal login
clasp --user work login

# Create project files for all accounts
npm run switch:create-project-files

# Deploy to specific account (includes code upload + web app + triggers)
npm run deploy:personal
npm run deploy:work

# Open Apps Script editor for configuration
npm run open:personal  # Opens personal account
npm run open:work      # Opens work account
```

#### 2b. Configure Script Properties

In each account's Apps Script editor, add the same Script Properties as the single account setup:
- `GEMINI_API_KEY`: Your API key for this account
- `DRY_RUN`: `true` (recommended for initial testing)
- `DEBUG`: `true` (helpful for troubleshooting)

**Important**: Each Google account can use the same Gemini API key, OR you can create separate API keys for better quota isolation.

### Step 3: Test Multi-Account Setup

#### 3a. Validate Configuration
```bash
npm run validate:accounts
```

This checks that all accounts are properly configured and accessible.

#### 3b. Test Each Account
```bash
# Test personal account
npm run deploy:personal
npm run open:personal  # Test manually in Apps Script editor

# Test work account
npm run deploy:work
npm run open:work      # Test manually in Apps Script editor
```

#### 3c. Check Account Status
```bash
npm run switch:status  # Shows all account statuses
npm run status:all     # Shows status for all configured accounts
```

### Step 4: Deploy to All Accounts

#### 4a. Deploy to Specific Account
```bash
npm run deploy:personal   # Complete deployment (code + web app + triggers)
npm run deploy:work       # Complete deployment (code + web app + triggers)
```

#### 4b. Deploy to All Accounts at Once
```bash
npm run deploy:all        # Deploys to ALL configured accounts with confirmation
```

### Multi-Account Daily Workflow

#### Account Status and Information
```bash
npm run switch:status      # Check all account statuses
npm run status:personal    # Check personal account status
npm run status:work        # Check work account status
```

#### Account-Specific Operations
```bash
# Deploy changes to specific account (includes push + web app + triggers)
npm run deploy:personal
npm run deploy:work

# View logs from specific account
npm run logs:personal
npm run logs:work
```

#### Bulk Operations
```bash
npm run status:all       # Check status of ALL accounts
npm run deploy:all       # Deploy to ALL accounts (with confirmation)
```

### Multi-Account Tips and Best Practices

#### 🔒 Security Considerations
- **API Keys**: Each account can use the same API key OR separate keys for quota isolation
- **Permissions**: Each Apps Script project has independent permissions
- **Access Control**: Use work Google accounts for work email, personal for personal

#### 🚀 Deployment Strategy
- **All changes**: Use `npm run deploy:[account]` for complete deployment (includes --force push to prevent skipping)
- **Production**: Use `npm run deploy:[account]` for stable releases with consistent web app URLs
- **Bulk Updates**: Use `npm run deploy:all` when updating core functionality across all accounts

#### 🔧 Troubleshooting Multi-Account
- **Wrong Account Active**: Check with `npm run switch:status`
- **Login Issues**: Each account needs separate `clasp login` authorization
- **Configuration Errors**: Run `npm run validate:accounts` to check setup

### Migrating from Single Account

If you already have a working single-account setup:

1. **Backup**: Your existing `.clasp.json` will be preserved
2. **Run Setup**: `npm run setup:account` will offer to import your current setup
3. **Add More Accounts**: Use the wizard to add additional accounts
4. **Gradual Migration**: You can use both old commands (`npm run deploy`) and new commands (`npm run deploy:personal`) simultaneously
5. **Switch When Ready**: Once comfortable, use multi-account commands exclusively

Your existing setup continues to work throughout the migration process.

## Understanding Your Results

After running the script:

- **`reply_needed`**: Check these emails first — they need your response
- **`review`**: Read when you have time — informational content
- **`todo`**: Action items and tasks to add to your task list
- **`summarize`**: Long emails that will be automatically processed by the Email Summarizer agent
- **`summarized`**: Emails that have been processed and summarized by the Email Summarizer agent

Each email gets exactly one label to keep things simple and clear.


### Customization (Advanced)

You can customize how emails are categorized by creating a rules document:

1. Create a new Google Doc with your classification rules
2. Get the document's URL (share link)
3. Add `RULE_DOC_URL` to your Script Properties with this URL

**Important**: If you configure a rules document, it must be accessible to the Apps Script project. The script will fail with a clear error message if the document cannot be read, rather than silently falling back to defaults.

The system includes sensible defaults, so this is completely optional.

## Useful Commands

Once set up, these commands help you manage your project:

### Available Commands

**Note**: This project uses a multi-account system. The commands below reflect the current npm script structure.

#### Account Setup and Management
```bash
# Initial Setup
npm run setup:account               # Interactive account configuration wizard
npm run switch:create-project-files  # Create project files for all accounts
npm run validate:accounts           # Validate account configuration
npm run auth:help                   # Show authentication guidance

# Status and Information
npm run switch:status               # Show all account statuses
```

#### Deployment Operations (Streamlined)
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
```

#### Multi-Account Operations
```bash
# Batch Operations (All Accounts)
npm run status:all                  # Show status for all configured accounts
```

## Troubleshooting

### Common Issues and Solutions

**🔍 Problem**: Everything gets labeled as `review`
- **Solution**: Your emails might not have enough context. Try increasing `BODY_CHARS` to `2000` in Script Properties
- **Solution**: Create a custom rules document with clearer examples

**🔍 Problem**: "API key invalid" errors
- **Solution**: Double-check your API key in Script Properties
- **Solution**: Verify "Generative Language API" is enabled in Google Cloud Console
- **Solution**: If in a work organization, check with your IT admin about API restrictions

**🔍 Problem**: "Authorization required" messages
- **Solution**: Re-run the authorization process from Step 5a
- **Solution**: Check that you've granted all necessary permissions

**🔍 Problem**: Script times out or runs slowly
- **Solution**: Reduce `BATCH_SIZE` to `5` in Script Properties
- **Solution**: Reduce `MAX_EMAILS_PER_RUN` to `10` in Script Properties

**🔍 Problem**: No emails being processed
- **Solution**: Check that you have recent emails without existing labels
- **Solution**: Set `DEBUG=true` and check the execution logs

### Email Summarizer Troubleshooting

**🔍 Problem**: Email Summarizer not running automatically
- **Solution**: Install the summarizer trigger by running `installSummarizerTrigger` in Apps Script editor
- **Solution**: Check the "Triggers" section to verify the daily trigger exists
- **Solution**: Verify `SUMMARIZER_ENABLED=true` in Script Properties

**🔍 Problem**: No summary emails being received
- **Solution**: Check that you have emails with the `summarize` label from the past 7 days
- **Solution**: Verify `SUMMARIZER_DESTINATION_EMAIL` is set to your correct email address
- **Solution**: Check Gmail spam folder for summary emails

**🔍 Problem**: Email Summarizer times out or fails
- **Solution**: Reduce `SUMMARIZER_MAX_EMAILS_PER_SUMMARY` to a smaller number (try `25`)
- **Solution**: Check that `DAILY_GEMINI_BUDGET` hasn't been exceeded
- **Solution**: Enable `SUMMARIZER_DEBUG=true` and check execution logs

### Multi-Account Troubleshooting

**🔍 Problem**: Multi-account commands not working
- **Solution**: Run `npm run setup:account` to create initial configuration
- **Solution**: Ensure you have the latest project version with multi-account support

**🔍 Problem**: `accounts.json not found` error
- **Solution**: Run `npm run setup:account` to create the configuration file
- **Solution**: Check that you're running commands from the project root directory

**🔍 Problem**: Wrong account project file is being used
- **Solution**: Check account statuses with `npm run switch:status`
- **Solution**: Ensure you're using account-specific commands: `npm run [command]:[account]`
- **Solution**: Verify `.clasp.json.[account]` files exist with correct Script IDs

**🔍 Problem**: Script ID errors in multi-account setup
- **Solution**: Verify Script IDs in `accounts.json` are correct (57+ characters)
- **Solution**: Get Script ID from Apps Script URL: `script.google.com/.../SCRIPT_ID/edit`

**🔍 Problem**: `clasp login` required for each account
- **Solution**: This is normal - each Google account needs separate authorization
- **Solution**: Run `clasp --user [account] login` and authorize each account you want to use

**🔍 Problem**: Account-specific commands fail
- **Solution**: Run `npm run validate:accounts` to check configuration
- **Solution**: Ensure all Script IDs in `accounts.json` are valid
- **Solution**: Run `npm run switch:create-project-files` to recreate project files

### Getting Help

1. **Check the execution logs**: In Apps Script editor, look at the bottom panel after running
2. **Enable debug mode**: Set `DEBUG=true` in Script Properties for detailed logging
3. **Try dry run mode**: Set `DRY_RUN=true` to test without making changes
4. **For multi-account issues**: Run `npm run validate:accounts` to diagnose configuration problems

## Security Notes

- **Your API key**: Keep it private — don't share it or commit it to code repositories
- **Permissions**: The script only accesses your Gmail to read emails and manage labels
- **Data**: Email content is sent to Google's Gemini AI for analysis but isn't stored permanently
- **Revoke access**: You can remove permissions anytime in your [Google Account settings](https://myaccount.google.com/permissions)

### Multi-Account Security
- **accounts.json**: Contains only Script IDs, not API keys or sensitive data
- **Separate permissions**: Each Apps Script project has independent access to its respective Gmail account
- **API key isolation**: Use separate API keys per account for quota isolation, or share one key across accounts
- **Account separation**: Work and personal email processing remain completely separate


## Configuration Reference

All settings are optional and have sensible defaults:

### Core Email Processing

| Setting | Default | Description |
|---------|---------|-------------|
| `DEFAULT_FALLBACK_LABEL` | `review` | Label to use when AI is uncertain |
| `MAX_EMAILS_PER_RUN` | `20` | Maximum emails to process each run |
| `BATCH_SIZE` | `10` | How many emails to send to AI at once |
| `BODY_CHARS` | `1200` | How much of each email to analyze |
| `DAILY_GEMINI_BUDGET` | `50` | Maximum AI API calls per day |
| `DRY_RUN` | `false` | Test mode (analyze but don't apply labels) |
| `DEBUG` | `false` | Verbose logging for troubleshooting |

### Email Summarizer Agent

| Setting | Default | Description |
|---------|---------|-------------|
| `SUMMARIZER_ENABLED` | `true` | Enable/disable the Email Summarizer agent |
| `SUMMARIZER_MAX_AGE_DAYS` | `7` | Maximum age of emails to include in summaries |
| `SUMMARIZER_MAX_EMAILS_PER_SUMMARY` | `50` | Maximum emails to process per summary |
| `SUMMARIZER_DESTINATION_EMAIL` | Your email | Email address to receive summaries |
| `SUMMARIZER_ARCHIVE_ON_LABEL` | `true` | Archive emails immediately when `summarize` label is applied |
| `SUMMARIZER_DEBUG` | `false` | Enable detailed logging for the agent |
| `SUMMARIZER_DRY_RUN` | `false` | Test mode for the agent |

## Updating and Deploying the Script

### Understanding Deployment Types

There are two types of deployments in this system:

1. **Code Deployment**: Uploads your code to Apps Script (for automatic email labeling)
2. **Web App Deployment**: Makes the web dashboard accessible via URL

### Development Updates

For code changes during development:

```bash
npm run deploy:personal   # or deploy:work for specific account
```

This uploads code changes and maintains web app deployment consistency. The streamlined deployment includes the --force flag to prevent "skipping push" issues.

### Production Deployments

For significant updates (like model changes or new features), use the streamlined deployment workflow:

#### Complete Deployment
```bash
npm run deploy:personal   # Deploy to personal account
npm run deploy:work       # Deploy to work account
npm run deploy:all        # Deploy to all accounts
```

Each deployment command:
1. Pushes code with --force flag to prevent "skipping push" issues
2. Creates a new versioned deployment
3. Maintains consistent web app URLs by redeploying to existing deployments
4. Automatically installs triggers
5. **Shows your web app URL immediately**
6. **Recommended for all production updates**

**Why use the streamlined deployment?** The new deployment script intelligently manages web app deployments to maintain consistent URLs while ensuring all components (code, web app, triggers) are properly updated together.

### Manual Version Control

You can also create versions manually:

```bash
npm run version:stable    # Creates a timestamped stable version
npm run version          # Creates a version with custom description
```

### Understanding Deployments vs Versions

- **Versions**: Snapshots of your code with descriptions (like git tags)
- **Deployments**: Published versions that can be shared or accessed via URL
- **Development**: Your working code that runs when you click "Run" in the editor

**Best Practice**: Use `npm run deploy:all` when updating your AI model or making significant changes to ensure everything works correctly together.

### When to Use Each Command

| Scenario | Command | Why |
|----------|---------|-----|
| Any code changes or updates | `npm run deploy:[account]` | Complete deployment with consistent URLs |
| Deploy to all accounts | `npm run deploy:all` | Batch deployment across all configured accounts |
| Complete system setup or major updates | `npm run deploy:[account]` | Ensures all components updated together |
| Getting web app URL after setup | `npm run url:[account]` | Shows current web app URL and instructions |
| Testing new changes | `npm run deploy:[account]` in test mode | Safe development workflow with --force push |

### Example: Updating AI Model

When you update your AI model (like switching to a newer Gemini version):

1. Make your code changes locally
2. Deploy with `npm run deploy:[account]` which includes testing and production deployment
3. Verify the trigger is working with the new model using the web app URL provided

This ensures your scheduled runs use the updated model and maintains consistent web app URLs.

## Uninstalling

To completely remove the system:

1. **Remove automatic triggers**: Use the Apps Script UI (no trigger:delete command available)
2. **Clear settings**: Delete Script Properties in the Apps Script editor
3. **Remove labels**: Manually delete the Gmail labels if desired
4. **Revoke permissions**: Visit [Google Account permissions](https://myaccount.google.com/permissions) and remove access

---

## Glossary

- **Apps Script**: Google's cloud platform for automating Google services
- **API Key**: A secret code that identifies your project to Google's services
- **clasp**: Google's command-line tool for Apps Script development
- **Dry run**: Testing mode that analyzes emails but doesn't make changes
- **Script Properties**: Settings stored securely in your Apps Script project
- **Trigger**: A schedule that runs your script automatically
