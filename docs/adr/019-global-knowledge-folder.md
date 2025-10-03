# ADR-019: Global Knowledge Folder Architecture

**Status**: Accepted
**Date**: 2025-10-03
**Deciders**: Project team

## Context

As the email agent system evolved to support multiple AI-powered features (email categorization, reply drafting, email summarization), a critical architectural challenge emerged: **organizational context applies universally across all AI operations**.

### The Knowledge Duplication Problem

Prior to this decision, knowledge management followed a **feature-specific pattern**:
- **Email categorization**: `LABEL_KNOWLEDGE_DOC_URL` + `LABEL_KNOWLEDGE_FOLDER_URL`
- **Reply drafting**: `REPLY_DRAFTER_INSTRUCTIONS_URL` + `REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL`
- **Summarization**: `SUMMARIZER_INSTRUCTIONS_URL` + `SUMMARIZER_KNOWLEDGE_FOLDER_URL`

This pattern worked well for **feature-specific instructions** (how to label, how to draft, how to summarize) but created a fundamental problem:

**Organizational context needed to be duplicated across all knowledge sources.**

### Real-World Example

A user working at an organization with:
- **Project context**: "Project Phoenix" is the Q1 priority initiative, "Project Atlas" is legacy maintenance
- **Team structure**: Engineering team consists of Core Platform, Data Services, and ML Research
- **Terminology**: "RFR" means "Ready for Review", "P0" means critical priority
- **Domain knowledge**: Company builds AI-powered email management tools for enterprises

**Without global knowledge:**
- This context must be added to labeling knowledge folder (so emails mentioning "Project Phoenix" are classified correctly)
- AND added to reply drafter knowledge folder (so drafts reference the right project context)
- AND added to summarizer knowledge folder (so summaries understand organizational terminology)
- **Result**: 3x duplication, inconsistency when one is updated, higher token consumption

**With global knowledge:**
- This context lives once in `GLOBAL_KNOWLEDGE_FOLDER_URL`
- Automatically injected into ALL AI prompts
- Single source of truth ensures consistency
- Reduces total token budget by eliminating duplication

### Architectural Requirements

An effective solution must:
1. **Eliminate duplication**: Organizational context defined once, used everywhere
2. **Automatic propagation**: Apply to all current and future AI features
3. **Clear separation of concerns**: Organizational knowledge separate from feature-specific instructions
4. **Efficient resource usage**: Fetch once per execution, not per feature
5. **Backward compatible**: Existing feature-specific knowledge continues to work
6. **Token transparent**: Users understand total knowledge budget consumption

## Decision

We implemented a **global knowledge folder architecture** that provides system-wide organizational context to all AI operations:

### Core Design

**Configuration Properties:**
- `GLOBAL_KNOWLEDGE_FOLDER_URL`: Google Drive folder with organizational context documents (optional)
- `GLOBAL_KNOWLEDGE_MAX_DOCS`: Maximum documents to fetch from folder (default: 5)

**Execution Flow:**
1. **Main.gs entry point**: Fetch global knowledge once using `fetchGlobalKnowledge_()`
2. **Pass through call chain**: Provide `globalKnowledge` parameter to all prompt builders
3. **PromptBuilder injection**: Global knowledge injected BEFORE feature-specific knowledge
4. **Universal application**: Applies to categorization, summarization, reply drafting, and future features

**Knowledge Hierarchy:**
```
AI Prompt Structure:
1. Base instructions (built-in system prompts)
2. GLOBAL KNOWLEDGE (organizational context - applies to all features)
3. Feature-specific knowledge (how to perform this specific task)
4. Task data (emails to categorize, thread to draft reply for, etc.)
```

### Implementation Pattern

**Entry Point (Main.gs):**
```javascript
function processEmails() {
  // Fetch global knowledge once at execution start
  const globalKnowledge = fetchGlobalKnowledge_();

  // Pass to categorization
  const classifications = categorizeWithGemini_(emails, labelKnowledge, cfg, globalKnowledge);

  // Pass to agents (they pass it to their prompt builders)
  runAgents(classifications, globalKnowledge);
}
```

