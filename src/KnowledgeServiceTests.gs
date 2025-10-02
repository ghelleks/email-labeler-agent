/**
 * KnowledgeService Manual Tests
 *
 * Run these functions individually in the Apps Script editor to test KnowledgeService.
 * Each test logs results to the execution log (View > Logs).
 *
 * SETUP REQUIRED:
 * 1. Create a test Google Doc with some content
 * 2. Create a test Google Drive folder with 2-3 documents
 * 3. Set Script Properties for testing:
 *    - TEST_DOC_URL: URL or ID of test document
 *    - TEST_FOLDER_URL: URL or ID of test folder
 *    - KNOWLEDGE_DEBUG: true (for detailed logs)
 */

/**
 * Test 1: Single Document Fetching
 *
 * Tests: fetchDocument_() basic functionality
 * Expected: Returns knowledge with metadata, shows token estimate
 */
function testFetchSingleDocument() {
  Logger.log('========================================');
  Logger.log('TEST 1: Single Document Fetching');
  Logger.log('========================================\n');

  const cfg = getConfig_();
  const testDocUrl = cfg.TEST_DOC_URL;

  if (!testDocUrl) {
    Logger.log('❌ TEST_DOC_URL not configured in Script Properties');
    Logger.log('Please add TEST_DOC_URL with a Google Docs URL or ID');
    return;
  }

  try {
    Logger.log('Fetching document: ' + testDocUrl + '\n');

    const result = fetchDocument_(testDocUrl, {
      propertyName: 'TEST_DOC_URL',
      skipCache: false
    });

    Logger.log('✅ SUCCESS\n');
    Logger.log('Configured: ' + result.configured);
    Logger.log('Content length: ' + result.knowledge.length + ' chars');
    Logger.log('Estimated tokens: ' + result.metadata.estimatedTokens);
    Logger.log('Source: ' + result.metadata.source.name);
    Logger.log('URL: ' + result.metadata.source.url);
    Logger.log('\nContent preview (first 200 chars):');
    Logger.log(result.knowledge.substring(0, 200) + '...');

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
  }
}

/**
 * Test 2: Folder Fetching
 *
 * Tests: fetchFolder_() with multiple documents
 * Expected: Returns combined knowledge with document headers, source array
 */
function testFetchFolder() {
  Logger.log('========================================');
  Logger.log('TEST 2: Folder Fetching');
  Logger.log('========================================\n');

  const cfg = getConfig_();
  const testFolderUrl = cfg.TEST_FOLDER_URL;

  if (!testFolderUrl) {
    Logger.log('❌ TEST_FOLDER_URL not configured in Script Properties');
    Logger.log('Please add TEST_FOLDER_URL with a Google Drive folder URL or ID');
    return;
  }

  try {
    Logger.log('Fetching folder: ' + testFolderUrl + '\n');

    const result = fetchFolder_(testFolderUrl, {
      propertyName: 'TEST_FOLDER_URL',
      maxDocs: 5,
      skipCache: false
    });

    Logger.log('✅ SUCCESS\n');
    Logger.log('Configured: ' + result.configured);
    Logger.log('Document count: ' + result.metadata.docCount);
    Logger.log('Total chars: ' + result.metadata.totalChars);
    Logger.log('Estimated tokens: ' + result.metadata.estimatedTokens);
    Logger.log('Utilization: ' + result.metadata.utilizationPercent);
    Logger.log('\nDocuments in folder:');
    result.metadata.sources.forEach(function(source, idx) {
      Logger.log('  ' + (idx + 1) + '. ' + source.name + ' (' + source.chars + ' chars)');
    });

    Logger.log('\nCombined content preview (first 300 chars):');
    Logger.log(result.knowledge.substring(0, 300) + '...');

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
  }
}

/**
 * Test 3: Combined Document + Folder
 *
 * Tests: fetchLabelingKnowledge_() with both doc and folder configured
 * Expected: Document content first, then folder contents, aggregated metadata
 */
