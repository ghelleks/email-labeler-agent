# Development Guide

Guide for contributors who want to modify, extend, or contribute to the Email Agent project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Contributing](#contributing)

## Development Setup

### Prerequisites

- Node.js 18 or higher
- Git
- Google account for testing
- Text editor or IDE (VS Code recommended)

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/email-agent.git
   cd email-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install clasp globally**:
   ```bash
   npm install -g @google/clasp
   ```

4. **Authenticate with Google**:
   ```bash
   clasp login --no-localhost
   ```

5. **Create development Apps Script project**:
   ```bash
   clasp create --type standalone --title "Email Agent - Dev" --rootDir ./src
   ```

6. **Configure development environment**:
   - Create `accounts.json` with your development account
   - Set up Script Properties in Apps Script editor
   - Add `GEMINI_API_KEY` and set `DEBUG=true`, `DRY_RUN=true`

## Project Structure

```
email-agent/
├── src/                          # Google Apps Script source files
│   ├── Main.gs                   # Entry point and orchestration
│   ├── Config.gs                 # Configuration management
│   ├── LLMService.gs             # Gemini AI integration
│   ├── KnowledgeService.gs       # Google Drive knowledge fetching
│   ├── GmailService.gs           # Gmail operations and generic services
│   ├── Organizer.gs              # Label application logic
│   ├── PromptBuilder.gs          # AI prompt construction
│   ├── Agents.gs                 # Agent framework
│   ├── AgentSummarizer.gs        # Email Summarizer agent
│   ├── AgentTemplate.gs          # Template for new agents
│   ├── WebAppController.gs       # Web app API
│   ├── WebApp.html               # Web app interface
│   ├── RuleDocService.gs         # Legacy rules (deprecated)
│   └── appsscript.json           # Apps Script manifest
├── docs/                         # Documentation
│   ├── agents/                   # Agent-specific docs
│   ├── features/                 # Feature docs
│   ├── guides/                   # How-to guides
│   └── adr/                      # Architecture Decision Records
├── scripts/                      # Build and deployment scripts
│   ├── deploy.js                 # Multi-account deployment
│   ├── switch-account.js         # Account switching
│   └── setup-accounts.js         # Account setup wizard
├── package.json                  # npm scripts and dependencies
├── accounts.json                 # Multi-account configuration (gitignored)
├── .clasp.json.*                 # Per-account clasp config (gitignored)
├── README.md                     # User documentation
└── CLAUDE.md                     # AI assistant instructions
```

### Key Files

**Core Processing**:
- `Main.gs`: Entry point, orchestrates email finding and processing
- `LLMService.gs`: Handles all AI interactions
- `PromptBuilder.gs`: Constructs prompts for AI
- `GmailService.gs`: Gmail API operations and generic utilities

**Configuration**:
- `Config.gs`: Centralized configuration loading
- `appsscript.json`: OAuth scopes and runtime settings

**Agents**:
- `Agents.gs`: Agent registration and lifecycle
- `AgentSummarizer.gs`: Self-contained Email Summarizer
- `AgentTemplate.gs`: Template for creating new agents

**Web App**:
- `WebAppController.gs`: Backend API for web dashboard
- `WebApp.html`: Frontend HTML interface

**Knowledge**:
- `KnowledgeService.gs`: Fetches Google Drive documents for AI context

## Development Workflow

### Making Code Changes

1. **Edit source files** in `src/` directory

2. **Push changes to Apps Script**:
   ```bash
   npm run deploy:personal  # Or your dev account
   ```

3. **Test in Apps Script editor**:
   ```bash
   npm run open:personal
   ```

4. **Check execution logs** for errors

5. **Iterate** until working correctly

### Development Commands

**Deployment**:
```bash
npm run deploy:personal    # Deploy to personal account
npm run deploy:work        # Deploy to work account
npm run deploy:all         # Deploy to all accounts
```

**Monitoring**:
```bash
npm run logs:personal      # View execution logs
npm run status:personal    # Check account status
npm run open:personal      # Open Apps Script editor
```

**Account Management**:
```bash
npm run setup:account               # Configure accounts
npm run switch:status               # Check all accounts
npm run validate:accounts           # Validate configuration
```

### Debugging

**Enable debug mode**:
```
DEBUG = true
SUMMARIZER_DEBUG = true
KNOWLEDGE_DEBUG = true
```

**Use dry run for testing**:
```
DRY_RUN = true
SUMMARIZER_DRY_RUN = true
```

**Check execution logs**:
- In Apps Script editor, bottom panel shows logs
- Use `Logger.log()` for custom logging
- Use `console.log()` for web app debugging

**Common debugging techniques**:
```javascript
// Log variable values
Logger.log('Config:', JSON.stringify(cfg));

// Log execution flow
Logger.log('Starting email processing...');

// Log errors with context
Logger.log('ERROR:', e.toString(), 'Stack:', e.stack);
```

## Adding New Features

### Creating a New Agent

Follow the self-contained agent pattern (see [ADR-011](../../docs/adr/011-self-contained-agents.md)):

1. **Create agent file**: `src/AgentMyFeature.gs`

2. **Implement configuration management**:
   ```javascript
   function getMyFeatureConfig_() {
     const props = PropertiesService.getScriptProperties();
     return {
       MYFEATURE_ENABLED: (props.getProperty('MYFEATURE_ENABLED') || 'true') === 'true',
       MYFEATURE_SETTING: props.getProperty('MYFEATURE_SETTING') || 'default',
       MYFEATURE_DEBUG: (props.getProperty('MYFEATURE_DEBUG') || 'false') === 'true'
     };
   }
   ```

3. **Handle label creation**:
   ```javascript
   function ensureMyFeatureLabel_() {
     const labelName = 'myfeature';
     return GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
   }
   ```

4. **Implement main logic**:
   ```javascript
   function runMyFeatureAgent() {
     const config = getMyFeatureConfig_();

     if (!config.MYFEATURE_ENABLED) {
       if (config.MYFEATURE_DEBUG) {
         Logger.log('MyFeature agent is disabled');
       }
       return;
     }

     // Your agent logic here
   }
   ```

5. **Add trigger installation** (if needed):
   ```javascript
   function installMyFeatureTrigger() {
     // Remove existing triggers
     const triggers = ScriptApp.getProjectTriggers();
     triggers.forEach(trigger => {
       if (trigger.getHandlerFunction() === 'runMyFeatureAgent') {
         ScriptApp.deleteTrigger(trigger);
       }
     });

     // Install new trigger
     ScriptApp.newTrigger('runMyFeatureAgent')
       .timeBased()
       .everyHours(1)  // Or your desired schedule
       .create();

     Logger.log('MyFeature trigger installed');
   }
   ```

6. **Document in CLAUDE.md**:
   ```markdown
   #### MyFeature Agent Configuration
   - `MYFEATURE_ENABLED`: Enable/disable the agent (default: true)
   - `MYFEATURE_SETTING`: Description (default: default)
   - `MYFEATURE_DEBUG`: Enable detailed logging (default: false)
   ```

7. **Create user documentation**: `docs/agents/myfeature.md`

### Using the Generic Service Layer

Leverage existing utilities from `GmailService.gs` (see [ADR-012](../../docs/adr/012-generic-service-layer.md)):

```javascript
// Find emails with label and age constraints
const emails = findEmailsByLabelWithAge_(
  'myfeature',      // Label name
  7,                // Max age in days
  50                // Max emails to fetch
);

// Manage label transitions efficiently
manageLabelTransition_(
  emailThreadIds,   // Array of thread IDs
  'myfeature',      // Source label to remove
  'processed'       // Destination label to add
);

// Batch archive emails
archiveEmailsByIds_(emailThreadIds);

// Send formatted HTML email
sendFormattedEmail_(
  'recipient@example.com',
  'Subject Line',
  htmlContent
);
```

### Adding New Knowledge Sources

Follow the INSTRUCTIONS/KNOWLEDGE naming convention (see [ADR-015](../../docs/adr/015-instructions-knowledge-naming.md)):

1. **Define configuration properties** in `Config.gs`:
   ```javascript
   MYFEATURE_INSTRUCTIONS_DOC_URL: p.getProperty('MYFEATURE_INSTRUCTIONS_DOC_URL'),
   MYFEATURE_KNOWLEDGE_FOLDER_URL: p.getProperty('MYFEATURE_KNOWLEDGE_FOLDER_URL'),
   MYFEATURE_KNOWLEDGE_MAX_DOCS: parseInt(p.getProperty('MYFEATURE_KNOWLEDGE_MAX_DOCS') || '5', 10)
   ```

2. **Create feature-specific fetch function** in `KnowledgeService.gs`:
   ```javascript
   function fetchMyFeatureKnowledge_(config) {
     return combineKnowledgeSources_([
       fetchDocument_(config.instructionsUrl, {
         propertyName: 'MYFEATURE_INSTRUCTIONS_DOC_URL',
         skipCache: config.skipCache
       }),
       fetchFolder_(config.knowledgeFolderUrl, {
         propertyName: 'MYFEATURE_KNOWLEDGE_FOLDER_URL',
         maxDocs: config.maxDocs,
         skipCache: config.skipCache
       })
     ]);
   }
   ```

3. **Use in your feature**:
   ```javascript
   const knowledge = fetchMyFeatureKnowledge_({
     instructionsUrl: cfg.MYFEATURE_INSTRUCTIONS_DOC_URL,
     knowledgeFolderUrl: cfg.MYFEATURE_KNOWLEDGE_FOLDER_URL,
     maxDocs: cfg.MYFEATURE_KNOWLEDGE_MAX_DOCS
   });

   if (knowledge.configured) {
     // Use knowledge.knowledge in AI prompt
     prompt += '\n\nAdditional context:\n' + knowledge.knowledge;
   }
   ```

### Modifying the Web App

**Backend changes** (`WebAppController.gs`):
```javascript
function myNewEndpoint() {
  try {
    // Your logic here
    return {
      success: true,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}
```

**Frontend changes** (`WebApp.html`):
```javascript
async function callMyEndpoint() {
  try {
    const result = await google.script.run
      .withSuccessHandler(handleSuccess)
      .withFailureHandler(handleError)
      .myNewEndpoint();
  } catch (error) {
    console.error('Error:', error);
  }
}
```

**Testing web app changes**:
1. Deploy: `npm run deploy:personal`
2. Get URL: `npm run url:personal`
3. Open in browser and test
4. Check browser console (F12) for JavaScript errors

## Testing

### Manual Testing

**Test core email labeling**:
1. Set `DRY_RUN=true` in Script Properties
2. Run `run` function in Apps Script editor
3. Check execution logs for classification results
4. Verify no labels actually applied (dry run)
5. Set `DRY_RUN=false` and test real labeling

**Test Email Summarizer**:
1. Apply `summarize` label to test emails
2. Run `runSummarizerAgent` function
3. Check execution logs
4. Verify summary email received

**Test Web App**:
1. Deploy web app: `npm run deploy:personal`
2. Open web app URL
3. Label emails with `summarize`
4. Click "Get Summary"
5. Verify summary appears
6. Click "Archive X Emails"
7. Verify emails archived in Gmail

**Test Knowledge System**:
1. Create test Google Doc with rules
2. Set `LABEL_INSTRUCTIONS_DOC_URL` in Script Properties
3. Enable `KNOWLEDGE_DEBUG=true`
4. Run email labeling
5. Check logs for knowledge fetch confirmation

### Testing Checklist

Before submitting changes:

- [ ] Code runs without errors in Apps Script editor
- [ ] Execution logs show expected behavior
- [ ] Dry run mode works correctly
- [ ] Debug mode provides useful logging
- [ ] Configuration properties documented
- [ ] Error messages are clear and actionable
- [ ] Web app (if applicable) works on mobile and desktop
- [ ] Multi-account deployment works
- [ ] Documentation updated

### Common Testing Scenarios

**Test error handling**:
- Invalid API key
- Missing configuration
- Inaccessible knowledge documents
- Gmail permission errors
- API quota exceeded

**Test edge cases**:
- Zero emails to process
- Very long emails (>10,000 chars)
- Emails with special characters
- Emails in multiple languages
- Large batch sizes

**Test performance**:
- Processing 50+ emails
- Large knowledge documents
- Multiple agents running
- Web app with many labeled emails

## Contributing

### Contribution Process

1. **Fork the repository** on GitHub

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```

3. **Make your changes** following the patterns above

4. **Test thoroughly** using the testing checklist

5. **Document your changes**:
   - Update relevant documentation in `docs/`
   - Update `CLAUDE.md` if adding configuration
   - Add ADR if making architectural decisions

6. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add my new feature"
   ```

7. **Push to your fork**:
   ```bash
   git push origin feature/my-new-feature
   ```

8. **Create a Pull Request** on GitHub

### Commit Message Format

Follow conventional commits:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```
feat: add reply drafting agent

Implements automatic email reply drafting with AI.
Includes configuration, trigger management, and testing.

Closes #123
```

```
fix: correct email archiving in summarizer

Archives were failing when emails had multiple labels.
Now properly handles label removal before archiving.
```

### Code Style Guidelines

**General**:
- Use 2-space indentation
- Use single quotes for strings
- Use semicolons
- Use descriptive variable names
- Add comments for complex logic

**Function naming**:
- Private functions: `functionName_()` (trailing underscore)
- Public functions: `functionName()` (no underscore)
- Constants: `CONSTANT_NAME`

**Error handling**:
```javascript
function myFunction() {
  try {
    // Main logic
  } catch (e) {
    Logger.log('ERROR in myFunction:', e.toString());
    if (cfg.DEBUG) {
      Logger.log('Stack:', e.stack);
    }
    throw e;  // Re-throw if calling function needs to handle
  }
}
```

**Configuration access**:
```javascript
// Good: Access via getConfig_()
const cfg = getConfig_();
if (cfg.MY_SETTING) {
  // ...
}

// Bad: Direct PropertiesService access
const setting = PropertiesService.getScriptProperties().getProperty('MY_SETTING');
```

### Architecture Decision Records

For significant architectural decisions, create an ADR:

1. Copy `docs/adr/template.md` to `docs/adr/XXX-my-decision.md`
2. Fill in the template
3. Include in your pull request

**When to create an ADR**:
- Choosing between alternative approaches
- Making technology decisions
- Defining new patterns
- Changing existing architecture

## Architecture References

Key architectural decisions to understand:

- [ADR-001: Google Apps Script Platform](../../docs/adr/001-google-apps-script-platform.md)
- [ADR-002: Gemini API Integration](../../docs/adr/002-gemini-api-integration.md)
- [ADR-003: Label-Based Classification](../../docs/adr/003-label-based-classification.md)
- [ADR-004: Pluggable Agents](../../docs/adr/004-pluggable-agents.md)
- [ADR-011: Self-Contained Agents](../../docs/adr/011-self-contained-agents.md)
- [ADR-012: Generic Service Layer](../../docs/adr/012-generic-service-layer.md)
- [ADR-015: INSTRUCTIONS vs KNOWLEDGE Naming](../../docs/adr/015-instructions-knowledge-naming.md)

## Resources

### Documentation

- [Apps Script Documentation](https://developers.google.com/apps-script)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [clasp Documentation](https://github.com/google/clasp)

### Tools

- [Apps Script Dashboard](https://script.google.com/home)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Apps Script API Reference](https://developers.google.com/apps-script/reference)

### Community

- [GitHub Issues](https://github.com/yourusername/email-agent/issues)
- [GitHub Discussions](https://github.com/yourusername/email-agent/discussions)

## See Also

- [Back to README](../../README.md)
- [Configuration Reference](configuration.md) - All configuration options
- [Troubleshooting Guide](troubleshooting.md) - Common issues
- [Architecture Decision Records](../../docs/adr/) - Architectural decisions
