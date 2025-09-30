# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Architectural Constraints

- Always obey the decisions recorded in the Architecture Design Records directory (docs/adr). The user must approve any violations of these rules or decisions.
- This is a Google Apps Script project using the V8 runtime with clasp for local development
- All source code resides in the `src/` directory and uses `.gs` extensions for Google Apps Script files
- The system follows a pluggable agent architecture defined in ADR-004, with enhanced self-contained agent patterns (ADR-011)
- Generic service layer pattern (ADR-012) provides reusable functions for agent development

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

### Deployment Operations (Streamlined)
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

### Account Setup Process

#### First-Time Setup
1. **Account Configuration**: Run `npm run setup:account` to configure accounts
2. **Authentication**: Log into each account with `clasp --user [account] login`
3. **Project Files**: Run `npm run switch:create-project-files` to create clasp project files
4. **Validation**: Run `npm run validate:accounts` to verify setup
5. **Deploy**: Use `npm run deploy:[account]` for complete deployment

#### Account Configuration Format
The system uses `accounts.json` to manage multiple Google Apps Script deployments:
```json
{
  "defaultAccount": "work",
  "accounts": {
    "work": {
      "scriptId": "1Yyl2UjvQOBKxT1J6OXPzR0q5bpRBdLuE7MUgTuVdV7uUtdltIxQyQBK-",
      "description": "Red Hat",
      "webAppDeploymentId": "AKfycbx1L7phZrDzB699TRLDhSb5PCLbufYiGXcRU9ZPz2A"
    },
    "personal": {
      "scriptId": "1JvaGS8HDHIJoebhjY_2bQjUx0Tx2XVyHSJkaA5gV7_MEUWBixuRsHPno",
      "description": "Personal Gmail Account",
      "webAppDeploymentId": "AKfycbxH3nXXSOQ1teErs4nA8uojO2AI_qVLIeVY8HLHkkBv"
    }
  }
}
```

**Note**: The `webAppDeploymentId` field is automatically managed by the deployment script to maintain consistent web app URLs.

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

The `deploy:[account]` commands attempt automated trigger installation but may fail on the `clasp run` portion.

#### Deployment Strategy Guide
- **Complete deployment**: Use `npm run deploy:[account]` for full system deployment (code + web app + triggers)
- **All accounts**: Use `npm run deploy:all` for batch deployment to all configured accounts
- **The deployment script uses --force flag** to prevent "skipping push" issues
- **Smart web app deployment**: Maintains consistent URLs by redeploying to existing deployments rather than creating new ones

## Architecture Overview

### Core Components
- **Main.gs**: Entry point that orchestrates the email processing pipeline + web app URL utilities
- **Organizer.gs**: Applies categorization results and manages Gmail labels
- **LLMService.gs**: Handles Gemini AI integration with dual authentication (API key or Vertex AI)
- **Agents.gs**: Pluggable agent system for extensible email processing
- **GmailService.gs**: Gmail API operations, thread management, and generic service functions
- **Config.gs**: Configuration management using Apps Script Properties
- **RuleDocService.gs**: Integration with Google Drive for classification rules
- **WebAppController.gs**: Web app entry point and API orchestration for interactive dashboard
- **WebApp.html**: Mobile-optimized HTML interface for on-demand email summarization
- **AgentSummarizer.gs**: Self-contained Email Summarizer agent with independent lifecycle management
- **AgentTemplate.gs**: Enhanced agent template demonstrating self-contained patterns

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

#### Email Summarizer Agent Configuration
- `SUMMARIZER_ENABLED`: Enable/disable Email Summarizer agent (default: true)
- `SUMMARIZER_MAX_AGE_DAYS`: Maximum age of emails to include in summaries (default: 7)
- `SUMMARIZER_MAX_EMAILS_PER_SUMMARY`: Maximum emails to process per summary (default: 50)
- `SUMMARIZER_DESTINATION_EMAIL`: Email address to receive summaries (default: user's email)
- `SUMMARIZER_ARCHIVE_ON_LABEL`: Enable/disable immediate archiving when 'summarize' label is applied (default: true)
- `SUMMARIZER_DEBUG`: Enable detailed logging for the agent (default: false)
- `SUMMARIZER_DRY_RUN`: Test mode for the agent (default: false)

## Development Patterns

### Adding New Agent Modules
The system supports two agent architecture patterns:

#### Self-Contained Agents (Recommended - ADR-011)
For complex agents that need independent lifecycle management:
1. Create agent file (e.g., `AgentMyFeature.gs`) with complete self-management
2. Implement configuration management with agent-specific property keys
3. Handle label creation and management within the agent
4. Manage own trigger lifecycle for scheduled execution
5. Use generic service functions from `GmailService.gs` for common operations
6. Register with `AGENT_MODULES` pattern for framework integration

#### Traditional Agents (Simple Cases)
For simple post-processing agents:
1. Create agent in `AgentTemplate.gs` or separate file
2. Register via `registerAgents()` function or `Agents.registerAllModules()`
3. Agents receive email data and can modify classification results

#### Generic Service Layer (ADR-012)
Use these functions for common operations:
- `findEmailsByLabelWithAge_()`: Find emails with label and age constraints
- `manageLabelTransition_()`: Efficient label management
- `archiveEmailsByIds_()`: Batch email archiving
- `sendFormattedEmail_()`: Send formatted HTML emails

### Classification Labels
The system uses exactly four core labels (ADR-003):
- `reply_needed`: Emails requiring personal response
- `review`: Informational emails to read
- `todo`: Action items and tasks
- `summarize`: Long emails that are processed by the Email Summarizer agent

#### Agent-Managed Labels
Self-contained agents may create and manage additional labels:
- `summarized`: Emails processed by the Email Summarizer agent (archived)
- Custom agent labels as needed (agents manage their own label lifecycle)

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
- **ADR-011**: Self-contained agent architecture for independent modules
- **ADR-012**: Generic service layer pattern for reusable agent operations

## Testing and Debugging

### Local Development
- Use `npm run deploy:[account]` after any code changes (includes push with --force flag)
- Enable `DEBUG=true` in Script Properties for verbose logging
- Use `DRY_RUN=true` to test classification without applying labels
- The deployment script automatically handles web app URL consistency

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
- **Solution**: For Email Summarizer, use `installSummarizerTrigger` function
- **Solution**: Automated `clasp run` trigger installation is unreliable due to permissions

**🔍 Problem**: Email Summarizer not working
- **Solution**: Verify `SUMMARIZER_ENABLED=true` in Script Properties
- **Solution**: Install summarizer trigger with `installSummarizerTrigger` function
- **Solution**: Check that emails with `summarize` label exist from past 7 days
- **Solution**: Enable `SUMMARIZER_DEBUG=true` for detailed logging

**🔍 Problem**: Multi-account commands not working
- **Solution**: Ensure you have the latest `package.json` with multi-account scripts
- **Solution**: Validate setup with `npm run validate:accounts`

**🔍 Problem**: Authentication issues with specific account
- **Solution**: Check authentication status with `npm run switch:status`
- **Solution**: Re-authenticate problematic account: `clasp --user [account] login`
- This project doesn't require test functions that are not part of the regular execution.