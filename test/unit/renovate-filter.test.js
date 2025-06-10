const { test, describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { 
  readErrFromNdjsonFile, 
  filterExcludedErrorMessages,
  readNdjsonFile,
  uniqueReposMap,
  mergeRequestStats
} = require('../../app/renovate-filter.js');

// Path to test fixtures
const TEST_LOG_FILE = path.resolve(__dirname, '../fixtures/sample.ndjson');

// Ensure test file exists
assert.ok(fs.existsSync(TEST_LOG_FILE), `Test file ${TEST_LOG_FILE} not found!`);

describe('renovate-filter', () => {
  test('filterExcludedErrorMessages filters out specified error messages', async () => {
    const testErrors = [
      { msg: 'Error 1', repository: 'repo1' },
      { msg: 'Excluded Error', repository: 'repo2' },
      { msg: 'Error 2', repository: 'repo3' }
    ];
    
    const excludedMessages = ['Excluded Error'];
    const result = filterExcludedErrorMessages(testErrors, excludedMessages);
    
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].msg, 'Error 1');
    assert.strictEqual(result[1].msg, 'Error 2');
  });

  test('uniqueReposMap creates a map of unique repositories', async () => {
    const testRepos = [
      { repository: 'repo1', prTitle: 'PR 1' },
      { repository: 'repo2', prTitle: 'PR 2' },
      { repository: 'repo1', prTitle: 'PR 1 Updated' } // Duplicate repo
    ];
    
    const result = uniqueReposMap(testRepos);
    
    assert.strictEqual(result.size, 2);
    assert.strictEqual(result.get('repo1'), 'PR 1 Updated'); // Should have the latest value
    assert.strictEqual(result.get('repo2'), 'PR 2');
  });

  test('mergeRequestStats counts PR created and updated correctly', async () => {
    const testLogs = [
      { msg: 'PR created', repository: 'repo1' },
      { msg: 'PR updated', repository: 'repo1' },
      { msg: 'PR created', repository: 'repo2' },
      { msg: 'Something else', repository: 'repo3' }
    ];
    
    const result = mergeRequestStats(testLogs);
    
    assert.strictEqual(result.prCreated, 2);
    assert.strictEqual(result.prUpdated, 1);
  });

  test('readNdjsonFile reads and parses NDJSON files correctly', async () => {
    const result = await readNdjsonFile(TEST_LOG_FILE);
    
    assert.ok(Array.isArray(result), 'Result should be an array');
    assert.ok(result.length > 0, 'Result should contain items');
    
    // Check that expected fields are removed
    const firstItem = result[0];
    assert.strictEqual(firstItem.name, undefined);
    assert.strictEqual(firstItem.hostname, undefined);
    assert.strictEqual(firstItem.pid, undefined);
    assert.strictEqual(firstItem.level, undefined);
    assert.strictEqual(firstItem.logContext, undefined);
    assert.strictEqual(firstItem.time, undefined);
    assert.strictEqual(firstItem.v, undefined);
  });

  test('readErrFromNdjsonFile extracts error records from NDJSON files', async () => {
    const result = await readErrFromNdjsonFile(TEST_LOG_FILE);
    
    assert.ok(Array.isArray(result), 'Result should be an array');
    
    // If there are errors in the test file, check error properties
    if (result.length > 0) {
      const firstError = result[0];
      assert.ok(firstError.repository, 'Error should have repository');
      assert.strictEqual(firstError.name, undefined);
      assert.strictEqual(firstError.hostname, undefined);
      assert.strictEqual(firstError.pid, undefined);
    }
  });
});