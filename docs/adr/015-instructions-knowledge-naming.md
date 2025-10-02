# ADR-015: INSTRUCTIONS vs KNOWLEDGE Configuration Naming Convention

**Status**: Accepted
**Date**: 2025-10-02
**Deciders**: Project team

## Context

The email automation system uses a Retrieval-Augmented Generation (RAG) approach with Google Gemini AI. The system augments AI prompts by fetching documents from Google Drive to provide:

1. **Instructions**: Documents that describe *how* to perform tasks (methodology, criteria, rules, style guidelines)
2. **Contextual Knowledge**: Documents that provide *reference material* to inform decisions (examples, background information, context)

This architectural pattern is fundamental to the system's operation:
- **Email Labeling**: Needs instructions on how to classify emails + contextual knowledge about email patterns and priorities
- **Reply Drafting** (future): Needs instructions on writing style/tone + contextual knowledge from past correspondence
- **Future AI Features**: Will likely need similar dual knowledge sources

**Problem Statement:**

As the system evolved, configuration property naming became inconsistent and ambiguous:

```javascript
// Old approach - Ambiguous naming
RULE_DOC_URL: p.getProperty('RULE_DOC_URL'),           // What kind of rules?
LABEL_KNOWLEDGE_DOC_URL: p.getProperty('LABEL_KNOWLEDGE_DOC_URL'), // Is this instructions or context?
REPLY_DRAFTER_CONTEXT_FOLDER_URL: p.getProperty('REPLY_DRAFTER_CONTEXT_FOLDER_URL') // Inconsistent with labeling
```

Developers and users faced confusion:
- Is `LABEL_KNOWLEDGE_DOC_URL` telling the AI *how* to label or *what* to know about?
- Why does reply drafting use `CONTEXT` while labeling uses `KNOWLEDGE`?
- How should new features name their configuration properties?

**RAG System Requirements:**

Modern RAG systems benefit from explicit knowledge type distinction:
- **Instruction documents** provide methodology and should be relatively stable
- **Knowledge documents** provide dynamic context and may change frequently
- Clear separation enables better prompt engineering and debugging
- Users can understand what each document's role is in the AI decision-making process

## Decision

We adopt a **semantic naming convention** that explicitly distinguishes between instruction and knowledge documents:

### Naming Pattern

```
{FEATURE}_{INSTRUCTIONS|KNOWLEDGE}_{PROPERTY}
```

Where:
- **FEATURE**: The feature name (e.g., `LABEL`, `REPLY_DRAFTER`)
- **INSTRUCTIONS**: Documents describing *how* to perform the task (methodology)
- **KNOWLEDGE**: Documents providing *contextual reference* material (examples, background)
- **PROPERTY**: The specific property type (e.g., `DOC_URL`, `FOLDER_URL`, `MAX_DOCS`)

### Concrete Examples

**Email Labeling Configuration:**
```javascript
// Instructions: How to label emails (criteria, methodology)
LABEL_INSTRUCTIONS_DOC_URL: p.getProperty('LABEL_INSTRUCTIONS_DOC_URL'),

// Knowledge: Context about email patterns (examples, reference material)
LABEL_KNOWLEDGE_FOLDER_URL: p.getProperty('LABEL_KNOWLEDGE_FOLDER_URL'),
LABEL_KNOWLEDGE_MAX_DOCS: parseInt(p.getProperty('LABEL_KNOWLEDGE_MAX_DOCS') || '5', 10)
```

**Reply Drafting Configuration:**
```javascript
// Instructions: How to draft replies (style guide, tone, methodology)
REPLY_DRAFTER_INSTRUCTIONS_URL: p.getProperty('REPLY_DRAFTER_INSTRUCTIONS_URL'),

// Knowledge: Context for drafting (past examples, templates, reference material)
REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL: p.getProperty('REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL'),
REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS: parseInt(p.getProperty('REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS') || '5', 10)
```

### Semantic Distinction Guidelines

**INSTRUCTIONS documents should contain:**
- Methodology and criteria for task execution
- Step-by-step processes
- Decision-making rules
- Style guidelines and tone requirements
- Quality standards

