# ADR-010: PromptBuilder and LLMService Separation of Concerns

**Status**: Accepted
**Date**: 2025-09-27
**Deciders**: Development Team

## Context

The email agent system uses AI (Gemini) for two primary functions: email categorization and email summarization. Previously, the prompt construction logic for both functions was embedded directly within the LLMService.gs file, creating a mixing of concerns between prompt engineering and API communication logic.

Key issues with the previous architecture:
- LLMService.gs contained ~60 lines of inline prompt construction for summarization
- Prompt engineering logic was scattered across API communication code
- Difficult to maintain and test prompt templates independently
- No centralized location for prompt engineering concerns
- Inconsistent patterns between categorization and summarization prompt handling

The system already had a PromptBuilder.gs file with `buildCategorizePrompt_()` function, but summarization prompts were still embedded in LLMService.gs within the `generateConsolidatedSummary_()` function.

Technical context:
- Google Apps Script environment with clasp for local development
- Gemini AI integration with dual authentication (API key and Vertex AI)
- Four-label classification system (reply_needed, review, todo, summarize)
- Batch processing with budget management constraints
- Interactive web app for on-demand email summarization

## Decision

Establish complete separation of concerns between prompt engineering and API communication by:

1. **Centralize all prompt construction in PromptBuilder.gs**: Move the summarization prompt logic from LLMService.gs to PromptBuilder.gs via a new `buildSummaryPrompt_()` function
2. **Reduce LLMService.gs to pure API communication**: Focus solely on authentication, API calls, response handling, and error management
3. **Maintain consistent architectural patterns**: Follow the established pattern from `buildCategorizePrompt_()` for the new summarization function
4. **Preserve existing functionality**: Ensure no behavioral changes to the email processing pipeline

The refactoring involves:
- Moving ~60 lines of prompt construction logic to PromptBuilder.gs
- Replacing inline prompt building with single line: `const prompt = buildSummaryPrompt_(emailContents, config);`
- Maintaining the same prompt structure and formatting requirements
- Keeping all existing error handling and authentication logic in LLMService.gs

## Alternatives Considered

### Alternative 1: Keep Prompts Inline in LLMService (Status Quo)
- **Pros**:
  - No code changes required
  - All summarization logic in one place
  - No risk of breaking existing functionality
- **Cons**:
  - Continued mixing of prompt engineering and API concerns
  - Difficult to maintain and test prompts independently
  - Inconsistent with categorization prompt patterns
  - Poor separation of concerns
- **Why not chosen**: Violates single responsibility principle and makes prompt maintenance difficult

### Alternative 2: Create Separate Prompt Files for Each AI Function
- **Pros**:
  - Complete isolation of each prompt type
  - Could support external prompt file loading
  - Maximum modularity
- **Cons**:
  - Over-engineering for current needs
  - Adds complexity to file management
  - Google Apps Script environment limits external file loading
  - Creates unnecessary fragmentation for two functions
- **Why not chosen**: Adds complexity without proportional benefits in the Apps Script environment

### Alternative 3: Move Prompts to Configuration System
- **Pros**:
  - Prompts could be modified without code deployment
  - Runtime configurability
  - Could support A/B testing of prompts
- **Cons**:
  - Prompts are complex template logic, not simple configuration
  - Loss of version control for prompt changes
  - Harder to test and validate prompt templates
  - Apps Script Properties Service has size limitations
- **Why not chosen**: Prompts are complex templates requiring code logic, not simple configuration strings

## Consequences

### Positive
- **Centralized prompt engineering**: Single location (PromptBuilder.gs) for all AI prompt construction
- **Clear separation of concerns**: LLMService.gs focuses solely on API communication and authentication
- **Improved maintainability**: Easier to modify, test, and review prompt templates
- **Consistent architectural patterns**: Both categorization and summarization follow the same pattern
- **Better code organization**: Cleaner, more readable code structure
- **Enhanced testability**: Prompt construction can be tested independently of API calls
- **Reduced coupling**: Changes to prompts don't require touching API communication code

### Negative
- **Additional function call overhead**: Minor performance impact from extra function call (negligible in Apps Script context)
- **Potential for parameter mismatch**: Need to ensure consistent parameter passing between modules
- **Temporary code churn**: One-time refactoring effort required

### Neutral
- **File count remains the same**: No new files created, existing files modified
- **Public API unchanged**: External interfaces remain identical
- **Functionality preserved**: No behavioral changes to email processing
- **Memory footprint similar**: Similar total code size, just reorganized

## Implementation Notes

### Migration Steps Completed
1. **Analyzed existing prompt logic**: Identified ~60 lines of summarization prompt construction in LLMService.gs
2. **Created buildSummaryPrompt_() function**: Added to PromptBuilder.gs following existing patterns
3. **Replaced inline prompt construction**: Changed LLMService.gs to use `const prompt = buildSummaryPrompt_(emailContents, config);`
4. **Preserved all prompt features**: Maintained email reference mapping, web links, markdown formatting requirements
5. **Verified functionality**: Ensured no behavioral changes to email processing pipeline

### Technical Implementation Details
- **Function signature**: `buildSummaryPrompt_(emailContents, config)` matches the interface expected by LLMService.gs
- **Parameter passing**: emailContents array and config object passed through unchanged
- **Return value**: String prompt ready for AI API consumption
- **Error handling**: LLMService.gs retains all error handling logic
- **Debugging**: Existing debug logging patterns preserved

### Code Organization
- **PromptBuilder.gs**: Now contains both `buildCategorizePrompt_()` and `buildSummaryPrompt_()`
- **LLMService.gs**: Focused on `categorizeBatch_()`, `generateConsolidatedSummary_()` API calls, authentication, and response parsing
- **Consistent patterns**: Both prompt functions follow similar parameter and return value conventions

### Future Maintenance
- **Prompt modifications**: All changes to AI prompts should be made in PromptBuilder.gs
- **API changes**: All changes to AI service integration should be made in LLMService.gs
- **Testing strategy**: Prompt functions can be unit tested independently of API calls
- **Documentation**: Prompt requirements and formatting rules centralized in PromptBuilder.gs

## References

- [ADR-002: Gemini API Integration](002-gemini-api-integration.md) - Background on AI service integration
- [ADR-008: Interactive Web App Integration](008-interactive-web-app-integration.md) - Context for summarization functionality
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle) - Architectural principle guiding this decision
- [Google Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices) - Platform-specific considerations