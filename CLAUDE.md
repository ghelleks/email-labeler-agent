# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Architectural Constraints

- Always obey the decisions recorded in the Architecture Design Records directory (docs/adr). The user must approve any violations of these rules or decisions.
- This is a Google Apps Script project using the V8 runtime with clasp for local development
- All source code resides in the `src/` directory and uses `.gs` extensions for Google Apps Script files
- The system follows a pluggable agent architecture defined in ADR-004

## Development Commands

### Essential clasp Commands
```bash
npm run push              # Upload local code changes to Apps Script
npm run pull              # Download changes from Apps Script to local
npm run open              # Open the Apps Script editor in browser
npm run status            # Check sync status between local and remote
```

### Testing and Execution
```bash
npm run run               # Execute the main run() function manually
npm run logs              # Watch live execution logs from Apps Script
npm run open:logs         # Open Apps Script logs in browser
```

### Trigger Management
```bash
npm run trigger:install   # Install hourly email processing trigger
npm run trigger:delete    # Remove all existing triggers
```

### Deployment
```bash
npm run version           # Create a new stable version
npm run deploy            # Deploy a new version for sharing
```

## Architecture Overview

### Core Components
- **Main.gs**: Entry point that orchestrates the email processing pipeline
- **Organizer.gs**: Applies categorization results and manages Gmail labels
- **LLMService.gs**: Handles Gemini AI integration with dual authentication (API key or Vertex AI)
- **Agents.gs**: Pluggable agent system for extensible email processing
- **GmailService.gs**: Gmail API operations and thread management
- **Config.gs**: Configuration management using Apps Script Properties
- **RuleDocService.gs**: Integration with Google Drive for classification rules

### Data Flow
1. `findUnprocessed_()` identifies unlabeled email threads
2. `minimalize_()` extracts relevant content within character limits
3. `categorizeWithGemini_()` sends emails to AI for classification
4. `Organizer.apply_()` applies labels based on AI results
5. Budget tracking prevents API quota overruns

### Configuration System
Configuration uses Apps Script Script Properties accessible via the Apps Script editor:
- `GEMINI_API_KEY`: Gemini API authentication (API key mode)
- `PROJECT_ID`: Google Cloud project for Vertex AI (Vertex mode)
- `DRY_RUN`: Test mode that analyzes without applying labels
- `DEBUG`: Enables verbose logging
- `MAX_EMAILS_PER_RUN`: Limits emails processed per execution (default: 20)
- `BATCH_SIZE`: Number of emails sent to AI in one request (default: 10)
- `DAILY_GEMINI_BUDGET`: Daily API call limit (default: 50)

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
- Use `npm run push` after any code changes
- Enable `DEBUG=true` in Script Properties for verbose logging
- Use `DRY_RUN=true` to test classification without applying labels

### Monitoring
- Check execution logs via `npm run logs` or Apps Script editor
- Monitor daily budget usage to prevent quota overruns
- Verify label application in Gmail after test runs

### Common Debugging Steps
1. Check Script Properties configuration in Apps Script editor
2. Verify Gemini API key or Google Cloud project permissions
3. Review execution logs for detailed error messages
4. Test with small `MAX_EMAILS_PER_RUN` values during development