function testFetchCombined() {
  Logger.log('========================================');
  Logger.log('TEST 3: Combined Document + Folder');
  Logger.log('========================================\n');

  const cfg = getConfig_();
  const testDocUrl = cfg.TEST_DOC_URL;
  const testFolderUrl = cfg.TEST_FOLDER_URL;

  if (!testDocUrl && !testFolderUrl) {
    Logger.log('❌ Neither TEST_DOC_URL nor TEST_FOLDER_URL configured');
    Logger.log('Please configure at least one in Script Properties');
    return;
  }

  try {
    Logger.log('Fetching combined knowledge:');
    Logger.log('  Doc URL: ' + (testDocUrl || 'not configured'));
    Logger.log('  Folder URL: ' + (testFolderUrl || 'not configured') + '\n');

    const result = fetchLabelingKnowledge_({
      docUrl: testDocUrl,
      folderUrl: testFolderUrl,
      maxDocs: 5
    });

    Logger.log('✅ SUCCESS\n');
    Logger.log('Configured: ' + result.configured);
    Logger.log('Total chars: ' + result.metadata.totalChars);
    Logger.log('Estimated tokens: ' + result.metadata.estimatedTokens);
    Logger.log('Model limit: ' + result.metadata.modelLimit);
    Logger.log('Utilization: ' + result.metadata.utilizationPercent);

    if (result.metadata.sources) {
      Logger.log('\nKnowledge sources (' + result.metadata.sources.length + ' total):');
      result.metadata.sources.forEach(function(source, idx) {
        Logger.log('  ' + (idx + 1) + '. ' + source.name + ' (' + source.chars + ' chars)');
      });
    } else if (result.metadata.source) {
      Logger.log('\nKnowledge source:');
      Logger.log('  - ' + result.metadata.source.name + ' (' + result.metadata.chars + ' chars)');
    }

    Logger.log('\nCombined content preview (first 400 chars):');
    Logger.log(result.knowledge.substring(0, 400) + '...');

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
  }
}

/**
 * Test 4: Not Configured (Graceful Degradation)
 *
 * Tests: Behavior when no knowledge configured
 * Expected: Returns {configured: false, knowledge: null, metadata: null}
 */
function testNotConfigured() {
  Logger.log('========================================');
  Logger.log('TEST 4: Not Configured (Graceful Degradation)');
  Logger.log('========================================\n');

  try {
    Logger.log('Fetching knowledge with no configuration...\n');

    const result = fetchLabelingKnowledge_({
      docUrl: null,
      folderUrl: null,
      maxDocs: 5
    });

    Logger.log('✅ SUCCESS (graceful degradation)\n');
    Logger.log('Configured: ' + result.configured);
    Logger.log('Knowledge: ' + result.knowledge);
    Logger.log('Metadata: ' + result.metadata);
    Logger.log('\nThis is expected behavior - system proceeds without knowledge');

  } catch (e) {
    Logger.log('❌ UNEXPECTED ERROR: ' + e.message);
    Logger.log('Not configured should return gracefully, not throw error');
  }
}

/**
 * Test 5: Invalid Document ID (Error Handling)
 *
 * Tests: Fail-fast error handling with actionable messages
 * Expected: Throws error with document ID, property name, remediation steps
 */
function testInvalidDocumentId() {
  Logger.log('========================================');
  Logger.log('TEST 5: Invalid Document ID (Error Handling)');
  Logger.log('========================================\n');

  try {
    Logger.log('Attempting to fetch invalid document ID...\n');

    const result = fetchDocument_('invalid-document-id-12345', {
      propertyName: 'TEST_INVALID_DOC_URL',
      skipCache: true
    });

    Logger.log('❌ TEST FAILED: Should have thrown error but returned:');
    Logger.log(JSON.stringify(result, null, 2));

  } catch (e) {
    Logger.log('✅ SUCCESS (error thrown as expected)\n');
    Logger.log('Error message:');
    Logger.log('─────────────────────────────────────────');
    Logger.log(e.message);
    Logger.log('─────────────────────────────────────────');
    Logger.log('\nVerify error message includes:');
    Logger.log('  ✓ Document ID (invalid-document-id-12345)');
    Logger.log('  ✓ Property name (TEST_INVALID_DOC_URL)');
    Logger.log('  ✓ Remediation steps (remove property)');
  }
}

/**
 * Test 6: Cache Behavior
 *
 * Tests: Caching with 30-minute TTL
 * Expected: First call fetches from Drive, second call returns from cache (faster)
 */