**Prompt Builder Integration:**
```javascript
function buildReplyDraftPrompt_(emailThread, replyKnowledge, globalKnowledge) {
  const parts = ['You are drafting a professional email reply.'];

  // 1. GLOBAL KNOWLEDGE FIRST (organizational context)
  if (globalKnowledge && globalKnowledge.configured) {
    parts.push('');
    parts.push('=== GLOBAL KNOWLEDGE ===');
    parts.push(globalKnowledge.knowledge);
  }

  // 2. FEATURE-SPECIFIC KNOWLEDGE SECOND (drafting instructions)
  if (replyKnowledge && replyKnowledge.configured) {
    parts.push('');
    parts.push('=== REPLY DRAFTING INSTRUCTIONS ===');
    parts.push(replyKnowledge.knowledge);
  }

  // 3. Task data
  parts.push('EMAIL TO REPLY TO:');
  parts.push(formatEmailThread(emailThread));

  return parts.join('\n');
}
```

**Knowledge Structure Example:**
```
Global Knowledge Folder:
├── org-structure.gdoc          (team hierarchy, reporting structure)
├── project-context.gdoc        (active projects, priorities)
├── terminology.gdoc            (company-specific terms, acronyms)
└── domain-knowledge.gdoc       (business context, industry background)

Feature-Specific Knowledge:
├── Label Knowledge Folder:     (classification examples, edge cases)
├── Reply Drafter Knowledge:    (tone guidelines, example drafts)
└── Summarizer Knowledge:       (summary format preferences)
```

### Folder-Only Design

Unlike feature-specific knowledge (which supports both single document + folder), global knowledge is **folder-only** by design:

**Why folder-only:**
- Organizational context naturally consists of multiple topics (projects, teams, terminology)
- Folder structure encourages logical document organization
- Reduces configuration complexity (one property instead of two)
- Enforces consistency across all knowledge types

**Configuration Simplification:**
```javascript
// Global Knowledge: Folder only
GLOBAL_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/xyz789
GLOBAL_KNOWLEDGE_MAX_DOCS = 10

// Feature-specific: Instructions + knowledge folder (both optional)
REPLY_DRAFTER_INSTRUCTIONS_URL = https://docs.google.com/document/d/abc123/edit
REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/def456
REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS = 5
```

### Token Budget Transparency

Global knowledge consumption is transparent through enhanced metadata:

```javascript
const globalKnowledge = fetchGlobalKnowledge_();

// Returns:
// {
//   configured: true,
//   knowledge: "=== Team Structure ===\n...\n\n=== Projects ===\n...",
//   metadata: {
//     docCount: 3,
//     totalChars: 12000,
//     estimatedTokens: 3000,
//     modelLimit: 1048576,
//     utilizationPercent: "0.3%",
//     sources: [
//       { name: "Team Structure", chars: 4000, url: "https://..." },
//       { name: "Projects", chars: 5000, url: "https://..." },
//       { name: "Terminology", chars: 3000, url: "https://..." }
//     ]
//   }
// }
```

**Combined token warnings** when global + feature-specific knowledge approach limits:
```
⚠️  Total knowledge size warning: ~524288 tokens (50.0% of model capacity).
  - Global knowledge: 3000 tokens (0.3%)
  - Reply drafter knowledge: 521288 tokens (49.7%)
Approaching model limit of 1048576 tokens.
```

## Alternatives Considered

### Alternative 1: Agent-Specific Knowledge Only (Status Quo Before This Feature)
- **Pros**: Simple to understand, each feature fully independent, no cross-feature coupling
- **Cons**: Massive duplication of organizational context, inconsistency when one source updated, higher token consumption, maintenance burden
- **Why not chosen**: Duplication creates unsustainable maintenance burden and wastes token budget

### Alternative 2: Global Document + Global Folder (Like Feature-Specific Pattern)
- **Pros**: Consistent with feature-specific knowledge pattern, allows single "overview" document
- **Cons**: Adds unnecessary complexity, unclear when to use document vs. folder, two configuration properties instead of one
- **Why not chosen**: Organizational context naturally consists of multiple documents (projects, teams, terminology). Folder structure is sufficient and simpler.

