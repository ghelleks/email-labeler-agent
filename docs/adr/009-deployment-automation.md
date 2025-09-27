# ADR-009: Deployment Automation and Multi-Account Management

**Status**: Accepted (Updated for Multi-Account Support)
**Date**: 2025-01-27 (Updated: 2025-01-27)
**Deciders**: Project team

## Context

The email-agent Google Apps Script project evolved from a single-account system to a multi-account deployment system to support users managing multiple Gmail accounts (personal, work, etc.). This evolution required significant changes to the deployment automation approach.

**Original Single-Account Issues:**
- Manual deployment steps were error-prone and inconsistent
- No safe deployment process with proper version control
- Risk of deploying broken code that would immediately affect production triggers
- Limited ability to manage different configurations across accounts

**Multi-Account Requirements:**
- Support for multiple Google Apps Script projects (one per Gmail account)
- Account-specific deployment workflows using clasp's native --user and --project flags
- Consistent configuration and code deployment across all accounts
- Simplified account switching and validation
- Batch operations for deploying to multiple accounts simultaneously

**Platform Constraints:**
- clasp run command for automated trigger installation is unreliable due to permission issues
- Each Google account requires separate authentication and project management
- Native clasp multi-account support requires proper project file management
- Web app URL retrieval through clasp is limited, requiring manual extraction

## Decision

We implemented a comprehensive multi-account deployment system using clasp's native --user and --project flags:

**Multi-Account Architecture:**
- `accounts.json`: Central configuration file containing account profiles with Script IDs and descriptions
- Account-specific `.clasp.json.[account]` files for each configured account
- Native clasp command integration using --user and --project flags
- Validation and setup automation through Node.js scripts

**Account Management System:**
```json
{
  "setup:account": "Interactive account configuration wizard",
  "switch:create-project-files": "Create .clasp.json files for all accounts",
  "validate:accounts": "Validate account configuration and accessibility",
  "auth:help": "Authentication guidance for multi-account setup"
}
```

**Account-Specific Operations:**
```json
{
  "push:personal": "clasp --user personal --project .clasp.json.personal push",
  "deploy:personal": "clasp --user personal --project .clasp.json.personal push && deploy",
  "deploy:personal:all": "push + deploy + trigger installation for personal account",
  "logs:personal": "clasp --user personal --project .clasp.json.personal logs",
  "open:personal": "clasp --user personal --project .clasp.json.personal open-script"
}
```

**Batch Operations:**
```json
{
  "status:all": "Show status for all configured accounts",
  "deploy:all-accounts": "Deploy to all accounts with confirmation",
  "push:all-accounts": "Push code to all accounts simultaneously"
}
```

**Trigger Installation Approach:**
- Manual trigger installation through Apps Script editor (recommended)
- Automated attempts via clasp run (unreliable due to permissions)
- Account-specific trigger management per Google account

## Alternatives Considered

### Alternative 1: Manual Deployment Steps
- **Pros**: Complete control over each step, flexibility for special cases
- **Cons**: Error-prone, inconsistent execution, requires memorizing command sequences
- **Why not chosen**: High risk of human error in production deployments

### Alternative 2: Version-Specific Trigger Targeting
- **Pros**: Would allow precise version control for triggers
- **Cons**: Not supported by Google Apps Script platform, triggers always use latest deployment
- **Why not chosen**: Platform limitation makes this approach impossible

### Alternative 3: Semantic Versioning (e.g., v1.2.3)
- **Pros**: Industry standard, semantic meaning for version numbers
- **Cons**: Requires manual version number management, complex for automated deployments
- **Why not chosen**: Timestamp-based approach is simpler and provides better chronological context

### Alternative 4: Git-Hash Based Versions
- **Pros**: Direct correlation with source code state, unique identifiers
- **Cons**: Not human-readable, difficult to correlate with deployment timing
- **Why not chosen**: Timestamps provide better operational visibility and are more user-friendly

