/** @jest-environment node */
const mockSpawnSync = jest.fn();
jest.mock('child_process', () => ({ spawnSync: (...args) => mockSpawnSync(...args) }));
jest.mock('dotenv', () => ({ config: jest.fn() }));
const mockMongoSync = jest.fn();
jest.mock('../lib/domain/sync/airtableMongoSync', () => ({
  ...jest.requireActual('../lib/domain/sync/airtableMongoSync'),
  syncAirtableToMongoDB: (...args) => mockMongoSync(...args),
}));
const { parseSyncCliArgs, runScheduledMembershipSync } = require('../utils/sync-airtable');
const originalEnv = process.env;
let errorLog;
beforeEach(() => {
  process.env = { AIRTABLE_PAT: 'test-token', AIRTABLE_MIGHTY_SYNC_BASE_ID: 'base', MONGODB_URI: 'mongodb://test',
    MIGHTY_NETWORK_API_KEY: 'test-key', MIGHTY_NETWORK_ID: '123', REDIS_URL: 'redis://test' };
  mockSpawnSync.mockReset().mockReturnValue({ status: 0 });
  mockMongoSync.mockReset().mockResolvedValue({ matchedCount: 1 });
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { process.env = originalEnv; errorLog.mockRestore(); });

test('defaults to delta and preserves full/stale selection and explicit skips', () => {
  expect(parseSyncCliArgs([])).toMatchObject({ delta: true, safetyBatch: 100 });
  expect(parseSyncCliArgs(['--full', '--safety-batch', '250'])).toMatchObject({ full: true, delta: false, safetyBatch: 250 });
  expect(parseSyncCliArgs(['--stale-only'])).toMatchObject({ staleOnly: true, delta: false });
  expect(parseSyncCliArgs(['--skip-mighty', '--skip-cache'])).toMatchObject({ skipMighty: true, skipCache: true });
});
test.each(['REDIS_URL', 'MONGODB_URI', 'AIRTABLE_PAT'])('missing %s fails before upstream mutations', async (key) => {
  delete process.env[key];
  await expect(runScheduledMembershipSync()).rejects.toThrow();
  expect(mockSpawnSync).not.toHaveBeenCalled();
  expect(mockMongoSync).not.toHaveBeenCalled();
});
test('does not run Mongo or invalidate cache after Mighty failure', async () => {
  mockSpawnSync.mockReturnValue({ status: 1 });
  await expect(runScheduledMembershipSync()).rejects.toThrow('Mighty to Airtable sync failed');
  expect(mockMongoSync).not.toHaveBeenCalled();
  expect(mockSpawnSync).toHaveBeenCalledTimes(1);
});
test('Mongo failure prevents cache invalidation and successful completion', async () => {
  mockMongoSync.mockRejectedValue(new Error('write failed'));
  await expect(runScheduledMembershipSync()).rejects.toThrow('write failed');
  expect(mockSpawnSync).toHaveBeenCalledTimes(1);
  expect(errorLog.mock.calls.flat().join(' ')).not.toContain('sync_airtable_scheduled_done');
});
test('cache failure is propagated after committed Mongo writes', async () => {
  mockSpawnSync.mockReturnValueOnce({ status: 0 }).mockReturnValueOnce({ status: 1 });
  await expect(runScheduledMembershipSync()).rejects.toThrow('Redis cache invalidation failed');
  expect(mockMongoSync).toHaveBeenCalledTimes(1);
  expect(errorLog.mock.calls.flat().join(' ')).not.toContain('sync_airtable_scheduled_done');
});
test('successful pipeline completes Mongo before invalidating cache', async () => {
  await runScheduledMembershipSync();
  expect(mockSpawnSync.mock.calls[1][1]).toContain('scripts/invalidate-mighty-member-caches.ts');
  expect(mockMongoSync.mock.invocationCallOrder[0]).toBeLessThan(mockSpawnSync.mock.invocationCallOrder[1]);
  expect(errorLog.mock.calls.flat().join(' ')).toContain('sync_airtable_scheduled_done');
});
test('explicit Airtable-only/cache skip still works', async () => {
  process.env.SKIP_MIGHTY_SYNC = '1';
  process.env.SKIP_CACHE_INVALIDATION = '1';
  delete process.env.REDIS_URL;
  await runScheduledMembershipSync();
  expect(mockSpawnSync).not.toHaveBeenCalled();
  expect(mockMongoSync).toHaveBeenCalledTimes(1);
});

test.each([['--sleep-ms', '-1'], ['--retry-rounds', '0'], ['--safety-batch', 'no'], ['--sleep-ms']])('rejects invalid pacing option %j', (...args) => {
  expect(() => parseSyncCliArgs(args)).toThrow('Invalid sync option');
});
test('explicit upstream failure override is reported as degraded', async () => {
  process.env.SYNC_REQUIRE_COMPLETE = '0';
  mockSpawnSync.mockReturnValueOnce({ status: 1 }).mockReturnValueOnce({ status: 0 });
  await runScheduledMembershipSync();
  expect(errorLog.mock.calls.flat().join(' ')).toContain('"status":"degraded"');
});
test('upstream subprocess receives the same server-only table configuration', async () => {
  process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME = 'Mighty Members/Sync';
  await runScheduledMembershipSync();
  expect(mockSpawnSync.mock.calls[0][2].env).toMatchObject({
    AIRTABLE_PAT: 'test-token', AIRTABLE_MIGHTY_SYNC_BASE_ID: 'base', AIRTABLE_MIGHTY_SYNC_TABLE_ID: 'Mighty Members/Sync',
  });
});
test('actual CLI exits nonzero and reports missing config without secrets', () => {
  const { spawnSync } = jest.requireActual('child_process');
  const result = spawnSync(process.execPath, ['utils/sync-airtable.js'], {
    cwd: require('path').join(__dirname, '..'),
    env: { PATH: originalEnv.PATH, AIRTABLE_PAT: 'do-not-log-this' }, encoding: 'utf8', timeout: 10000,
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('AIRTABLE_MIGHTY_SYNC_BASE_ID is required');
  expect(result.stderr).not.toContain('do-not-log-this');
});