### Alternative 3: Lazy Fetching (Each Prompt Builder Fetches Independently)
```javascript
function buildReplyDraftPrompt_(emailThread, replyKnowledge) {
  const globalKnowledge = fetchGlobalKnowledge_(); // Fetch every time
  // ... build prompt
}
```
- **Pros**: No parameter passing required, simpler call chains, each feature isolated
- **Cons**: Wasteful Drive API usage (fetch 3x per execution), slower performance, quota consumption, potential rate limiting
- **Why not chosen**: Inefficient resource usage violates architectural principle of minimizing external API calls

### Alternative 4: Configuration Inheritance System
```javascript
// Complex inheritance model
KNOWLEDGE_GLOBAL_FOLDER = folder_url
KNOWLEDGE_LABELING_INHERIT_GLOBAL = true
KNOWLEDGE_REPLY_DRAFTER_INHERIT_GLOBAL = true
```
- **Pros**: Explicit opt-in per feature, features can disable global knowledge
- **Cons**: Over-engineered configuration, unclear semantics, requires per-feature management, adds cognitive load
- **Why not chosen**: Global knowledge should apply universally by definition. If context doesn't apply to all features, it belongs in feature-specific knowledge.

### Alternative 5: Shared Knowledge Pool with Tags
```javascript
// Documents tagged for different features
SHARED_KNOWLEDGE_FOLDER = folder_url
// Documents have metadata tags: [global, labeling, reply, summarize]
```
- **Pros**: Single knowledge source, flexible per-document targeting, reduces duplication
- **Cons**: Requires metadata management in Drive, complex parsing logic, unclear which documents apply to which features, testing complexity
- **Why not chosen**: Organizational context applies to ALL features by definition. Tag-based filtering adds unnecessary complexity.

## Consequences

### Positive

- **Eliminates duplication**: Organizational context defined once, used everywhere
- **Consistent AI behavior**: All features share the same organizational understanding
- **Reduced token consumption**: No duplication across feature-specific knowledge sources
- **Single source of truth**: Update organizational context in one place, applies to all features
- **Future-proof extensibility**: New AI features automatically inherit global knowledge
- **Efficient Drive API usage**: Fetch once per execution, not per feature
- **Clear separation of concerns**: Organizational context separate from feature-specific instructions
- **Transparent token utilization**: Metadata shows global knowledge consumption
- **Backward compatible**: Existing feature-specific knowledge continues to work
- **Reduced configuration overhead**: Users configure organizational context once

### Negative

- **Additional token budget consumption**: Global knowledge adds to every AI prompt (not just those that need it)
- **Parameter passing complexity**: `globalKnowledge` must be passed through call chain (Main.gs → Categorizer → PromptBuilder)
- **Configuration learning curve**: Users must understand difference between global vs. feature-specific knowledge
- **Risk of token overflow**: Combined global + feature-specific knowledge could approach model limits
- **Execution time increase**: Fetching global knowledge adds latency at execution start (though cached for 30 minutes)
- **Debugging complexity**: Issues could stem from global knowledge, feature-specific knowledge, or their interaction

### Neutral

- **Optional configuration**: Global knowledge is completely optional (backward compatible with existing deployments)
- **Folder-only pattern**: Different from feature-specific knowledge (document + folder), but simpler
- **Token warning system**: Enhanced warnings show breakdown of global vs. feature-specific consumption
- **Cache benefits**: Global knowledge benefits from KnowledgeService caching (30-minute TTL)
- **No feature opt-out**: All features receive global knowledge if configured (no per-feature disable)

## Implementation Notes

### Configuration Guide

**When to use global knowledge:**
- Organizational structure (teams, departments, reporting hierarchy)
- Project context (active projects, priorities, timelines)
- Terminology (company-specific acronyms, domain jargon)
- Company background (mission, products, industry)
- Business processes (approval workflows, escalation procedures)

