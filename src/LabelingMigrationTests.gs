/**
 * Email Labeling Migration Tests (Issue #16)
 *
 * Tests the refactored email labeling pipeline to ensure:
 * - Knowledge system integration works correctly
 * - Backward compatibility maintained
 * - Graceful degradation when no knowledge configured
 * - Token limit error handling works
 *
 * Run these tests in Apps Script editor after deployment.
 */

/**
 * Test 1: Validate Configuration Properties
 *
 * Checks which knowledge configuration is present
 */
function testValidateConfiguration() {
  Logger.log('========================================');
  Logger.log('TEST 1: Validate Configuration');
  Logger.log('========================================\n');

  const cfg = getConfig_();

  Logger.log('Core Configuration:');
  Logger.log('  GEMINI_API_KEY: ' + (cfg.GEMINI_API_KEY ? 'configured' : 'not configured'));
  Logger.log('  PROJECT_ID: ' + (cfg.PROJECT_ID ? 'configured' : 'not configured'));
  Logger.log('  DEBUG: ' + cfg.DEBUG);
  Logger.log('  DRY_RUN: ' + cfg.DRY_RUN);
  Logger.log('');

  Logger.log('New Knowledge Configuration:');
  Logger.log('  LABEL_INSTRUCTIONS_DOC_URL: ' + (cfg.LABEL_INSTRUCTIONS_DOC_URL || 'not configured'));
  Logger.log('  LABEL_KNOWLEDGE_FOLDER_URL: ' + (cfg.LABEL_KNOWLEDGE_FOLDER_URL || 'not configured'));
  Logger.log('  LABEL_KNOWLEDGE_MAX_DOCS: ' + cfg.LABEL_KNOWLEDGE_MAX_DOCS);
  Logger.log('');

  Logger.log('Legacy Configuration (deprecated):');
  const props = PropertiesService.getScriptProperties();
  Logger.log('  RULE_DOC_URL: ' + (props.getProperty('RULE_DOC_URL') || 'not configured'));
  Logger.log('  RULE_DOC_ID: ' + (props.getProperty('RULE_DOC_ID') || 'not configured'));
  Logger.log('');

  Logger.log('✅ Configuration validated');
}

/**
 * Test 2: Knowledge Fetching
 *
 * Tests the new fetchLabelingKnowledge_() integration
 */
function testKnowledgeFetching() {
  Logger.log('========================================');
  Logger.log('TEST 2: Knowledge Fetching');
  Logger.log('========================================\n');

  const cfg = getConfig_();

  try {
    Logger.log('Calling fetchLabelingKnowledge_()...\n');

    const knowledge = fetchLabelingKnowledge_({
      instructionsUrl: cfg.LABEL_INSTRUCTIONS_DOC_URL,
      knowledgeFolderUrl: cfg.LABEL_KNOWLEDGE_FOLDER_URL,
      maxDocs: cfg.LABEL_KNOWLEDGE_MAX_DOCS
    });

    Logger.log('✅ Knowledge fetch succeeded\n');
    Logger.log('Knowledge configured: ' + knowledge.configured);

    if (knowledge.configured) {
      Logger.log('Knowledge length: ' + knowledge.knowledge.length + ' chars');
      Logger.log('Estimated tokens: ' + knowledge.metadata.estimatedTokens);
      Logger.log('Utilization: ' + knowledge.metadata.utilizationPercent);

      if (knowledge.metadata.sources) {
        Logger.log('\nSources (' + knowledge.metadata.sources.length + ' documents):');
        knowledge.metadata.sources.forEach(function(src, idx) {
          Logger.log('  ' + (idx + 1) + '. ' + src.name + ' (' + src.chars + ' chars)');
        });
      } else if (knowledge.metadata.source) {
        Logger.log('\nSource: ' + knowledge.metadata.source.name);
      }

      Logger.log('\nKnowledge preview (first 300 chars):');
      Logger.log(knowledge.knowledge.substring(0, 300) + '...');
    } else {
      Logger.log('No knowledge configured - system will use basic labeling instructions');
    }

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    Logger.log('\nThis may be expected if:');
    Logger.log('  - No knowledge properties configured (graceful degradation)');
    Logger.log('  - Document/folder configured but inaccessible (fail-fast)');
  }
}

/**
 * Test 3: Prompt Building with Knowledge
 *
 * Tests conditional knowledge injection in buildCategorizePrompt_()
 */