**KNOWLEDGE documents should contain:**
- Examples and reference material
- Background information and context
- Historical patterns and precedents
- Domain-specific information
- Templates and formats

### Integration with KnowledgeService

The KnowledgeService provides feature-specific functions that consume these properties:

```javascript
// Email Labeling
const knowledge = fetchLabelingKnowledge_({
  instructionsUrl: cfg.LABEL_INSTRUCTIONS_DOC_URL,        // How to label
  knowledgeFolderUrl: cfg.LABEL_KNOWLEDGE_FOLDER_URL,    // What to know about
  maxDocs: cfg.LABEL_KNOWLEDGE_MAX_DOCS
});

// Reply Drafting
const knowledge = fetchReplyKnowledge_({
  instructionsUrl: cfg.REPLY_DRAFTER_INSTRUCTIONS_URL,      // How to draft
  knowledgeFolderUrl: cfg.REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL, // What to reference
  maxDocs: cfg.REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS
});
```

## Alternatives Considered

### Alternative 1: Prefix-Based Naming
```
INSTRUCTIONS_LABEL_DOC_URL
KNOWLEDGE_LABEL_FOLDER_URL
```

- **Pros**:
  - Groups all instructions together alphabetically
  - Clear knowledge type comes first
- **Cons**:
  - Breaks feature-based grouping
  - Configuration properties for same feature scattered
  - Less intuitive when searching for feature-specific settings
- **Why not chosen**: Feature-based grouping more important for usability and maintainability

### Alternative 2: Suffix-Based Naming
```
LABEL_DOC_URL_INSTRUCTIONS
LABEL_FOLDER_URL_KNOWLEDGE
```

- **Pros**:
  - Maintains feature prefix
  - Consistent with some naming patterns
- **Cons**:
  - Reads awkwardly (URL comes before type distinction)
  - Less scannable - important semantic info at end
  - Harder to grep for all INSTRUCTIONS properties
- **Why not chosen**: Reduces readability and scannability

### Alternative 3: Generic Naming (No Semantic Distinction)
```
LABEL_DOC_URL
LABEL_FOLDER_URL
REPLY_DRAFTER_DOC_URL
REPLY_DRAFTER_FOLDER_URL
```

- **Pros**:
  - Shorter property names
  - Simpler naming scheme
- **Cons**:
  - No indication of document purpose
  - Developers must consult documentation to understand role
  - Harder to debug prompt construction
  - Users confused about what content should go in each document
- **Why not chosen**: Sacrifices critical clarity for minimal brevity gain

### Alternative 4: Role-Based Naming (Task-Specific)
```
LABEL_RULES_URL         // For labeling rules
LABEL_EXAMPLES_URL      // For labeling examples
REPLY_STYLE_URL         // For reply style
REPLY_TEMPLATES_URL     // For reply templates
```

- **Pros**:
  - Very specific to each use case
  - Self-documenting for specific features
- **Cons**:
  - Not generalizable to new features
  - No consistent pattern across features
  - Difficult to create reusable KnowledgeService functions
  - Each feature needs custom naming conventions
- **Why not chosen**: Lacks the systematic consistency needed for a reusable RAG framework

### Alternative 5: Namespace-Based with JSON Configuration
```javascript
KNOWLEDGE_CONFIG: {
  "labeling": {
    "instructions": "...",
    "knowledge": ["...", "..."]
  },
  "replyDrafting": {
    "instructions": "...",
    "knowledge": ["...", "..."]
  }
}
```

- **Pros**:
  - Structured data format
  - Supports complex nested configuration
  - Type-safe with schema validation
- **Cons**:
  - JSON parsing overhead on every access
  - Apps Script Properties UI doesn't handle JSON well
  - Size limits with PropertiesService (9KB per property)
  - Migration burden for existing deployments
  - Loses individual property visibility in UI
- **Why not chosen**: Trades simplicity and Apps Script integration for structure we don't yet need

## Consequences

### Positive