**When to use feature-specific knowledge:**
- **Labeling instructions**: How to classify emails (methodology, examples, edge cases)
- **Reply drafting instructions**: Tone, style, signature preferences, example drafts
- **Summarization instructions**: Summary length, format, focus areas

**Example Configuration:**
```
Script Properties:
GLOBAL_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/abc123
GLOBAL_KNOWLEDGE_MAX_DOCS = 10

LABEL_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/def456
LABEL_KNOWLEDGE_MAX_DOCS = 5

REPLY_DRAFTER_INSTRUCTIONS_URL = https://docs.google.com/document/d/ghi789/edit
REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/jkl012
REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS = 5
```

### Token Budget Management

**Monitor combined token usage:**
```javascript
// Global knowledge metadata
{
  docCount: 5,
  estimatedTokens: 10000,
  utilizationPercent: "1.0%"
}

// Reply drafter knowledge metadata
{
  docCount: 3,
  estimatedTokens: 8000,
  utilizationPercent: "0.8%"
}

// Combined utilization: 1.8% (18000 tokens)
```

**Best practices:**
- Keep global knowledge focused on essential organizational context
- Use `GLOBAL_KNOWLEDGE_MAX_DOCS` to limit token consumption
- Enable `KNOWLEDGE_DEBUG=true` to see token utilization
- Monitor soft warnings at 50% capacity (524288 tokens)
- Act on critical warnings at 90% capacity (943718 tokens)

### Migration Path

**Existing deployments (no changes required):**
- If `GLOBAL_KNOWLEDGE_FOLDER_URL` not configured, system works exactly as before
- Feature-specific knowledge continues to work independently
- No code changes needed

**Adding global knowledge:**
1. Create Google Drive folder for organizational context
2. Add documents (team structure, projects, terminology, etc.)
3. Set `GLOBAL_KNOWLEDGE_FOLDER_URL` in Script Properties
4. (Optional) Set `GLOBAL_KNOWLEDGE_MAX_DOCS` if folder has many documents
5. Enable `KNOWLEDGE_DEBUG=true` to verify loading
6. Review token utilization in execution logs

**Reducing duplication after migration:**
1. Identify organizational context duplicated across feature-specific knowledge
2. Move to global knowledge folder
3. Remove from feature-specific knowledge sources
4. Verify AI behavior remains consistent
5. Monitor token savings in metadata

### Debugging Global Knowledge

**Enable debug logging:**
```
KNOWLEDGE_DEBUG = true
```

**Example debug output:**
```
Global knowledge loaded: 5 documents, 10000 tokens (1.0%)
  - Team Structure: 2000 chars
  - Project Phoenix Context: 3000 chars
  - Terminology Guide: 2500 chars
  - Domain Knowledge: 1500 chars
  - Business Processes: 1000 chars
```

**Verify injection into prompts:**
```
=== GLOBAL KNOWLEDGE ===
(organizational context appears here)

=== REPLY DRAFTING INSTRUCTIONS ===
(feature-specific instructions appear here)

EMAIL TO REPLY TO:
(email content appears here)
```

### Future Enhancements

**Potential improvements:**
- **Selective feature application**: Allow specific features to opt-out of global knowledge (if use case emerges)
- **Conditional injection**: Only inject global knowledge when relevant to specific email content
- **Semantic search**: Use embeddings to fetch only relevant global knowledge documents per prompt
- **Document prioritization**: Weight global knowledge documents by relevance/importance
- **Cache sharing**: Share global knowledge cache across multiple account executions

**Not currently planned (YAGNI principle):**
- Global instructions document (folder is sufficient)
- Per-feature global knowledge disabling (violates "global" principle)
- Tag-based document filtering (adds complexity without clear benefit)

## References

- ADR-002: Gemini API Integration Architecture (1M token capacity context)
- ADR-012: Generic Service Layer Pattern (reusable knowledge fetching functions)
- KnowledgeService.gs: Unified knowledge management implementation
- PromptBuilder.gs: Knowledge injection into AI prompts
- Main.gs: Global knowledge fetching at execution entry point
- Gemini 2.5 Flash documentation: Context window and token limits