### Alternative 5: Separate Deployment Scripts
- **Pros**: Could provide more complex deployment logic
- **Cons**: Additional maintenance overhead, npm scripts provide sufficient functionality
- **Why not chosen**: npm scripts are simpler and integrate well with existing clasp workflow

## Consequences

### Positive
- **Multi-Account Support**: Single codebase can manage multiple Gmail accounts (personal, work, etc.)
- **Native Integration**: Uses clasp's built-in --user and --project flags for reliable account management
- **Isolation**: Each account operates independently with separate configurations and permissions
- **Scalability**: Easy to add new accounts without changing core deployment logic
- **Batch Operations**: Can deploy to all accounts simultaneously with confirmation prompts
- **Validation**: Built-in configuration validation prevents common setup errors
- **Flexibility**: Supports both individual account operations and bulk operations
- **Backward Compatibility**: Legacy single-account setup continues to work alongside multi-account

### Negative
- **Setup Complexity**: Initial multi-account configuration requires more steps than single account
- **Authentication Management**: Each account requires separate clasp login authentication
- **Trigger Installation**: Manual trigger installation required due to clasp run permission issues
- **URL Retrieval**: Web app URLs must be retrieved manually from Apps Script editor
- **File Proliferation**: Multiple .clasp.json.[account] files need to be maintained
- **Documentation Overhead**: More complex command structure requires comprehensive documentation

### Neutral
- **Command Learning**: Users need to learn account-specific command patterns (e.g., `npm run deploy:personal`)
- **Account Naming**: Requires consistent account naming conventions (lowercase recommended)
- **Project Management**: Need to track multiple Google Apps Script project IDs
- **Migration Path**: Existing users can gradually migrate from single-account to multi-account setup

## Implementation Notes

### Multi-Account Deployment Usage
```bash
# Initial Setup
npm run setup:account                # Configure accounts interactively
npm run switch:create-project-files   # Create clasp project files
npm run validate:accounts             # Validate configuration

# Account-Specific Deployment
npm run deploy:personal:all           # Complete deployment to personal account
npm run deploy:work:all              # Complete deployment to work account
npm run push:personal                # Push code only to personal account
npm run logs:personal                # View personal account logs

# Batch Operations
npm run deploy:all-accounts           # Deploy to all configured accounts
npm run status:all                   # Check all account statuses
npm run push:all-accounts            # Push to all accounts
```

### Version Management Strategy
- Stable versions should be created for all production deployments
- Development testing can use `npm run push` without versioning
- Periodic cleanup of old stable versions to manage project size
- Document significant deployments with descriptive deployment messages

### Rollback Procedure
1. Identify target stable version in Apps Script editor
2. Create new deployment from historical version
3. Update triggers if necessary using `npm run trigger:install`
4. Verify system functionality after rollback

### Trigger Management Integration
- `deploy:[account]:all` attempts automated trigger installation but may fail
- Manual trigger installation through Apps Script editor is recommended
- Each account requires separate trigger installation
- Open specific account editor: `npm run open:personal` or `npm run open:work`
- Select `installTrigger` function and run manually for reliable installation

### Documentation Updates
- CLAUDE.md updated with multi-account deployment commands
- README.md includes comprehensive multi-account setup guide
- Developer guide updated with multi-account workflow patterns
- WebApp setup guide updated for account-specific deployment
- Troubleshooting documentation for multi-account issues

### Monitoring and Maintenance
- Monitor Apps Script quotas as version count increases
- Periodic review and cleanup of old stable versions
- Track deployment frequency and success rates
- Document any deployment issues for process improvement

## References

- [Google Apps Script clasp CLI Documentation](https://developers.google.com/apps-script/guides/clasp)
- [npm scripts documentation](https://docs.npmjs.com/cli/v9/using-npm/scripts)
- [Apps Script versioning and deployment](https://developers.google.com/apps-script/concepts/deployments)