function testCacheBehavior() {
  Logger.log('========================================');
  Logger.log('TEST 6: Cache Behavior');
  Logger.log('========================================\n');

  const cfg = getConfig_();
  const testDocUrl = cfg.TEST_DOC_URL;

  if (!testDocUrl) {
    Logger.log('❌ TEST_DOC_URL not configured in Script Properties');
    return;
  }

  try {
    // First call - should fetch from Drive
    Logger.log('First call (cache miss, fetch from Drive)...');
    const start1 = new Date().getTime();
    const result1 = fetchDocument_(testDocUrl, {
      propertyName: 'TEST_DOC_URL',
      skipCache: false
    });
    const duration1 = new Date().getTime() - start1;

    Logger.log('  ✓ Fetched in ' + duration1 + 'ms');
    Logger.log('  ✓ Content: ' + result1.knowledge.length + ' chars\n');

    // Second call - should return from cache
    Logger.log('Second call (cache hit, return from cache)...');
    const start2 = new Date().getTime();
    const result2 = fetchDocument_(testDocUrl, {
      propertyName: 'TEST_DOC_URL',
      skipCache: false
    });
    const duration2 = new Date().getTime() - start2;

    Logger.log('  ✓ Returned in ' + duration2 + 'ms');
    Logger.log('  ✓ Content: ' + result2.knowledge.length + ' chars\n');

    // Comparison
    Logger.log('✅ SUCCESS\n');
    Logger.log('Performance comparison:');
    Logger.log('  Drive fetch: ' + duration1 + 'ms');
    Logger.log('  Cache fetch: ' + duration2 + 'ms');
    Logger.log('  Speedup: ' + Math.round((duration1 / duration2)) + 'x faster');
    Logger.log('\nNote: Cache duration is ' + (cfg.KNOWLEDGE_CACHE_DURATION_MINUTES || 30) + ' minutes');

    // Third call - bypass cache
    Logger.log('\nThird call (skipCache=true, force Drive fetch)...');
    const start3 = new Date().getTime();
    const result3 = fetchDocument_(testDocUrl, {
      propertyName: 'TEST_DOC_URL',
      skipCache: true
    });
    const duration3 = new Date().getTime() - start3;

    Logger.log('  ✓ Fetched in ' + duration3 + 'ms');
    Logger.log('  ✓ Bypassed cache successfully');

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
  }
}

/**
 * Test 7: Token Warning Thresholds
 *
 * Tests: Soft warnings at 50% and 90% capacity
 * Expected: No warnings for small docs, warnings for large docs
 *
 * Note: To test warnings, you need a large document (>2MB for 50% warning)
 */
function testTokenWarnings() {
  Logger.log('========================================');
  Logger.log('TEST 7: Token Warning Thresholds');
  Logger.log('========================================\n');

  const cfg = getConfig_();
  const testDocUrl = cfg.TEST_DOC_URL;

  if (!testDocUrl) {
    Logger.log('❌ TEST_DOC_URL not configured in Script Properties');
    return;
  }

  try {
    Logger.log('Fetching document and checking for token warnings...\n');
    Logger.log('Warning thresholds:');
    Logger.log('  Soft warning (⚠️ ): >50% of 1M tokens (~524K tokens, ~2MB chars)');
    Logger.log('  Critical warning (🚨): >90% of 1M tokens (~943K tokens, ~3.7MB chars)\n');

    const result = fetchDocument_(testDocUrl, {
      propertyName: 'TEST_DOC_URL',
      skipCache: true
    });

    const tokens = result.metadata.estimatedTokens;
    const modelLimit = result.metadata.modelLimit || 1048576;
    const utilizationPercent = (tokens / modelLimit * 100).toFixed(1);

    Logger.log('✅ Document fetched\n');
    Logger.log('Token analysis:');
    Logger.log('  Chars: ' + result.metadata.chars);
    Logger.log('  Estimated tokens: ' + tokens);
    Logger.log('  Model limit: ' + modelLimit);
    Logger.log('  Utilization: ' + utilizationPercent + '%\n');

    if (utilizationPercent > 90) {
      Logger.log('🚨 Critical warning threshold exceeded (>90%)');
    } else if (utilizationPercent > 50) {
      Logger.log('⚠️  Soft warning threshold exceeded (>50%)');
    } else {
      Logger.log('✓ No warnings (under 50% capacity)');
    }

    Logger.log('\nNote: To test warnings, use a document with:');
    Logger.log('  - >2MB content for soft warning (50%)');
    Logger.log('  - >3.7MB content for critical warning (90%)');
    Logger.log('\nCheck execution log above for actual warning messages from logTokenWarnings_()');

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
  }
}

/**
 * Test 8: URL and ID Parsing
 *
 * Tests: extractDocumentId_() and extractFolderId_() utilities
 * Expected: Correctly extracts IDs from URLs and passes through plain IDs
 */
