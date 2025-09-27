# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Architectural Constraints

- Always obey the decisions recorded in the Architecture Design Records directory (docs/adr). The user must approve any violations of these rules or decisions.
- This is a Google Apps Script project using the V8 runtime with clasp for local development
- All source code resides in the `src/` directory and uses `.gs` extensions for Google Apps Script files
- The system follows a pluggable agent architecture defined in ADR-004

## Development Commands

### Account Setup and Management
```bash
# Initial Setup
npm run setup:account               # Interactive account configuration wizard
npm run switch:create-project-files  # Create project files for all accounts
npm run validate:accounts           # Validate account configuration
npm run auth:help                   # Show authentication guidance

# Status and Information
npm run switch:status               # Show all account statuses
```

### Account-Specific Operations
```bash
# Push Code
npm run push:personal               # Push code to personal account
npm run push:work                   # Push code to work account

# Deploy (Push + Deploy)
npm run deploy:personal             # Push + deploy to personal account
npm run deploy:work                 # Push + deploy to work account

# Complete Deployment (Push + Deploy + Trigger Setup)
npm run deploy:personal:all         # Complete deployment to personal account
npm run deploy:work:all             # Complete deployment to work account

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
npm run deploy:all-accounts         # Deploy to all configured accounts
npm run push:all-accounts           # Push to all configured accounts
```

### Account Setup Process

#### First-Time Setup
1. **Account Configuration**: Run `npm run setup:account` to configure accounts
2. **Authentication**: Log into each account with `clasp --user [account] login`
3. **Project Files**: Run `npm run switch:create-project-files` to create clasp project files
4. **Validation**: Run `npm run validate:accounts` to verify setup
5. **Deploy**: Use `npm run deploy:[account]:all` for complete deployment

#### Account Configuration Format
The system uses `accounts.json` to manage multiple Google Apps Script deployments:
```json
{
  "defaultAccount": "work",
  "accounts": {
    "work": {
      "scriptId": "1Yyl2UjvQOBKxT1J6OXPzR0q5bpRBdLuE7MUgTuVdV7uUtdltIxQyQBK-",
      "description": "Red Hat"
    },
    "personal": {
      "scriptId": "1JvaGS8HDHIJoebhjY_2bQjUx0Tx2XVyHSJkaA5gV7_MEUWBixuRsHPno",
      "description": "Personal Gmail Account"
    }
  }
}
```

#### Authentication Requirements
Each account requires separate authentication:
```bash
clasp --user personal login    # Log into personal account
clasp --user work login        # Log into work account
```

#### Trigger Installation
**Important**: Automated trigger installation via `clasp run` is unreliable due to permission issues. Triggers must be installed manually:

1. Use `npm run open:personal` or `npm run open:work` to open Apps Script editor
2. Select `installTrigger` from the function dropdown
3. Click the Run button to install triggers
4. Grant necessary permissions when prompted

The `deploy:[account]:all` commands attempt automated trigger installation but may fail on the `clasp run` portion.

#### Deployment Strategy Guide
- **First-time setup**: Use `npm run deploy:[account]:all` for complete system setup
- **Code updates**: Use `npm run deploy:[account]` for code deployment only
- **Quick testing**: Use `npm run push:[account]` to push code without deployment
- **Production updates**: Use `npm run deploy:[account]:all` and manually verify triggers
- **Multiple accounts**: Use `npm run deploy:all-accounts` for batch deployment

## Architecture Overview

### Core Components
- **Main.gs**: Entry point that orchestrates the email processing pipeline + web app URL utilities
- **Organizer.gs**: Applies categorization results and manages Gmail labels
- **LLMService.gs**: Handles Gemini AI integration with dual authentication (API key or Vertex AI)
- **Agents.gs**: Pluggable agent system for extensible email processing
- **GmailService.gs**: Gmail API operations and thread management
- **Config.gs**: Configuration management using Apps Script Properties
- **RuleDocService.gs**: Integration with Google Drive for classification rules
- **WebAppController.gs**: Web app entry point and API orchestration for interactive dashboard
- **WebApp.html**: Mobile-optimized HTML interface for on-demand email summarization

### Data Flow
1. `findUnprocessed_()` identifies unlabeled email threads
2. `minimalize_()` extracts relevant content within character limits
3. `categorizeWithGemini_()` sends emails to AI for classification
4. `Organizer.apply_()` applies labels based on AI results
5. Budget tracking prevents API quota overruns

### Configuration System
Configuration uses Apps Script Script Properties accessible via the Apps Script editor:

