# Knowledge System (Advanced)

The Knowledge System enables you to customize AI behavior by providing Google Drive documents that the AI uses to make better decisions. Think of it as teaching the AI about your specific email patterns, priorities, and preferences.

## What It Does

The Knowledge System:

- **Augments AI prompts** with content from Google Drive documents
- **Separates instructions from context** (INSTRUCTIONS vs KNOWLEDGE)
- **Supports single documents** (rules, methodology) and **document folders** (examples, reference material)
- **Caches documents** intelligently to reduce Drive API quota usage
- **Provides token transparency** showing how much AI capacity is being used
- **Fails fast** with actionable errors if configured documents are inaccessible

## When to Use It

**You should use the Knowledge System when**:
- Default email classification isn't accurate enough for your needs
- You have specific email patterns or priorities to teach the AI
- You want to provide examples of how emails should be categorized
- You need to customize AI behavior without changing code

**You can skip the Knowledge System if**:
- Default email labeling works well for you
- You're just getting started (add it later if needed)
- You don't have specific classification rules

## Core Concepts

### INSTRUCTIONS vs KNOWLEDGE

The system distinguishes between two types of knowledge (see [ADR-015](../../docs/adr/015-instructions-knowledge-naming.md)):

**INSTRUCTIONS documents**:
- Describe **how** to perform tasks (methodology, criteria, rules)
- Provide decision-making rules and processes
- Define style guidelines and quality standards
- Typically **single documents** that are relatively stable

**KNOWLEDGE documents**:
- Provide **reference material** to inform decisions (examples, background)
- Contain patterns, precedents, and domain-specific information
- Include templates and formats
- Typically **folders** with multiple documents that may change frequently

### Example: Email Labeling

**INSTRUCTIONS** (`LABEL_INSTRUCTIONS_DOC_URL`):
```
Email Classification Methodology:

1. reply_needed: Any email with direct questions, meeting requests, or requiring personal response
2. review: Informational emails, newsletters, FYI messages
3. todo: Explicit action items, deadlines, assignments
4. summarize: Long emails (>3 paragraphs) or complex threads

Quality Standards:
- If uncertain, default to 'review'
- Prioritize reply_needed over other categories
- Look for explicit calls to action for 'todo'
```

**KNOWLEDGE** (`LABEL_KNOWLEDGE_FOLDER_URL`):
```
Folder containing:
- examples-reply-needed.txt: 10 examples of emails needing replies
- examples-review.txt: 10 examples of informational emails
- examples-todo.txt: 10 examples of action items
- patterns-newsletters.txt: Common newsletter patterns
- priorities-work.txt: Work-specific priorities
```

## Configuration

### Email Labeling Knowledge

Configure these properties in Script Properties:

| Property | Type | Description |
|----------|------|-------------|
| `LABEL_INSTRUCTIONS_DOC_URL` | Document URL | Single document with classification methodology (how to label) |
| `LABEL_KNOWLEDGE_FOLDER_URL` | Folder URL | Folder with example emails and patterns (what to know about) |
| `LABEL_KNOWLEDGE_MAX_DOCS` | Number | Maximum documents to fetch from folder (default: 5) |

### Advanced Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `KNOWLEDGE_CACHE_DURATION_MINUTES` | `30` | How long to cache fetched documents |
| `KNOWLEDGE_DEBUG` | `false` | Enable detailed logging for document fetching |
| `KNOWLEDGE_LOG_SIZE_WARNINGS` | `true` | Warn when approaching token limits |

### Configuration Examples

**Single instructions document only**:
```
LABEL_INSTRUCTIONS_DOC_URL = https://docs.google.com/document/d/abc123/edit
```

**Folder of examples only**:
```
LABEL_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/xyz789
LABEL_KNOWLEDGE_MAX_DOCS = 10
```

**Both instructions and knowledge** (recommended):
```
LABEL_INSTRUCTIONS_DOC_URL = https://docs.google.com/document/d/abc123/edit
LABEL_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/xyz789
LABEL_KNOWLEDGE_MAX_DOCS = 5
```