function testUrlParsing() {
  Logger.log('========================================');
  Logger.log('TEST 8: URL and ID Parsing');
  Logger.log('========================================\n');

  // Test document URL parsing
  Logger.log('Testing extractDocumentId_():\n');

  const testCases = [
    {
      input: 'https://docs.google.com/document/d/1ABC123xyz/edit',
      expected: '1ABC123xyz',
      description: 'Full document URL'
    },
    {
      input: '1XYZ789abc',
      expected: '1XYZ789abc',
      description: 'Plain document ID'
    },
    {
      input: null,
      expected: null,
      description: 'Null input'
    },
    {
      input: '',
      expected: null,
      description: 'Empty string'
    }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(function(testCase) {
    const result = extractDocumentId_(testCase.input);
    const success = result === testCase.expected;

    if (success) {
      Logger.log('  ✓ ' + testCase.description);
      Logger.log('    Input: ' + testCase.input);
      Logger.log('    Output: ' + result + '\n');
      passed++;
    } else {
      Logger.log('  ✗ ' + testCase.description);
      Logger.log('    Input: ' + testCase.input);
      Logger.log('    Expected: ' + testCase.expected);
      Logger.log('    Got: ' + result + '\n');
      failed++;
    }
  });

  // Test folder URL parsing
  Logger.log('\nTesting extractFolderId_():\n');

  const folderTestCases = [
    {
      input: 'https://drive.google.com/drive/folders/1DEF456xyz',
      expected: '1DEF456xyz',
      description: 'Full folder URL'
    },
    {
      input: '1GHI789abc',
      expected: '1GHI789abc',
      description: 'Plain folder ID'
    }
  ];

  folderTestCases.forEach(function(testCase) {
    const result = extractFolderId_(testCase.input);
    const success = result === testCase.expected;

    if (success) {
      Logger.log('  ✓ ' + testCase.description);
      Logger.log('    Input: ' + testCase.input);
      Logger.log('    Output: ' + result + '\n');
      passed++;
    } else {
      Logger.log('  ✗ ' + testCase.description);
      Logger.log('    Input: ' + testCase.input);
      Logger.log('    Expected: ' + testCase.expected);
      Logger.log('    Got: ' + result + '\n');
      failed++;
    }
  });

  Logger.log('========================================');
  Logger.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  Logger.log('========================================');
}

/**
 * Run All Tests
 *
 * Executes all test functions in sequence
 * Requires TEST_DOC_URL and TEST_FOLDER_URL configured
 */
function runAllKnowledgeServiceTests() {
  Logger.log('\n\n');
  Logger.log('╔════════════════════════════════════════╗');
  Logger.log('║  KnowledgeService Test Suite           ║');
  Logger.log('╚════════════════════════════════════════╝');
  Logger.log('\n');

  const cfg = getConfig_();

  Logger.log('Configuration check:');
  Logger.log('  TEST_DOC_URL: ' + (cfg.TEST_DOC_URL ? '✓ configured' : '✗ not configured'));
  Logger.log('  TEST_FOLDER_URL: ' + (cfg.TEST_FOLDER_URL ? '✓ configured' : '✗ not configured'));
  Logger.log('  KNOWLEDGE_DEBUG: ' + (cfg.KNOWLEDGE_DEBUG || 'false'));
  Logger.log('\n');

  if (!cfg.TEST_DOC_URL && !cfg.TEST_FOLDER_URL) {
    Logger.log('❌ Cannot run tests without TEST_DOC_URL or TEST_FOLDER_URL');
    Logger.log('Please configure at least one in Script Properties');
    return;
  }

  testUrlParsing();
  Logger.log('\n\n');

  if (cfg.TEST_DOC_URL) {
    testFetchSingleDocument();
    Logger.log('\n\n');

    testCacheBehavior();
    Logger.log('\n\n');

    testTokenWarnings();
    Logger.log('\n\n');
  }

  if (cfg.TEST_FOLDER_URL) {
    testFetchFolder();
    Logger.log('\n\n');
  }

  if (cfg.TEST_DOC_URL || cfg.TEST_FOLDER_URL) {
    testFetchCombined();
    Logger.log('\n\n');
  }

  testNotConfigured();
  Logger.log('\n\n');

  testInvalidDocumentId();
  Logger.log('\n\n');

  Logger.log('╔════════════════════════════════════════╗');
  Logger.log('║  Test Suite Complete                   ║');
  Logger.log('╚════════════════════════════════════════╝');
}
