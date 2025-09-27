# ADR-009: Deployment Automation and Versioning Patterns

**Status**: Accepted
**Date**: 2025-01-27
**Deciders**: Project team

## Context

The email-agent Google Apps Script project required a safe and reliable deployment process with proper version control. Several issues were identified with the original deployment approach:

**Safety Concerns:**
- Original deployment script deployed directly without creating stable versions first
- Google Apps Script triggers automatically use the latest deployment
- Risk of deploying broken code that would immediately affect production triggers
- No rollback capability if deployments failed or caused issues

**Operational Requirements:**
- Need for automated deployment workflow to reduce manual errors
- Requirement for timestamped versions for clear version tracking
- Integration with trigger management for complete deployment cycles
- Documentation of deployment process for team consistency

**Google Apps Script Constraints:**
- Triggers always use the latest deployed version (no version-specific targeting)
- Version creation is separate from deployment in clasp CLI
- Manual deployment steps are error-prone and inconsistent
- Need to coordinate version → deploy → trigger update sequence

## Decision

We implemented an automated deployment workflow with integrated versioning and trigger management:

**Timestamped Version Naming:**
- Pattern: `stable-YYYYMMDD-HHMMSS` (e.g., "stable-20250127-143022")
- Provides clear chronological ordering and human-readable timestamps
- Differentiates stable versions from development or experimental versions
- Enables quick identification of deployment timeframes

**Automated Deployment Workflow:**
- `version:stable`: Creates timestamped stable versions using current code state
- `deploy`: Combines version creation with deployment and descriptive metadata
- `deploy:full`: Complete workflow including trigger updates for production readiness

**Integrated npm Scripts:**
```json
{
  "version:stable": "clasp version \"stable-$(date +%Y%m%d-%H%M%S)\"",
  "deploy": "npm run version:stable && clasp deploy --description \"Production deployment $(date)\"",
  "deploy:full": "npm run deploy && npm run trigger:install"
}
```

**Safe Deployment Process:**
1. Create stable version from current code state
2. Deploy the versioned code with descriptive metadata
3. Update triggers to use the new deployment
4. Maintain rollback capability through version history

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
- **Safety**: Stable versions created before every deployment ensure rollback capability
- **Automation**: Reduces manual errors and ensures consistent deployment process
- **Traceability**: Timestamped versions provide clear deployment history
- **Integration**: npm scripts work seamlessly with existing clasp workflow
- **Documentation**: Clear deployment commands documented in package.json
- **Efficiency**: Single command (`deploy:full`) handles complete deployment cycle
- **Reliability**: Systematic approach reduces risk of incomplete deployments

### Negative
- **Version proliferation**: Automated versioning creates many stable versions over time
- **Storage overhead**: Each version consumes space in Google Apps Script project
- **Clock dependency**: Timestamp accuracy depends on system clock settings
- **Rollback complexity**: While versions enable rollback, process still requires manual intervention

### Neutral
- **Command learning**: Team needs to learn new deployment commands
- **Process change**: Shift from manual to automated deployment requires workflow adjustment
- **Monitoring**: Need to occasionally clean up old versions to manage project size

## Implementation Notes

### Deployment Command Usage
```bash
# Create timestamped stable version only
npm run version:stable

# Create version and deploy (recommended for most cases)
npm run deploy

# Full deployment including trigger updates (for production)
npm run deploy:full
```

### Version Management Strategy
- Stable versions should be created for all production deployments
- Development testing can use `clasp push` without versioning
- Periodic cleanup of old stable versions to manage project size
- Document significant deployments with descriptive deployment messages

### Rollback Procedure
1. Identify target stable version in Apps Script editor
2. Create new deployment from historical version
3. Update triggers if necessary using `npm run trigger:install`
4. Verify system functionality after rollback

### Trigger Management Integration
- `deploy:full` automatically updates triggers after deployment
- Ensures triggers use the newly deployed version
- Handles trigger deletion and recreation for clean state
- Use `trigger:install` separately if triggers need updating without deployment

### Documentation Updates
- CLAUDE.md updated with new deployment commands
- Development workflow documentation includes safe deployment practices
- Team onboarding includes deployment automation training

### Monitoring and Maintenance
- Monitor Apps Script quotas as version count increases
- Periodic review and cleanup of old stable versions
- Track deployment frequency and success rates
- Document any deployment issues for process improvement

## References

- [Google Apps Script clasp CLI Documentation](https://developers.google.com/apps-script/guides/clasp)
- [npm scripts documentation](https://docs.npmjs.com/cli/v9/using-npm/scripts)
- [Apps Script versioning and deployment](https://developers.google.com/apps-script/concepts/deployments)