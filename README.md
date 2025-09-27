# Gmail Labeler — Automated Email Triage with AI

An intelligent Google Apps Script that automatically organizes your Gmail inbox by analyzing emails with Google's Gemini AI and applying helpful labels. Perfect for busy professionals who want to stay on top of their email without manual sorting.

## What This Does

This system automatically reads your incoming Gmail and sorts it into four actionable categories:

- **`reply_needed`** — Emails requiring your personal response (questions, meeting requests, urgent items)
- **`review`** — Emails to read but no immediate response needed (updates, newsletters, FYI messages)
- **`todo`** — Emails representing tasks or action items (assignments, deadlines, follow-ups)
- **`summarize`** — Long emails or threads that could benefit from AI summarization

**Example**: A meeting invitation gets labeled `reply_needed`, while a weekly newsletter gets labeled `review`.

## Quick Start Summary

**New to this?** Here's what you'll accomplish:

✅ **Main Goal**: Set up automatic email labeling that runs in Google's cloud
✅ **Time Required**: 5-10 minutes for basic setup
✅ **Technical Level**: Beginner-friendly with step-by-step instructions
✅ **What You'll Get**: Your Gmail automatically organized into 4 helpful categories

**Optional Advanced Features** (you can add these later):
- ⚪ **Automatic scheduling**: Run every hour without your computer
- ⚪ **Web dashboard**: On-demand email summaries on your phone

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
- **`summarize`**: Long emails you might want to summarize later

Each email gets exactly one label to keep things simple and clear.

## 🎉 Congratulations!

You now have automated email labeling set up! Your Gmail will automatically organize new emails into helpful categories. You can stop here and enjoy your automated email management, or continue below for optional advanced features.

## Advanced Features (Optional)

### Automatic Scheduling

To have the script run automatically every hour:

1. In the Apps Script editor, select "installTrigger" from the function dropdown
2. Click the "Run" button (▶️)
3. Check the "Triggers" section in the left sidebar to confirm it was created

**Why this is optional**: You can run the script manually anytime, but scheduling makes it truly automatic.

### Interactive Web App Dashboard

In addition to automatic email labeling, this system includes an **Interactive Web App Dashboard** for on-demand email summarization and archiving. This mobile-optimized interface allows you to:

- Get AI-powered summaries of emails labeled with `summarize`
- Archive processed emails with one tap
- View email count status and links to source emails
- Access from any device through a simple web interface

#### Web App Features

- **Works on phones and computers**: Touch-optimized interface for any device
- **AI Summarization**: Get short summaries of long emails in newspaper style
- **Email Count Accuracy**: Know exactly what will be archived before you confirm
- **Source Email Links**: Direct links back to your Gmail threads
- **Web Link Extraction**: Automatically finds and displays URLs from emails
- **Dark Mode Support**: Automatically adapts to your device preferences

#### Web App Setup

**⚠️ Note**: This is an advanced feature. Complete the basic setup above first.

For detailed web app setup instructions, see [docs/webapp-setup.md](docs/webapp-setup.md).

**Quick Setup**:
1. In the Apps Script editor, click "Deploy" → "New deployment"
2. Choose type: "Web app", Execute as: "Me", Access: "Only myself"
3. Click "Deploy" and copy the web app URL
4. Bookmark the URL for easy access

#### How to Use the Web App

1. **Label emails for summarization**: Apply the `summarize` label to emails in Gmail
2. **Open the web dashboard**: Visit your web app URL
3. **Get Summary**: Tap "Get Summary" to process all emails with the `summarize` label
4. **Review the summary**: Read the AI-generated consolidated summary with source links
5. **Archive emails**: Tap "Archive X Emails" to remove labels and archive the processed emails

**Pro Tip**: The web app is perfect for processing newsletters, long email threads, or multiple related emails at once.

#### Web App Configuration

You can customize the web app behavior with these Script Properties:

| Setting | Default | Description |
|---------|---------|-------------|
| `WEBAPP_ENABLED` | `true` | Enable/disable web app functionality |
| `WEBAPP_MAX_EMAILS_PER_SUMMARY` | `25` | Maximum emails to process in web app per summary |

**Settings Details**:
- **`WEBAPP_ENABLED`**: Set to `false` to completely disable web app features while keeping automatic labeling active
- **`WEBAPP_MAX_EMAILS_PER_SUMMARY`**: Controls performance and readability by limiting emails per summary. Larger numbers may cause timeouts or very long summaries

#### Web App Troubleshooting

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

### Customization (Advanced)

You can customize how emails are categorized by creating a rules document:

1. Create a new Google Doc with your classification rules
2. Get the document's URL (share link)
3. Add `RULE_DOC_URL` to your Script Properties with this URL

The system includes sensible defaults, so this is completely optional.

## Useful Commands

Once set up, these commands help you manage your project:

```bash
npm run push          # Upload code changes
npm run open          # Open Apps Script editor
npm run logs          # Watch live execution logs
npm run run           # Run the script manually
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

### Getting Help

1. **Check the execution logs**: In Apps Script editor, look at the bottom panel after running
2. **Enable debug mode**: Set `DEBUG=true` in Script Properties for detailed logging
3. **Try dry run mode**: Set `DRY_RUN=true` to test without making changes

## Security Notes

- **Your API key**: Keep it private — don't share it or commit it to code repositories
- **Permissions**: The script only accesses your Gmail to read emails and manage labels
- **Data**: Email content is sent to Google's Gemini AI for analysis but isn't stored permanently
- **Revoke access**: You can remove permissions anytime in your [Google Account settings](https://myaccount.google.com/permissions)


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


## Updating the Script

When you want to update to a newer version:

```bash
npm run push
```

This uploads any code changes to your Apps Script project.

## Uninstalling

To completely remove the system:

1. **Remove automatic triggers**: Run `npm run trigger:delete` or use the Apps Script UI
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