- **Clear intent**: Property names immediately convey document purpose and role
- **Discoverable pattern**: New developers can infer naming for new features
- **Grep-friendly**: Easy to find all INSTRUCTIONS or KNOWLEDGE properties across codebase
- **Feature-based grouping**: Related configuration properties cluster together alphabetically
- **RAG best practices**: Aligns with modern RAG architecture patterns that separate instructions from context
- **Debugging clarity**: When reviewing prompts, clear which content is instructional vs contextual
- **User guidance**: Users understand what content belongs in each document type
- **Future-proof**: Pattern scales to new AI-powered features without ad-hoc naming
- **Self-documenting**: Reduces need for external documentation about property purposes
- **Consistent prompting**: KnowledgeService functions can rely on consistent structure

### Negative

- **Breaking change**: Existing deployments using old property names must migrate
- **No backward compatibility**: System will not automatically detect old property names
- **Migration burden**: Users must rename properties in Apps Script Properties and update documentation
- **Longer property names**: More verbose than generic alternatives (trade-off for clarity)
- **Learning curve**: New users must understand INSTRUCTIONS vs KNOWLEDGE distinction
- **Documentation overhead**: Must maintain clear examples of what belongs in each category

### Neutral

- **Property count unchanged**: Same number of properties, just clearer naming
- **Apps Script Properties UI**: Names still fit within UI constraints
- **Configuration access patterns**: No changes to how properties are accessed in code
- **KnowledgeService API**: Function signatures remain the same, only property names change

## Implementation Notes

### Migration from Old Naming Conventions

**Deprecated Property Names:**
```
RULE_DOC_URL                     → LABEL_INSTRUCTIONS_DOC_URL
RULE_DOC_ID                      → (Remove, use URL-based access only)
LABEL_KNOWLEDGE_DOC_URL          → LABEL_INSTRUCTIONS_DOC_URL or LABEL_KNOWLEDGE_FOLDER_URL (depending on usage)
REPLY_DRAFTER_CONTEXT_FOLDER_URL → REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL
```

**Migration Process:**

1. **Identify current configuration**: Check Apps Script Properties for old names
2. **Determine document purpose**: Decide if each document is INSTRUCTIONS or KNOWLEDGE
3. **Rename properties**: Update property names in Apps Script editor
4. **Update URLs**: Verify all document URLs are accessible
5. **Test functionality**: Run system to verify knowledge loading works
6. **Update documentation**: Revise any user-facing documentation

**Migration Script (for future automation):**
```javascript
function migrateConfigurationNaming_() {
  const props = PropertiesService.getScriptProperties();
  const migrations = [
    { old: 'RULE_DOC_URL', new: 'LABEL_INSTRUCTIONS_DOC_URL' },
    { old: 'RULE_DOC_ID', new: null }, // Remove, deprecated
    { old: 'REPLY_DRAFTER_CONTEXT_FOLDER_URL', new: 'REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL' }
  ];

  migrations.forEach(function(migration) {
    const oldValue = props.getProperty(migration.old);
    if (oldValue) {
      if (migration.new) {
        props.setProperty(migration.new, oldValue);
        Logger.log('Migrated: ' + migration.old + ' → ' + migration.new);
      }
      props.deleteProperty(migration.old);
      Logger.log('Removed deprecated property: ' + migration.old);
    }
  });
}
```

### Adding New AI Features

When creating a new AI-powered feature, follow this pattern:

**Step 1: Define Configuration Properties**
```javascript
// In Config.gs
function getConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    // ... existing properties ...

    // New Feature Configuration
    NEWFEATURE_INSTRUCTIONS_DOC_URL: p.getProperty('NEWFEATURE_INSTRUCTIONS_DOC_URL'),
    NEWFEATURE_KNOWLEDGE_FOLDER_URL: p.getProperty('NEWFEATURE_KNOWLEDGE_FOLDER_URL'),
    NEWFEATURE_KNOWLEDGE_MAX_DOCS: parseInt(p.getProperty('NEWFEATURE_KNOWLEDGE_MAX_DOCS') || '5', 10)
  };
}
```

