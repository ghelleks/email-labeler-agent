# ADR-007: Google Drive Rules Document Integration

**Status**: Accepted
**Date**: 2025-01-26
**Deciders**: Project team

## Context

The email-agent system needed a way for users to customize email classification rules without requiring code changes or technical expertise. The requirements were:

**User Experience:**
- Non-technical users should be able to modify classification behavior
- Changes should take effect without redeploying the system
- Rules should be easy to understand and edit
- Support for sharing rules across team members

**Technical Requirements:**
- Integrate naturally with the Google Apps Script environment
- Provide version control and collaboration features
- Support both simple and complex classification rules
- Include built-in fallback for system reliability

**Operational Needs:**
- Rules should be validated before use
- System should handle missing or corrupted rules gracefully
- Support for rule testing and debugging
- Clear documentation and examples

## Decision

We implemented Google Drive document integration for storing and managing email classification rules:

**Drive Document Structure:**
- Classification rules stored as structured text in Google Docs
- Standardized format that's both human-readable and machine-parseable
- Examples and documentation embedded in the document
- Version history through Google Docs native versioning

**Built-in Fallback System:**
- Default classification rules embedded in the code
- Automatic fallback when Drive document is unavailable
- Graceful degradation if rules document is corrupted
- System continues functioning even with Drive API issues

**Rule Processing:**
- Document fetched and parsed at runtime
- Rules cached temporarily to reduce API calls
- Validation of rule syntax before application
- Clear error reporting for rule problems

**User Experience Features:**
- Template documents with examples
- Collaborative editing through Google Docs sharing
- Comment system for rule discussion
- Suggestion mode for proposed changes

## Alternatives Considered

### Alternative 1: Configuration in Apps Script Properties
- **Pros**: No external dependencies, fast access, simple integration
- **Cons**: Technical editing interface, no collaboration features, difficult to document
- **Why not chosen**: Too technical for non-programmer users

### Alternative 2: Google Sheets Integration
- **Pros**: Structured data format, familiar interface, good for tabular rules
- **Cons**: Limited for complex rule descriptions, rigid structure constraints
- **Why not chosen**: Classification rules need more flexibility than tabular format allows

### Alternative 3: External Configuration Service
- **Pros**: Powerful rule engine, advanced features, professional UI
- **Cons**: Additional infrastructure, cost implications, authentication complexity
- **Why not chosen**: Violates the simple deployment model of Apps Script platform

### Alternative 4: Email-Based Rule Updates
- **Pros**: Familiar interface, no additional tools needed
- **Cons**: Security concerns, parsing complexity, no version control
- **Why not chosen**: Security risks and lack of proper validation mechanisms

### Alternative 5: Hardcoded Rules Only
- **Pros**: Simple implementation, reliable, no external dependencies
- **Cons**: No customization, requires code changes for rule modifications
- **Why not chosen**: Defeats the purpose of user customization

## Consequences

### Positive
- **User accessibility**: Non-technical users can modify classification behavior
- **Collaboration**: Teams can work together on rule development
- **Version control**: Google Docs provides history and change tracking
- **Documentation**: Rules can include explanations and examples inline
- **Sharing**: Rules can be easily shared between users or teams
- **Reliability**: Built-in fallback ensures system continues working
- **Integration**: Natural fit with Google Workspace ecosystem

### Negative
- **External dependency**: Relies on Google Drive API availability
- **Parsing complexity**: Need robust parsing of document content
- **Validation requirements**: Must validate rule syntax and semantics
- **Cache management**: Need to balance performance with freshness

### Neutral
- **Document format**: Need to establish and maintain formatting standards
- **Error handling**: Requires comprehensive error handling for document issues
- **Performance impact**: Document fetching adds latency to rule loading

## Implementation Notes

### Document Format Specification
```
Email Classification Rules

## Reply Needed Rules
- Direct questions requiring response
- Meeting invitations and scheduling requests
- Urgent requests with time constraints

## Review Rules
- Status updates and FYI messages
- Newsletter and informational content
- Regular reports and summaries

## Todo Rules
- Task assignments and action items
- Deadlines and follow-up reminders
- Process and workflow notifications

## Summarize Rules
- Long email threads needing summary
- Meeting notes and detailed discussions
- Complex technical documentation
```

### Rule Parsing Implementation
- Use Google Docs API to fetch document content
- Parse structured text into rule objects
- Validate rule syntax and completeness
- Handle document formatting and style variations

### Caching Strategy
- Cache parsed rules for performance
- Implement TTL-based cache invalidation
- Force refresh capability for testing
- Handle concurrent access properly

### Fallback Mechanism
```javascript
function getClassificationRules() {
  try {
    return loadRulesFromDrive() || getDefaultRules();
  } catch (error) {
    console.warn('Drive rules unavailable, using defaults:', error);
    return getDefaultRules();
  }
}
```

### User Setup Process
1. Copy template rules document to user's Drive
2. Share document with appropriate team members
3. Configure document ID in system properties
4. Test rule changes with validation tool
5. Monitor system logs for rule parsing issues

### Validation and Testing
- Rule syntax validation before application
- Test mode for rule changes
- Rule impact analysis and reporting
- Clear error messages for rule problems

## References

- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Google Docs API for Apps Script](https://developers.google.com/apps-script/reference/document)
- [Document collaboration best practices](https://support.google.com/docs/answer/2494888)