**Debug mode**:
```
KNOWLEDGE_DEBUG = true
KNOWLEDGE_LOG_SIZE_WARNINGS = true
```

## Setup Guide

### Step 1: Create Knowledge Documents

#### Option A: Single Instructions Document

1. **Create a Google Doc** with your classification rules
2. **Share the document** with yourself (ensure Apps Script has access)
3. **Get the document URL** from the browser address bar
4. **Add to configuration**:
   ```
   LABEL_INSTRUCTIONS_DOC_URL = https://docs.google.com/document/d/YOUR_DOC_ID/edit
   ```

**Instructions Document Template**:
```
Email Classification Rules

METHODOLOGY:
1. Read subject line and first 3 paragraphs
2. Identify primary intent (question, information, task, or long-form)
3. Apply appropriate label based on criteria below

CLASSIFICATION CRITERIA:

reply_needed:
- Contains direct questions requiring personal response
- Meeting requests or calendar invitations
- Urgent items with deadlines

review:
- Newsletters and subscriptions
- FYI updates and announcements
- Team notifications

todo:
- Explicit action items ("please complete X")
- Tasks with deadlines
- Follow-up items

summarize:
- Emails longer than 3 paragraphs
- Complex multi-message threads
- Long-form content
```

#### Option B: Knowledge Folder with Multiple Documents

1. **Create a Google Drive folder**
2. **Add multiple documents** with examples and reference material
3. **Share the folder** with yourself
4. **Get the folder URL** from the browser address bar
5. **Add to configuration**:
   ```
   LABEL_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/YOUR_FOLDER_ID
   LABEL_KNOWLEDGE_MAX_DOCS = 5
   ```

**Knowledge Folder Structure Example**:
```
Email Classification Knowledge/
├── 01-examples-reply-needed.txt
├── 02-examples-review.txt
├── 03-examples-todo.txt
├── 04-patterns-newsletters.txt
└── 05-priorities.txt
```

**Example Knowledge Document** (01-examples-reply-needed.txt):
```
Examples of emails requiring replies:

1. "Can you review this proposal and share your thoughts by Friday?"
   → reply_needed (direct question with deadline)

2. "Meeting invite: Project kickoff - Please confirm attendance"
   → reply_needed (requires response)

3. "Quick question about the budget numbers"
   → reply_needed (question requiring personal response)
```

### Step 2: Configure Script Properties

In the Apps Script editor:

1. Click "Project Settings" in left sidebar
2. Scroll to "Script properties"
3. Click "Add script property"
4. Add your knowledge configuration (see Configuration section above)

### Step 3: Test Knowledge Loading

Enable debug mode to verify knowledge is loading:

```
KNOWLEDGE_DEBUG = true
```

Run the email labeling process and check execution logs:
- Should show "Fetched knowledge document" or "Fetched X documents from folder"
- Should show token counts and utilization percentage
- Should show any warnings about document size

### Step 4: Monitor and Refine

**Check token usage**:
- Watch for soft warnings at 50% capacity
- Critical warnings at 90% capacity indicate you should reduce documents

**Refine knowledge**:
- Start with small, focused documents
- Add more examples as needed
- Remove documents that aren't improving classification

## Document URL Formats

The Knowledge System accepts multiple URL formats:

**Google Docs**:
- Full URL: `https://docs.google.com/document/d/abc123/edit`
- Document ID only: `abc123`

**Google Drive Folders**:
- Full URL: `https://drive.google.com/drive/folders/xyz789`
- Folder ID only: `xyz789`

**Best practice**: Use full URLs (easier to verify and click)

## Token Management

### Understanding Token Limits

- **Gemini 1.5 Pro**: 1,048,576 tokens (~750,000 words)
- **System estimates**: ~4 characters per token (conservative estimate)
- **No hard limits**: System trusts Gemini's capacity

### Token Warnings