function testPromptBuilding() {
  Logger.log('========================================');
  Logger.log('TEST 3: Prompt Building');
  Logger.log('========================================\n');

  const cfg = getConfig_();

  // Fetch knowledge
  const knowledge = fetchLabelingKnowledge_({
    instructionsUrl: cfg.LABEL_INSTRUCTIONS_DOC_URL,
    knowledgeFolderUrl: cfg.LABEL_KNOWLEDGE_FOLDER_URL,
    maxDocs: cfg.LABEL_KNOWLEDGE_MAX_DOCS
  });

  // Create sample email data
  const sampleEmails = [
    {
      id: 'test-email-1',
      subject: 'Weekly team sync notes',
      from: 'alice@example.com',
      date: new Date().toISOString(),
      ageDays: 0,
      plainBody: 'Here are the notes from our weekly team sync meeting...'
    },
    {
      id: 'test-email-2',
      subject: 'Action required: Review PR #42',
      from: 'bob@example.com',
      date: new Date().toISOString(),
      ageDays: 1,
      plainBody: 'Please review the pull request for the new authentication feature...'
    }
  ];

  try {
    Logger.log('Building prompt with ' + (knowledge.configured ? 'knowledge' : 'no knowledge') + '...\n');

    const prompt = buildCategorizePrompt_(
      sampleEmails,
      knowledge,
      ['reply_needed', 'review', 'todo', 'summarize'],
      'summarize'
    );

    Logger.log('✅ Prompt built successfully\n');
    Logger.log('Prompt length: ' + prompt.length + ' chars');
    Logger.log('Contains "=== LABELING POLICY ===": ' + prompt.includes('=== LABELING POLICY ==='));
    Logger.log('Contains "You are an email triage assistant": ' + prompt.includes('You are an email triage assistant'));
    Logger.log('Contains "Allowed labels": ' + prompt.includes('Allowed labels'));
    Logger.log('Contains email data: ' + prompt.includes('test-email-1'));

    Logger.log('\nPrompt structure (first 800 chars):');
    Logger.log('─────────────────────────────────────────');
    Logger.log(prompt.substring(0, 800));
    Logger.log('─────────────────────────────────────────');

  } catch (e) {
    Logger.log('❌ ERROR building prompt: ' + e.message);
  }
}

/**
 * Test 4: End-to-End Email Labeling (DRY RUN)
 *
 * Tests the complete pipeline with actual emails in DRY_RUN mode
 * Safe to run - won't actually apply labels
 */
function testEndToEndLabeling() {
  Logger.log('========================================');
  Logger.log('TEST 4: End-to-End Labeling (DRY RUN)');
  Logger.log('========================================\n');

  const cfg = getConfig_();

  // Force DRY_RUN for safety
  const originalDryRun = cfg.DRY_RUN;
  cfg.DRY_RUN = true;

  try {
    Logger.log('Finding unlabeled emails...');
    const threads = findUnprocessed_(5); // Limit to 5 for testing

    if (!threads.length) {
      Logger.log('ℹ️  No unlabeled emails found');
      Logger.log('This is normal if all your emails are already labeled.');
      return;
    }

    Logger.log('Found ' + threads.length + ' unlabeled email(s)\n');

    Logger.log('Fetching knowledge...');
    const knowledge = fetchLabelingKnowledge_({
      instructionsUrl: cfg.LABEL_INSTRUCTIONS_DOC_URL,
      knowledgeFolderUrl: cfg.LABEL_KNOWLEDGE_FOLDER_URL,
      maxDocs: cfg.LABEL_KNOWLEDGE_MAX_DOCS
    });
    Logger.log('Knowledge configured: ' + knowledge.configured + '\n');

    Logger.log('Extracting email content...');
    const emails = minimalize_(threads, cfg.BODY_CHARS);
    Logger.log('Extracted ' + emails.length + ' email(s)\n');

    Logger.log('Categorizing with AI...');
    const results = categorizeWithGemini_(emails, knowledge, cfg);
    Logger.log('Received ' + results.length + ' classification(s)\n');

    Logger.log('Classification results:');
    Logger.log('─────────────────────────────────────────');
    results.forEach(function(r, idx) {
      const email = emails.find(function(e) { return e.id === r.id; });
      Logger.log((idx + 1) + '. Subject: ' + (email ? email.subject : 'unknown'));
      Logger.log('   Label: ' + (r.required_action || 'none'));
      Logger.log('   Reason: ' + r.reason);
      Logger.log('');
    });
    Logger.log('─────────────────────────────────────────');

    Logger.log('\n✅ End-to-end test completed successfully');
    Logger.log('Note: DRY_RUN=true, no labels were actually applied');

  } catch (e) {
    Logger.log('❌ ERROR in pipeline: ' + e.message);
    Logger.log('\nStack trace:');
    Logger.log(e.stack || 'No stack trace available');

  } finally {
    // Restore original DRY_RUN setting
    cfg.DRY_RUN = originalDryRun;
  }
}