**Step 2: Create Feature-Specific KnowledgeService Function**
```javascript
// In KnowledgeService.gs
/**
 * Fetch knowledge for new feature
 *
 * Configuration Properties:
 * - NEWFEATURE_INSTRUCTIONS_DOC_URL: Document with methodology/criteria (how to perform task)
 * - NEWFEATURE_KNOWLEDGE_FOLDER_URL: Folder with contextual reference material (what to know about)
 * - NEWFEATURE_KNOWLEDGE_MAX_DOCS: Max documents from folder (default: 5)
 */
function fetchNewFeatureKnowledge_(config) {
  // ... implementation following pattern from fetchLabelingKnowledge_() ...
}
```

**Step 3: Document in CLAUDE.md**
```markdown
#### New Feature Configuration
- `NEWFEATURE_INSTRUCTIONS_DOC_URL`: Methodology document (how to perform task)
- `NEWFEATURE_KNOWLEDGE_FOLDER_URL`: Contextual reference folder (what to know about)
- `NEWFEATURE_KNOWLEDGE_MAX_DOCS`: Maximum documents from folder (default: 5)
```

### Validation and Code Review Checklist

When reviewing configuration changes:

- [ ] Property names follow `{FEATURE}_{INSTRUCTIONS|KNOWLEDGE}_{PROPERTY}` pattern
- [ ] INSTRUCTIONS properties point to single documents (DOC_URL)
- [ ] KNOWLEDGE properties typically point to folders (FOLDER_URL) with MAX_DOCS limit
- [ ] Feature-specific KnowledgeService function created
- [ ] Properties documented in Config.gs comments
- [ ] User-facing documentation updated in CLAUDE.md
- [ ] Migration path documented for any deprecated properties
- [ ] Example usage shown in feature implementation

### Documentation Standards

**For each INSTRUCTIONS document, document should contain:**
- Clear methodology for task execution
- Decision criteria and rules
- Step-by-step processes
- Quality standards and constraints
- Style guidelines (if applicable)

**For each KNOWLEDGE folder, documents should contain:**
- Relevant examples demonstrating patterns
- Background information and context
- Domain-specific reference material
- Templates or formats
- Historical precedents

**Property Documentation Template:**
```markdown
#### {Feature Name} Configuration
- `{FEATURE}_INSTRUCTIONS_DOC_URL`: {Brief description of methodology/criteria}
  - Example: "Classification rules for email labeling"
- `{FEATURE}_KNOWLEDGE_FOLDER_URL`: {Brief description of reference material}
  - Example: "Folder containing example emails and patterns"
- `{FEATURE}_KNOWLEDGE_MAX_DOCS`: Maximum documents from knowledge folder (default: 5)
```

### Error Messages and Debugging

The naming convention improves error message clarity:

```javascript
// Before: Generic, unclear
'Failed to fetch knowledge document from LABEL_KNOWLEDGE_DOC_URL'

// After: Specific, actionable
'Failed to fetch labeling instructions from LABEL_INSTRUCTIONS_DOC_URL.
Instructions should contain classification methodology and criteria.
Verify document exists and is accessible.'

'Failed to fetch labeling knowledge from LABEL_KNOWLEDGE_FOLDER_URL.
Knowledge folder should contain examples and reference material.
Verify folder exists and contains accessible documents.'
```

## References

- **KnowledgeService.gs**: Implementation of knowledge fetching with semantic naming
- **Config.gs**: Configuration property definitions following this convention
- **Main.gs**: Example usage of `fetchLabelingKnowledge_()` with INSTRUCTIONS/KNOWLEDGE pattern
- **RAG Architecture Patterns**: [Retrieval-Augmented Generation for Knowledge-Intensive Tasks](https://arxiv.org/abs/2005.11401)
- **Google Gemini Documentation**: [Grounding with Google Search and your own data](https://ai.google.dev/gemini-api/docs/grounding)
- **ADR-007**: Google Drive Rules Document Integration (predecessor to this naming convention)
- **ADR-014**: Configuration Management and Ownership (establishes where these properties are defined)