**Soft Warning (50-90% capacity)**:
```
⚠️  Knowledge size warning: ~524288 tokens (50.0% of model capacity).
Approaching model limit of 1048576 tokens.
```

**Critical Warning (>90% capacity)**:
```
🚨 Knowledge size critical: ~943718 tokens (90.0% of model capacity).
Request may fail. Strongly recommend reducing knowledge documents.
```

### Reducing Token Usage

**If you see warnings**:

1. **Reduce folder document limit**:
   ```
   LABEL_KNOWLEDGE_MAX_DOCS = 3  # Down from 5
   ```

2. **Split large documents** into smaller focused documents

3. **Remove less important documents** from knowledge folder

4. **Prioritize quality over quantity**: A few great examples > many mediocre ones

5. **Disable warnings** if you're comfortable with current usage:
   ```
   KNOWLEDGE_LOG_SIZE_WARNINGS = false
   ```

## Caching Behavior

### How Caching Works

- **Apps Script Cache Service**: 30-minute TTL (configurable)
- **Individual document caching**: Each document cached separately
- **Automatic invalidation**: Cache refreshes after expiration
- **Bypass option**: Use `skipCache` parameter for immediate refresh (developers only)

### Cache Benefits

- **Reduced Drive API quota usage**: Fetch documents once, use many times
- **Faster execution**: Cached documents load instantly
- **Cost efficiency**: Fewer API calls = better quota management

### When Cache Refreshes

- **After 30 minutes** (default `KNOWLEDGE_CACHE_DURATION_MINUTES`)
- **On first access** (cold cache)
- **Manual refresh**: Change cache duration to `0` temporarily, then restore

## Troubleshooting

### KnowledgeService failing to fetch documents

**Solution**: Verify document/folder URL is correct format in Script Properties

**Solution**: Check document/folder permissions (must have at least Viewer access)

**Solution**: Enable `KNOWLEDGE_DEBUG=true` to see detailed fetch logs

**Solution**: If configured but want to proceed without knowledge, remove the property

**Solution**: Check execution logs for token warnings (may be hitting capacity limits)

### Knowledge documents too large

**Solution**: Monitor soft warnings at 50% capacity (informational)

**Solution**: Critical warnings at 90% capacity mean action needed

**Solution**: Reduce `LABEL_KNOWLEDGE_MAX_DOCS` (e.g., from 5 to 3)

**Solution**: Remove some documents from knowledge folder

**Solution**: Split large documents into smaller focused documents

**Solution**: Set `KNOWLEDGE_LOG_SIZE_WARNINGS=false` to disable warnings (not recommended)

### Document permissions errors

**Solution**: Share document/folder with your Google account (same account running Apps Script)

**Solution**: Verify document isn't in a restricted organizational folder

**Solution**: Try accessing document directly in browser while logged into same account

**Solution**: Use "Anyone with the link can view" sharing setting

### Classification not using knowledge

**Solution**: Check execution logs to verify knowledge is being loaded

**Solution**: Enable `KNOWLEDGE_DEBUG=true` to see knowledge fetching details

**Solution**: Verify knowledge documents contain clear examples and rules

**Solution**: Knowledge may be too generic - make examples more specific

### Cache not refreshing

**Solution**: Wait for cache TTL to expire (default 30 minutes)

**Solution**: Temporarily set `KNOWLEDGE_CACHE_DURATION_MINUTES=0` then restore to 30

**Solution**: Use different document URL to force cache miss

**Solution**: Redeploy the Apps Script project to clear all caches

## Best Practices

### Document Organization

**For INSTRUCTIONS documents**:
- Keep it concise and focused on methodology
- Use clear headings and sections
- Include decision criteria and edge cases
- Update infrequently (stable rules)

**For KNOWLEDGE folders**:
- Organize by category or type
- Use numbered prefixes (01-, 02-) to control fetch order
- Keep documents focused on specific patterns
- Update frequently as you learn new patterns

### Writing Effective Knowledge

