# Interactive Web App Deployment Guide

This guide provides step-by-step instructions for deploying the Email Agent's Interactive Web App Dashboard.

## Prerequisites

Before deploying the web app, ensure you have:

- ✅ **Completed the main setup** following the [README.md](README.md) instructions
- ✅ **Working email labeling system** (you can run the script manually)
- ✅ **Valid Gemini API key** configured in Script Properties
- ✅ **All required labels created** (`reply_needed`, `review`, `todo`, `summarize`)

## Deployment Steps

### Step 1: Upload Latest Code

1. **Navigate to your project directory**:
   ```bash
   cd /path/to/your/email-agent
   ```

2. **Push the latest code to Apps Script**:
   ```bash
   npm run push
   ```

3. **Verify files are uploaded**:
   ```bash
   npm run open
   ```
   - Check that you see `WebApp.html` and `WebAppController.gs` in the file list

### Step 2: Deploy as Web App

1. **In the Apps Script editor**, click the **"Deploy"** button (top right)

2. **Click "New deployment"**

3. **Configure deployment settings**:
   - **Type**: Select **"Web app"** from the dropdown
   - **Description**: "Email Agent Dashboard" (or your preferred name)
   - **Execute as**: **"Me"** (your email address)
   - **Who has access**: **"Only myself"**

4. **Click "Deploy"**

5. **Authorize the deployment**:
   - Click **"Authorize access"**
   - Choose your Google account
   - Click **"Advanced"** → **"Go to [Your Project Name] (unsafe)"**
   - Click **"Allow"**

6. **Copy the web app URL**:
   - The deployment will show a URL like: `https://script.google.com/macros/s/AKfyc...../exec`
   - **Copy this URL** - you'll need it to access your dashboard

### Step 3: Test the Deployment

1. **Open the web app URL** in a new browser tab

2. **Verify authentication**:
   - You should see the "Email Dashboard" interface
   - If you see "Access Denied", check your deployment settings

3. **Test basic functionality**:
   - The page should load without errors
   - You should see "Ready to process emails" message
   - Both buttons should be visible and responsive

### Step 4: Configure for Production Use

#### Set Web App Configuration (Optional)

In the Apps Script editor, go to **Project Settings** → **Script Properties** and add:

| Property Name | Recommended Value | Purpose |
|---------------|-------------------|---------|
| `WEBAPP_ENABLED` | `true` | Enable web app (default: true) |
| `WEBAPP_MAX_EMAILS_PER_SUMMARY` | `25` | Limit emails per summary (default: 25) |

#### Security Settings Verification

Ensure these settings are properly configured:

