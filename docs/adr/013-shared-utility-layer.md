# ADR-013: Shared Utility Layer Architecture

**Status**: Proposed
**Date**: 2025-09-29
**Deciders**: Project team

## Context

The email-agent codebase has accumulated significant code duplication in utility functions across multiple files as the system has grown. This creates maintenance burden, inconsistencies, and violates the DRY (Don't Repeat Yourself) principle:

### Current Code Duplication Patterns

**1. Markdown-to-HTML Conversion (3 implementations)**
- `AgentSummarizer.gs`: `convertMarkdownToHtml_()` with comprehensive formatting (headers, bold, italic, links, sources)
- `WebApp.html`: JavaScript markdown conversion with mobile-optimized styling
- Scattered inline replacements: Basic bold/italic conversions in various components

**2. Trigger Management Patterns (3+ duplicate implementations)**
- `Main.gs`: `installTrigger()`, `deleteTriggers()`, `deleteExistingTriggers_()`
- `AgentTemplate.gs`: `installTemplateAgentTrigger()`, `deleteTemplateAgentTriggers_()`
- `AgentSummarizer.gs`: `installSummarizerTrigger()`, `deleteSummarizerTriggers_()`
- Each implements the same pattern: filter by handler function, delete existing, create new

**3. Date Formatting (15+ locations)**
- `.toISOString().slice(0,10)` pattern for YYYY-MM-DD format in `GmailService.gs`
- `.toISOString()` for full timestamps in `GmailService.gs`, `WebAppController.gs`
- Various date calculations for age filtering across agents

**4. Error Handling (30+ locations)**
- `error.toString()` pattern repeated in all major files
- `Logger.log()` with similar error message formats across 6+ files
- Inconsistent error response structures between components

**5. String Processing Patterns**
- URL cleaning: `url.replace(/[.,;:!?)]$/, '')` pattern in `GmailService.gs`
- Text sanitization for email content across multiple agents
- Common string manipulation patterns scattered throughout codebase

### Problems with Current Approach

- **Maintenance burden**: Bug fixes must be replicated across multiple implementations
- **Inconsistency**: Different implementations handle edge cases differently
- **Testing complexity**: Each duplicate function requires separate testing
- **Code bloat**: Utility functions increase file sizes and cognitive load
- **Violation of DRY principle**: Same logic implemented multiple times
- **Agent development friction**: New agents must reimplement common patterns

This duplication particularly impacts the self-contained agent architecture (ADR-011), where agents need consistent utility functions but currently must implement them independently.

## Decision

Create a **shared utility layer** in `src/Utility.gs` containing standardized utility functions organized into logical categories. This extends ADR-012 (Generic Service Layer) from Gmail-specific operations to pure utility functions that have no external dependencies.

**Utility Layer Organization:**

```javascript
// Text Processing utilities
function convertMarkdownToHtml_(markdownText, options = {})
function cleanUrl_(url)
function sanitizeText_(text)
function truncateText_(text, maxLength, suffix = '...')

// Date/Time utilities
function formatDateISO_(date)           // YYYY-MM-DD format
function formatDateTimeISO_(date)       // Full ISO timestamp
function calculateDaysAgo_(date)        // Days between date and now
function isWithinDays_(date, maxDays)   // Boolean age check

// Trigger Management utilities
function createTrigger_(handlerFunction, schedule)
function deleteTriggersByHandler_(handlerFunction)
function listTriggersByHandler_(handlerFunction)
function recreateTrigger_(handlerFunction, schedule)

// Error Handling utilities
function logError_(context, error)
function formatError_(error)
function createErrorResponse_(message, error = null)
function createSuccessResponse_(data, metadata = {})

// Configuration utilities
function getConfigValue_(key, defaultValue, transformer = null)
function validateConfig_(configObject, requiredKeys)
function mergeConfig_(baseConfig, overrides)
```

**Design Principles:**
- **Pure functions**: No side effects, predictable inputs/outputs
- **Configurable**: Accept options objects for customization
- **Consistent interfaces**: Standard parameter patterns across all utilities
- **Error resilient**: Handle edge cases gracefully
- **Well-documented**: Comprehensive JSDoc for each function

## Alternatives Considered

### Alternative 1: Keep Utilities Scattered
- **Pros**: No refactoring required, each component fully self-contained
- **Cons**: Continued code duplication, maintenance burden, inconsistencies
- **Why not chosen**: Violates DRY principle and creates unsustainable maintenance burden

### Alternative 2: Embed Utilities in Existing Service Files
- **Pros**: No new files, utilities near related functionality
- **Cons**: Blurs boundaries between services and utilities, creates inappropriate dependencies
- **Why not chosen**: `GmailService.gs` should not contain text processing utilities, violates single responsibility

### Alternative 3: Create Multiple Utility Files by Category
- **Pros**: Clear separation of concerns, focused files
- **Cons**: Unnecessary complexity for utility functions, more imports to manage
- **Why not chosen**: Apps Script environment benefits from fewer files, utilities are cross-cutting

### Alternative 4: Use External Utility Library
- **Pros**: Battle-tested implementations, comprehensive functionality
- **Cons**: External dependency, Apps Script environment limitations, overkill for needs
- **Why not chosen**: Contradicts Apps Script simplicity principle and self-contained architecture

### Alternative 5: Namespace-based Organization within Files
- **Pros**: Organized utilities, clear categorization
- **Cons**: Apps Script doesn't have strong namespace support, verbose access patterns
- **Why not chosen**: Simple function exports more aligned with Apps Script patterns

## Consequences

### Positive
- **DRY compliance**: Utility functions implemented once and reused across all components
- **Consistency**: Standardized behavior for common operations (date formatting, error handling)
- **Maintainability**: Bug fixes and improvements benefit entire codebase
- **Testing efficiency**: Utility functions can be thoroughly tested in isolation
- **Development velocity**: New agents can use proven utility functions immediately
- **Code quality**: Centralized implementations can be more robust and feature-complete
- **Agent development**: Supports ADR-011 self-contained agents with shared foundations
- **Reduced cognitive load**: Developers don't need to understand multiple implementations

### Negative
- **Refactoring overhead**: Existing code must be migrated to use shared utilities
- **Additional abstraction**: Developers must learn utility layer interfaces
- **Potential over-generalization**: Utilities might become complex to handle all use cases
- **Import dependency**: Components depend on `Utility.gs` availability
- **Breaking changes risk**: Utility changes could impact multiple components

### Neutral
- **File organization**: One additional file to maintain in codebase
- **Documentation burden**: Utility functions require comprehensive documentation
- **Testing scope**: Utility layer needs dedicated test coverage
- **Migration timeline**: Gradual migration vs. big-bang refactoring decision

## Implementation Notes

### Migration Strategy

**Phase 1: Create Utility Layer**
1. Create `src/Utility.gs` with core utility functions
2. Implement comprehensive JSDoc documentation
3. Add unit tests for utility functions

**Phase 2: Migrate Existing Code**
1. Replace markdown conversion in `AgentSummarizer.gs` and `WebApp.html`
2. Standardize trigger management across `Main.gs`, `AgentTemplate.gs`, `AgentSummarizer.gs`
3. Replace date formatting patterns throughout codebase
4. Standardize error handling patterns

**Phase 3: Update Development Patterns**
1. Update agent templates to use utility functions
2. Document utility usage patterns in development guides
3. Establish code review guidelines for utility usage

### Function Design Specifications

#### Text Processing
```javascript
/**
 * Convert markdown text to HTML with configurable styling
 * @param {string} markdownText - The markdown text to convert
 * @param {Object} options - Conversion options
 * @param {boolean} options.mobileOptimized - Use mobile-friendly styles
 * @param {string} options.accentColor - Color for headers and bold text
 * @param {boolean} options.includeSourceLinks - Convert source links to lists
 * @returns {string} Converted HTML text
 */
function convertMarkdownToHtml_(markdownText, options = {})
```

#### Trigger Management
```javascript
/**
 * Create a trigger with standardized error handling
 * @param {string} handlerFunction - Name of function to trigger
 * @param {Object} schedule - Schedule configuration
 * @param {string} schedule.type - 'hourly'|'daily'|'weekly'
 * @param {number} schedule.interval - Interval value
 * @param {number} schedule.hour - Hour for daily triggers (0-23)
 * @returns {Object} Success/error response with trigger info
 */
function createTrigger_(handlerFunction, schedule)
```

#### Error Handling
```javascript
/**
 * Create standardized error response object
 * @param {string} message - User-friendly error message
 * @param {Error} error - Original error object (optional)
 * @returns {Object} Standardized error response
 */
function createErrorResponse_(message, error = null)
```

### Integration with Existing Architecture

**Relationship to ADR-012 (Generic Service Layer):**
- Generic services handle Gmail-specific operations (emails, labels)
- Utility layer handles pure functions with no external dependencies
- Clear boundary: utilities have no Gmail API calls or Apps Script service dependencies

**Support for ADR-011 (Self-Contained Agents):**
- Agents can use utilities without creating dependencies on other agents
- Utilities provide consistent foundations for agent development
- Shared utilities reduce agent complexity and development time

**Alignment with ADR-004 (Pluggable Architecture):**
- Utilities support agent modularity without creating coupling
- Consistent utility interfaces enable agent interoperability
- Utility layer grows organically as new patterns emerge

### Testing Strategy
- Unit tests for each utility function with edge cases
- Integration tests to verify utility usage in existing components
- Performance tests for computationally intensive utilities (markdown conversion)
- Regression tests to ensure migration doesn't break existing functionality

### Documentation Requirements
Each utility function must include:
- Comprehensive JSDoc with parameter and return type documentation
- Usage examples showing common patterns
- Error handling behavior
- Performance characteristics for expensive operations

## References

- ADR-004: Pluggable Agents Architecture (foundational framework)
- ADR-011: Self-Contained Agent Architecture (primary beneficiary)
- ADR-012: Generic Service Layer Pattern (related but distinct scope)
- DRY Principle (Don't Repeat Yourself)
- Google Apps Script best practices for utility functions
- Clean Code principles for function design