#### Core Email Processing
- `GEMINI_API_KEY`: Gemini API authentication (API key mode)
- `PROJECT_ID`: Google Cloud project for Vertex AI (Vertex mode)
- `DRY_RUN`: Test mode that analyzes without applying labels
- `DEBUG`: Enables verbose logging
- `MAX_EMAILS_PER_RUN`: Limits emails processed per execution (default: 20)
- `BATCH_SIZE`: Number of emails sent to AI in one request (default: 10)
- `DAILY_GEMINI_BUDGET`: Daily API call limit (default: 50)

#### Web App Configuration
- `WEBAPP_ENABLED`: Enable/disable web app functionality (default: true)
- `WEBAPP_MAX_EMAILS_PER_SUMMARY`: Maximum emails to process in web app per summary (default: 25)

## Development Patterns

### Adding New Agent Modules
Follow the pluggable agent pattern defined in ADR-004:
1. Create agent in `ExampleAgents.gs` or separate file
2. Register via `registerAgents()` function or `Agents.registerAllModules()`
3. Agents receive email data and can modify classification results

### Classification Labels
The system uses exactly four labels (ADR-003):
- `reply_needed`: Emails requiring personal response
- `review`: Informational emails to read
- `todo`: Action items and tasks
- `summarize`: Long emails that benefit from AI summarization

### Error Handling
- All configuration errors should be descriptive and actionable
- Use `cfg.DEBUG` for detailed logging during development
- Budget tracking prevents quota overruns with graceful degradation

### Google Drive Integration
The system can load classification rules from Google Drive documents:
- Configure `RULE_DOC_URL` or `RULE_DOC_ID` in Script Properties
- Rules document provides examples and context for AI classification
- Fallback to built-in rules if document unavailable

## Key Architectural Decisions

Refer to `docs/adr/` for complete context:
- **ADR-001**: Google Apps Script chosen for serverless Gmail automation
- **ADR-002**: Gemini API integration with dual authentication modes
- **ADR-003**: Four-label classification system for simplicity
- **ADR-004**: Pluggable agent architecture for extensibility
- **ADR-005**: Batch processing with budget management
- **ADR-006**: Support for both API key and Vertex AI authentication
- **ADR-007**: Google Drive document integration for classification rules

## Testing and Debugging

### Local Development
- Use `npm run push:[account]` after any code changes
- Enable `DEBUG=true` in Script Properties for verbose logging
- Use `DRY_RUN=true` to test classification without applying labels

### Monitoring
- Check execution logs via `npm run logs:[account]` or Apps Script editor
- Monitor daily budget usage to prevent quota overruns
- Verify label application in Gmail after test runs

### Common Debugging Steps
1. Check Script Properties configuration in Apps Script editor
2. Verify Gemini API key or Google Cloud project permissions
3. Review execution logs for detailed error messages
4. Test with small `MAX_EMAILS_PER_RUN` values during development

### Multi-Account Troubleshooting

**🔍 Problem**: `accounts.json not found` error
- **Solution**: Run `npm run setup:account` to create initial configuration
- **Solution**: Ensure you're running commands from the project root directory

**🔍 Problem**: `Invalid script ID` error
- **Solution**: Verify Script IDs in `accounts.json` are correct (57+ characters)
- **Solution**: Get Script ID from Apps Script editor URL: `script.google.com/.../{SCRIPT_ID}/edit`

**🔍 Problem**: `clasp login` required for specific account
- **Solution**: Each Google account needs separate authentication: `clasp --user [account] login`
- **Solution**: Use `clasp --user [account] login --no-localhost` if having browser issues

**🔍 Problem**: `.clasp.json.[account]` file not found
- **Solution**: Run `npm run switch:create-project-files` to create project files
- **Solution**: Ensure account name in `accounts.json` matches the file suffix

**🔍 Problem**: Trigger installation fails
- **Solution**: Install triggers manually in Apps Script editor using `installTrigger` function
- **Solution**: Automated `clasp run` trigger installation is unreliable due to permissions

**🔍 Problem**: Multi-account commands not working
- **Solution**: Ensure you have the latest `package.json` with multi-account scripts
- **Solution**: Validate setup with `npm run validate:accounts`

**🔍 Problem**: Authentication issues with specific account
- **Solution**: Check authentication status with `npm run switch:status`
- **Solution**: Re-authenticate problematic account: `clasp --user [account] login`
- This project doesn't require test functions that are not part of the regular execution.