# ADR-003: Label-Based Email Classification System

**Status**: Accepted
**Date**: 2025-01-26
**Deciders**: Project team

## Context

The email-agent system needed a clear, actionable classification scheme for incoming emails that would:
- Provide meaningful categorization for different types of email responses
- Enable automated workflows based on email content and urgency
- Be simple enough for users to understand and customize
- Support efficient batch processing and labeling in Gmail
- Allow for clear decision-making about what action to take per email

The system processes email threads and needs to assign exactly one classification to each thread to avoid confusion and enable clear automated workflows.

## Decision

We implemented a four-label classification system with exactly one label assigned per email thread:

1. **`reply_needed`**: Emails requiring a personal response from the user
   - Direct questions, meeting requests, important decisions
   - Highest priority for user attention

2. **`review`**: Emails that need to be read but don't require immediate response
   - FYI emails, newsletters, status updates
   - Medium priority for user attention

3. **`todo`**: Emails that represent actionable tasks or reminders
   - Task assignments, deadlines, follow-up items
   - Structured for task management workflows

4. **`summarize`**: Emails that can be processed into summary information
   - Long discussions, meeting notes, reports
   - Candidates for AI-powered summarization

**Key Constraint**: Each email thread receives exactly one label to ensure clear categorization and prevent classification ambiguity.

## Alternatives Considered

### Alternative 1: Priority-Based System (High/Medium/Low)
- **Pros**: Simple to understand, familiar to users
- **Cons**: Doesn't indicate required action type, subjective priority assessment
- **Why not chosen**: Lacks actionable specificity needed for automated workflows

### Alternative 2: Multiple Label System (Combinatorial)
- **Pros**: More nuanced classification, handles edge cases better
- **Cons**: Creates decision paralysis, complicates automated workflows, ambiguous outcomes
- **Why not chosen**: Single-label constraint is essential for clear automated decision-making

### Alternative 3: Gmail's Built-in Categories
- **Pros**: Native Gmail integration, familiar to users
- **Cons**: Limited to predefined categories, not customizable for specific workflows
- **Why not chosen**: Insufficient granularity for email triage automation

### Alternative 4: Complex Multi-Dimensional Classification
- **Pros**: Highly detailed classification, supports complex workflows
- **Cons**: Difficult to implement consistently, overwhelming for users, complex rule sets
- **Why not chosen**: Violates simplicity requirement and single-label constraint

### Alternative 5: Binary Classification (Action/No Action)
- **Pros**: Very simple decision making, fast processing
- **Cons**: Insufficient granularity for different action types, limited workflow support
- **Why not chosen**: Too simplistic for effective email triage

## Consequences

### Positive
- **Clear decision making**: Each email has exactly one classification outcome
- **Actionable categories**: Each label implies a specific type of user action
- **Workflow automation**: Labels enable different automated processing paths
- **User comprehension**: Simple four-option system is easy to understand and customize
- **Gmail integration**: Works naturally with Gmail's labeling system
- **Batch processing**: Efficient to apply labels in bulk operations

### Negative
- **Edge case handling**: Some emails might fit multiple categories but must choose one
- **Subjective boundaries**: Classification rules require clear definitions to avoid ambiguity
- **Label evolution**: Adding/changing labels requires careful migration planning

### Neutral
- **Customization requirements**: Users may want different labels for their specific workflows
- **Rule complexity**: Classification rules must handle nuanced email content appropriately
- **Performance impact**: Each email requires AI analysis to determine appropriate label

## Implementation Notes

### Classification Logic
- Implement clear decision trees for label assignment
- Use AI analysis to understand email content and context
- Provide fallback rules for edge cases
- Log classification decisions for debugging and improvement

### Label Management
- Apply labels using Gmail API batch operations
- Remove any existing agent labels before applying new ones
- Track labeling statistics for system monitoring
- Implement label renaming/migration capabilities

### Rule Customization
- Store classification rules in Google Drive documents
- Allow users to customize label meanings and boundaries
- Provide clear examples for each label category
- Support rule validation and testing

### Quality Assurance
- Implement confidence scoring for classifications
- Provide manual review capabilities for uncertain cases
- Track classification accuracy metrics
- Support user feedback for improving rules

## References

- Gmail Labels API documentation
- Email classification best practices
- User workflow analysis and requirements