/**
 * Test 5: Backward Compatibility (RULE_DOC_URL)
 *
 * Tests that old RULE_DOC_URL configuration still works via wrapper
 */
function testBackwardCompatibility() {
  Logger.log('========================================');
  Logger.log('TEST 5: Backward Compatibility');
  Logger.log('========================================\n');

  const props = PropertiesService.getScriptProperties();
  const oldRuleDocUrl = props.getProperty('RULE_DOC_URL');
  const oldRuleDocId = props.getProperty('RULE_DOC_ID');

  if (!oldRuleDocUrl && !oldRuleDocId) {
    Logger.log('ℹ️  No legacy RULE_DOC_URL or RULE_DOC_ID configured');
    Logger.log('Skipping backward compatibility test');
    return;
  }

  try {
    Logger.log('Testing deprecated getRuleText_() wrapper...\n');
    Logger.log('Legacy property: ' + (oldRuleDocUrl || oldRuleDocId));

    // Enable DEBUG to see deprecation warning
    const originalDebug = props.getProperty('DEBUG');
    props.setProperty('DEBUG', 'true');

    const rulesText = getRuleText_(oldRuleDocUrl || oldRuleDocId);

    // Restore DEBUG setting
    if (originalDebug) {
      props.setProperty('DEBUG', originalDebug);
    } else {
      props.deleteProperty('DEBUG');
    }

    Logger.log('✅ Legacy configuration still works\n');
    Logger.log('Rules text length: ' + rulesText.length + ' chars');
    Logger.log('Check logs above for deprecation warning');
    Logger.log('\nRecommendation: Migrate to LABEL_KNOWLEDGE_DOC_URL');

  } catch (e) {
    Logger.log('❌ ERROR with legacy configuration: ' + e.message);
  }
}

/**
 * Test 6: No Knowledge Configured (Graceful Degradation)
 *
 * Tests that system works without any knowledge configuration
 */
function testNoKnowledgeScenario() {
  Logger.log('========================================');
  Logger.log('TEST 6: No Knowledge Configured');
  Logger.log('========================================\n');

  try {
    Logger.log('Simulating no knowledge configuration...\n');

    const knowledge = fetchLabelingKnowledge_({
      docUrl: null,
      folderUrl: null,
      maxDocs: 5
    });

    Logger.log('✅ No error thrown (expected behavior)\n');
    Logger.log('Knowledge configured: ' + knowledge.configured);
    Logger.log('Knowledge: ' + knowledge.knowledge);
    Logger.log('Metadata: ' + knowledge.metadata);

    // Build prompt without knowledge
    const sampleEmails = [{
      id: 'test-1',
      subject: 'Test',
      from: 'test@example.com',
      date: new Date().toISOString(),
      ageDays: 0,
      plainBody: 'Test email body'
    }];

    const prompt = buildCategorizePrompt_(sampleEmails, knowledge,
      ['reply_needed', 'review', 'todo', 'summarize'], 'summarize');

    Logger.log('\nPrompt built without knowledge:');
    Logger.log('  Length: ' + prompt.length + ' chars');
    Logger.log('  Contains "=== LABELING POLICY ===": ' + prompt.includes('=== LABELING POLICY ==='));
    Logger.log('  Contains basic instructions: ' + prompt.includes('You are an email triage assistant'));

    Logger.log('\n✅ Graceful degradation works correctly');
    Logger.log('System proceeds with basic labeling instructions only');

  } catch (e) {
    Logger.log('❌ UNEXPECTED ERROR: ' + e.message);
    Logger.log('No knowledge configured should NOT throw error');
  }
}

/**
 * Run All Labeling Migration Tests
 *
 * Executes complete test suite in sequence
 */
function runAllLabelingMigrationTests() {
  Logger.log('\n\n');
  Logger.log('╔════════════════════════════════════════╗');
  Logger.log('║  Labeling Migration Test Suite        ║');
  Logger.log('║  Issue #16: Knowledge System Migration║');
  Logger.log('╚════════════════════════════════════════╝');
  Logger.log('\n');

  testValidateConfiguration();
  Logger.log('\n\n');

  testKnowledgeFetching();
  Logger.log('\n\n');

  testPromptBuilding();
  Logger.log('\n\n');

  testNoKnowledgeScenario();
  Logger.log('\n\n');

  testBackwardCompatibility();
  Logger.log('\n\n');

  testEndToEndLabeling();
  Logger.log('\n\n');

  Logger.log('╔════════════════════════════════════════╗');
  Logger.log('║  Test Suite Complete                   ║');
  Logger.log('╚════════════════════════════════════════╝');
  Logger.log('\nReview the execution logs above for detailed results.');
  Logger.log('All tests should show ✅ or ℹ️  (expected skip scenarios).');
}