- **Web app access**: "Only myself" (never use "Anyone" for this app)
- **Execute as**: "Me" (ensures proper Gmail access)
- **Project visibility**: Keep private (don't share the project)

### Step 5: Create Bookmark (Mobile-Friendly)

#### For iOS (iPhone/iPad):
1. Open the web app URL in Safari
2. Tap the **Share** button
3. Tap **"Add to Home Screen"**
4. Name it "Email Dashboard" and tap **"Add"**

#### For Android:
1. Open the web app URL in Chrome
2. Tap the **three dots** menu
3. Tap **"Add to Home screen"**
4. Name it "Email Dashboard" and tap **"Add"**

#### For Desktop:
1. Bookmark the web app URL in your browser
2. Consider pinning the tab for quick access

## Usage Workflow

Once deployed, use the web app with this workflow:

### 1. Label Emails for Summarization
- In Gmail, apply the **"summarize"** label to emails you want processed
- Can be newsletters, long threads, multiple related emails

### 2. Generate Summary
- Open your web app bookmark
- Tap **"Get Summary"**
- Wait for AI processing (typically 10-30 seconds)
- Review the consolidated summary with source links

### 3. Archive Processed Emails
- Tap **"Archive X Emails"** (shows exact count)
- Confirm the action
- Emails are moved to Archive and labels removed

## Troubleshooting Deployment Issues

### Problem: "Access Denied" Error
**Symptoms**: Web app shows access denied page

**Solutions**:
1. **Check deployment settings**:
   - Ensure "Execute as" is set to "Me"
   - Verify "Who has access" is "Only myself"
2. **Redeploy**:
   - Create a new deployment with correct settings
   - Use the new URL

### Problem: Web App URL Not Working
**Symptoms**: URL returns 404 or doesn't load

**Solutions**:
1. **Verify the URL**:
   - Ensure you copied the complete URL ending in `/exec`
   - Check for any missing characters
2. **Create new deployment**:
   - In Apps Script, create a new deployment
   - Get fresh URL

### Problem: "Web App Functionality Disabled" Message
**Symptoms**: App loads but shows disabled message

**Solutions**:
1. **Check Script Properties**:
   - Ensure `WEBAPP_ENABLED` is set to `true` (or not set at all)
2. **Redeploy after configuration changes**:
   - Configuration changes may require redeployment

### Problem: Authentication Loops or Errors
**Symptoms**: Repeated sign-in prompts or authorization failures

**Solutions**:
1. **Clear browser cache and cookies**
2. **Use incognito/private browsing mode**
3. **Check Google Account permissions**:
   - Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   - Remove old authorizations for your script
   - Re-authorize from scratch

### Problem: No Emails Found Despite Having Labeled Emails
**Symptoms**: "No emails found" message when you have emails with "summarize" label

**Solutions**:
1. **Verify label name**:
   - Label must be exactly "summarize" (lowercase)
   - Check spelling and case sensitivity
2. **Check Gmail access**:
   - Ensure script has Gmail permissions
   - Try running the main email labeling script first
3. **Label placement**:
   - Ensure label is applied to the thread, not just individual messages

## Performance Optimization

### For Large Email Volumes
If you regularly process many emails:

1. **Reduce batch size**:
   - Set `WEBAPP_MAX_EMAILS_PER_SUMMARY` to `10` or `15`
   - This prevents timeouts with very long emails

2. **Process in smaller batches**:
   - Instead of labeling 50 emails at once, do 10-20 at a time
   - Generate multiple summaries if needed

### For Better Mobile Performance
1. **Use WiFi when possible** for faster processing
2. **Close other browser tabs** to free up memory
3. **Use the home screen bookmark** for fastest access

## Security Best Practices

### Deployment Security
- ✅ **Never share your web app URL** with others
- ✅ **Keep "Who has access" set to "Only myself"**
- ✅ **Don't embed the web app in other sites**
- ✅ **Regularly review Google Account permissions**

### Data Privacy
- 📧 **Email content** is processed by Google's AI but not stored permanently
- 🔑 **API keys and tokens** are stored securely in Google's infrastructure
- 📱 **Web app access** is logged for security auditing
- 🗑️ **Processed emails** are moved to Archive (not deleted)

### Regular Maintenance
1. **Monthly permission review**:
   - Check [Google Account permissions](https://myaccount.google.com/permissions)
   - Remove any unknown or old applications

2. **Quarterly redeployment**:
   - Consider redeploying with fresh permissions every few months
   - Update to latest code versions

## Advanced Configuration

### Custom Email Limits
For power users who want to adjust processing limits:

```javascript
// In Script Properties, adjust these values:
WEBAPP_MAX_EMAILS_PER_SUMMARY = 50  // Process up to 50 emails (may cause timeouts)
DAILY_GEMINI_BUDGET = 100           // Allow 100 AI calls per day
```

### Integration with Existing Workflows
The web app works alongside the existing automatic labeling:

1. **Automatic labeling** continues to work on schedule
2. **Web app** provides on-demand processing for "summarize" label
3. **Both systems** share the same configuration and API quotas

## Getting Help

### Before Contacting Support
1. **Check the console**:
   - In your browser, press F12 and check the Console tab for errors
   - Look for red error messages

2. **Try these steps**:
   - Clear browser cache
   - Try incognito/private mode
   - Disable browser extensions
   - Test on different device/browser

### Error Reporting
When reporting issues, include:
- **Exact error message** from the web app
- **Browser and device type** (Chrome on iPhone, etc.)
- **Steps to reproduce** the problem
- **Number of emails** you're trying to process

### Support Resources
- 📚 **Main documentation**: [README.md](README.md)
- 🔧 **Configuration reference**: See "Configuration Reference" in README
- 🐛 **Issue reporting**: Check project repository for issue templates

---

## Quick Reference

### Essential URLs
- **Apps Script Editor**: Run `npm run open` or visit [script.google.com](https://script.google.com)
- **Google Account Permissions**: [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
- **Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com)

### Key Commands
```bash
npm run push     # Upload code changes
npm run open     # Open Apps Script editor
npm run logs     # View execution logs
```

### Mobile Shortcuts
- **Ctrl/Cmd + R**: Refresh and get new summary
- **Ctrl/Cmd + A**: Archive current emails (when available)
- **Escape**: Hide status messages

---

**Your Email Agent Web App is now ready for production use!** 🎉

Bookmark your web app URL and start processing emails with AI-powered summaries.