**Good examples**:
```
Example: "Can you send me the Q4 report by Friday?"
Label: reply_needed
Reason: Direct question with deadline requiring personal response
```

**Bad examples**:
```
Example: Email about report
Label: reply_needed
```

**Tips**:
- Include actual email text snippets
- Explain why each example gets its label
- Cover edge cases and ambiguous scenarios
- Use real examples from your inbox (anonymize if needed)

### Iterative Improvement

1. **Start simple**: Single instructions document
2. **Monitor results**: Check if classification improves
3. **Add examples**: Create knowledge folder with specific patterns
4. **Refine**: Add examples for misclassified emails
5. **Optimize**: Remove examples that don't help

### Maintenance

**Monthly review**:
- Check token usage warnings
- Remove outdated examples
- Add new patterns discovered
- Verify documents are still accessible

**After major changes**:
- Test classification with debug mode enabled
- Review execution logs for errors
- Verify token usage is reasonable
- Update documentation if rules change

## Migration from Legacy RuleDocService

If you're using the old `RULE_DOC_URL` configuration:

### Old Configuration (deprecated)

```
RULE_DOC_URL = https://docs.google.com/document/d/abc123/edit
```

### New Configuration (recommended)

```
LABEL_INSTRUCTIONS_DOC_URL = https://docs.google.com/document/d/abc123/edit
```

### Migration Steps

1. **Rename property** in Script Properties:
   - Old: `RULE_DOC_URL`
   - New: `LABEL_INSTRUCTIONS_DOC_URL`

2. **Test**: Run email labeling to verify it still works

3. **Optional**: Add knowledge folder for examples:
   ```
   LABEL_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/xyz789
   ```

### Why Migrate

- **Folder support**: Use multiple documents for examples
- **Token transparency**: See utilization metrics
- **Smart caching**: Better Drive API quota management
- **Consistent naming**: Follows INSTRUCTIONS/KNOWLEDGE convention
- **Future-ready**: Prepared for new AI features

## Future: Reply Drafting Knowledge

The Knowledge System is designed to support future AI features:

### Planned Configuration (Future)

```
# Reply Drafting (not yet implemented)
REPLY_DRAFTER_INSTRUCTIONS_URL = https://docs.google.com/document/d/style-guide
REPLY_DRAFTER_KNOWLEDGE_FOLDER_URL = https://drive.google.com/drive/folders/templates
REPLY_DRAFTER_KNOWLEDGE_MAX_DOCS = 5
```

**What this will enable**:
- Custom reply drafting style and tone
- Templates for common response types
- Context from past correspondence
- Domain-specific knowledge for replies

The same Knowledge System architecture will power all future AI features.

## Technical Details

### Architecture

- **KnowledgeService.gs**: Unified knowledge management
- **Cache Service**: Apps Script built-in caching
- **Drive API**: Document and folder fetching
- **Token estimation**: ~4 chars per token (conservative)

### Performance Characteristics

- **Cold fetch**: 1-3 seconds per document (Drive API call)
- **Cached fetch**: < 100ms (Apps Script Cache)
- **Cache duration**: 30 minutes (configurable)
- **Folder fetching**: Sequential document retrieval

### API Quota Impact

**Without caching**:
- 100 email labeling runs = 100+ Drive API calls
- Approaching Drive API quota limits quickly

**With caching** (30-minute TTL):
- 100 email labeling runs = ~5 Drive API calls
- Sustainable for daily automation

## Architecture Decisions

- [ADR-007: Google Drive Rules Integration](../../docs/adr/007-drive-rules-integration.md)
- [ADR-015: INSTRUCTIONS vs KNOWLEDGE Naming Convention](../../docs/adr/015-instructions-knowledge-naming.md)

## See Also

- [Back to README](../../README.md)
- [Configuration Reference](../guides/configuration.md) - All configuration options
- [Troubleshooting Guide](../guides/troubleshooting.md) - General troubleshooting
- [Development Guide](../guides/development.md) - For contributors
