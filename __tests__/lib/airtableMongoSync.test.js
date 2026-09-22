/** @jest-environment node */
const { readConfig, getAllRecordsFromAirtable, normalizeRecords, syncAirtableToMongoDB } = require('../../lib/domain/sync/airtableMongoSync');
const env = { AIRTABLE_PAT: 'private-secret', AIRTABLE_MIGHTY_SYNC_BASE_ID: 'base',
  AIRTABLE_MIGHTY_SYNC_TABLE_NAME: 'Mighty Members/Sync', MONGODB_URI: 'mongodb://test' };
const row = (fields = {}, id = 'rec1') => ({ id, fields: { 'Mighty Member ID': 123, 'Primary Email': 'member@example.org', ...fields } });
function fixture(records = [row()], docs = []) {
  const http = { get: jest.fn().mockResolvedValue({ data: { records } }) };
  const session = { endSession: jest.fn().mockResolvedValue(), withTransaction: jest.fn(async (callback) => callback()) };
  const collection = { createIndex: jest.fn().mockResolvedValue('index'),
    find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(docs) })),
    bulkWrite: jest.fn().mockResolvedValue({ modifiedCount: 1, upsertedCount: 0 }) };
  const client = { connect: jest.fn().mockResolvedValue(), close: jest.fn().mockResolvedValue(),
    startSession: jest.fn(() => session), db: jest.fn(() => ({ collection: jest.fn(() => collection) })) };
  const MongoClient = jest.fn(() => client);
  const options = { env, http, MongoClient, sleep: jest.fn().mockResolvedValue() };
  return { options, http, session, collection, client, MongoClient };
}

describe('fetch and preflight', () => {
  test('never falls back to public-prefixed credentials', () => {
    expect(() => readConfig({ NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN: 'public' })).toThrow('server-only');
    expect(() => readConfig({ ...env, MONGODB_URI: '', NEXT_PUBLIC_MONGODB_URI: 'public' })).toThrow('MONGODB_URI');
    expect(readConfig({ ...env, NEXT_PUBLIC_MONGODB_URI: 'public' }).mongoUri).toBe(env.MONGODB_URI);
  });
  test('validates Mongo configuration before requesting Airtable', async () => {
    const f = fixture();
    await expect(syncAirtableToMongoDB({ ...f.options, env: { ...env, MONGODB_URI: '' } })).rejects.toThrow('MONGODB_URI');
    expect(f.http.get).not.toHaveBeenCalled();
  });
  test('fetches every page, encodes table names, and sets a timeout', async () => {
    const f = fixture();
    f.http.get.mockResolvedValueOnce({ data: { records: [row()], offset: 'next' } })
      .mockResolvedValueOnce({ data: { records: [row({}, 'rec2')] } });
    expect(await getAllRecordsFromAirtable(f.options)).toHaveLength(2);
    expect(f.http.get.mock.calls[0][0]).toContain('Mighty%20Members%2FSync');
    expect(f.http.get.mock.calls[1][1]).toMatchObject({ timeout: 30000, params: { offset: 'next' } });
  });
  test('late page failure prevents all Mongo writes and redacts Axios details', async () => {
    const f = fixture();
    f.http.get.mockResolvedValueOnce({ data: { records: [row()], offset: 'next' } }).mockRejectedValue({
      response: { status: 401, data: { token: 'private-secret' } }, config: { headers: { Authorization: 'private-secret' } },
    });
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('HTTP 401');
    expect(f.http.get).toHaveBeenCalledTimes(2);
    expect(f.MongoClient).not.toHaveBeenCalled();
    expect(f.options.sleep).not.toHaveBeenCalled();
  });
  test('bounds transient retries', async () => {
    const f = fixture();
    f.http.get.mockRejectedValue({ response: { status: 503 } });
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('HTTP 503');
    expect(f.http.get).toHaveBeenCalledTimes(4);
    expect(f.options.sleep.mock.calls.flat()).toEqual([1000, 2000, 4000]);
    expect(f.MongoClient).not.toHaveBeenCalled();
  });
  test('honors rate limiting and retries successfully', async () => {
    const f = fixture([]);
    f.http.get.mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '45' } } });
    expect(await getAllRecordsFromAirtable(f.options)).toEqual([]);
    expect(f.options.sleep).toHaveBeenCalledWith(45000);
  });
  test('excessive Retry-After fails rather than retrying too soon', async () => {
    const f = fixture();
    f.http.get.mockRejectedValue({ response: { status: 429, headers: { 'retry-after': '300' } } });
    await expect(getAllRecordsFromAirtable(f.options)).rejects.toThrow('retry the job later');
    expect(f.http.get).toHaveBeenCalledTimes(1);
  });
  test.each([{ records: null }, { records: [], offset: 3 }, { records: [], offset: '' }])('rejects malformed pages: %j', async (data) => {
    const f = fixture();
    f.http.get.mockResolvedValue({ data });
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('Invalid Airtable response');
    expect(f.MongoClient).not.toHaveBeenCalled();
  });
  test('detects repeated offsets', async () => {
    const f = fixture();
    f.http.get.mockResolvedValue({ data: { records: [], offset: 'loop' } });
    await expect(getAllRecordsFromAirtable(f.options)).rejects.toThrow('Repeated Airtable');
  });
  test('empty source is a successful no-op', async () => {
    const f = fixture([]);
    await expect(syncAirtableToMongoDB(f.options)).resolves.toMatchObject({ fetchedCount: 0, upsertedCount: 0 });
    expect(f.MongoClient).not.toHaveBeenCalled();
  });
});

describe('identity and field ownership', () => {
  test.each([true, false, 1.5, -1, 0, '9007199254740993', 'abc'])('rejects invalid Mighty ID %j', (id) => {
    expect(() => normalizeRecords([row({ 'Mighty Member ID': id })])).toThrow('positive safe integer');
  });
  test.each([{ Latitude: false }, { Latitude: 91 }, { Longitude: -181 }, { Longitude: 'NaN' }])('rejects invalid coordinates %j', (fields) => {
    expect(() => normalizeRecords([row(fields)])).toThrow(/latitude|longitude/);
  });
  test('whitespace coordinates preserve existing locations, zero is valid', () => {
    expect(normalizeRecords([row({ Latitude: ' ', Longitude: '\t' })])[0].fields).not.toHaveProperty('geo');
    expect(normalizeRecords([row({ Latitude: 0, Longitude: '0' })])[0].fields.geo.coordinates).toEqual([0, 0]);
    expect(normalizeRecords([row({ Latitude: 20 })])[0].fields).not.toHaveProperty('latitude');
  });
  test.each([
    [row(), row({}, 'rec2')],
    [row(), row({ 'Mighty Member ID': 456 }, 'rec2')],
    [row(), row({ 'Mighty Member ID': 456, 'Primary Email': 'other@example.org' })],
  ])('rejects duplicate source identities before connecting', async (a, b) => {
    const f = fixture([a, b]);
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('duplicate input');
    expect(f.MongoClient).not.toHaveBeenCalled();
  });
  test('promotes a unique email-only member instead of inserting a duplicate', async () => {
    const f = fixture([row()], [{ _id: 'existing', email: ' MEMBER@example.org ' }]);
    await syncAirtableToMongoDB(f.options);
    expect(f.collection.bulkWrite.mock.calls[0][0][0].updateOne).toMatchObject({
      filter: { _id: 'existing' }, upsert: false, update: { $set: { mightyId: 123, 'airtable.recordId': 'rec1' } },
    });
  });
  test('previous Airtable link allows an email change', async () => {
    const f = fixture([row()], [{ _id: 'existing', airtable: { recordId: 'rec1' }, email: 'old@example.org' }]);
    await syncAirtableToMongoDB(f.options);
    expect(f.collection.bulkWrite.mock.calls[0][0][0].updateOne.filter).toEqual({ _id: 'existing' });
  });
  test.each([
    [{ _id: 'a', mightyId: 123 }, { _id: 'b', email: 'member@example.org' }],
    [{ _id: 'a', email: 'member@example.org' }, { _id: 'b', email: 'MEMBER@example.org' }],
    [{ _id: 'a', mightyId: 999, email: 'member@example.org' }],
    [{ _id: 'a', airtable: { recordId: 'other' }, mightyId: 123 }],
  ])('rejects ambiguous/incompatible matching without writes: %j', async (...docs) => {
    const f = fixture([row()], docs);
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow(/conflict|Ambiguous|Incompatible/);
    expect(f.collection.bulkWrite).not.toHaveBeenCalled();
  });
  test('two different source rows cannot update the same member', async () => {
    const f = fixture([row({ 'Primary Email': '' }), row({ 'Mighty Member ID': '', 'Primary Email': 'member@example.org' }, 'rec2')],
      [{ _id: 'a', mightyId: 123, email: 'member@example.org' }]);
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('Multiple Airtable');
    expect(f.collection.bulkWrite).not.toHaveBeenCalled();
  });
  test('blank source fields preserve profiles, metadata, source and subscription', async () => {
    const f = fixture([row({ 'Short Bio': '', 'Profile Photo URL': '', Latitude: null, Longitude: null })],
      [{ _id: 'a', mightyId: 123, bio: 'keep', avatarUrl: 'keep.jpg', latitude: 10, longitude: 20 }]);
    await syncAirtableToMongoDB(f.options);
    const set = f.collection.bulkWrite.mock.calls[0][0][0].updateOne.update.$set;
    for (const key of ['bio', 'avatarUrl', 'latitude', 'longitude', 'geo', 'airtable', 'source', 'subscription']) expect(set).not.toHaveProperty(key);
    expect(set['airtable.recordId']).toBe('rec1');
  });
  test('retains extended bio and explicit subscription false/empty plans', () => {
    const fields = normalizeRecords([row({ 'Extended Bio': 'long bio', 'Short Bio': 'short', isPaidActive: false, planIds: [], planNames: [] })])[0].fields;
    expect(fields.bio).toBe('long bio');
    expect(fields['subscription.isPaidActive']).toBe(false);
    expect(fields['subscription.planIds']).toEqual([]);
  });
  test('unchanged members are not rewritten', async () => {
    const f = fixture([row()], [{ _id: 'a', mightyId: 123, email: 'member@example.org', airtable: { recordId: 'rec1' } }]);
    expect(await syncAirtableToMongoDB(f.options)).toMatchObject({ unchangedCount: 1, modifiedCount: 0 });
    expect(f.collection.bulkWrite).not.toHaveBeenCalled();
  });
  test('observing a new sync date alone does not change profile updatedAt', async () => {
    const f = fixture([row({ 'Last Sync Date': '2026-09-22T00:00:00Z' })], [{ _id: 'a', mightyId: 123, email: 'member@example.org', airtable: { recordId: 'rec1' } }]);
    await syncAirtableToMongoDB(f.options);
    expect(f.collection.bulkWrite.mock.calls[0][0][0].updateOne.update.$set).toEqual({ lastSyncDate: '2026-09-22T00:00:00Z' });
  });
});

describe('database failures and atomic batches', () => {
  test('connect failures propagate even when close also fails', async () => {
    const f = fixture();
    f.client.connect.mockRejectedValue(new Error('connect failed'));
    f.client.close.mockRejectedValue(new Error('close failed'));
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('connect failed');
    expect(f.client.close).toHaveBeenCalled();
  });
  test('duplicate index failure prevents member writes', async () => {
    const f = fixture();
    f.collection.createIndex.mockRejectedValue(new Error('duplicate key'));
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('duplicate key');
    expect(f.collection.bulkWrite).not.toHaveBeenCalled();
    expect(f.client.close).toHaveBeenCalled();
  });
  test('later batch failure rejects the transaction, with no committed operations', async () => {
    const records = Array.from({ length: 251 }, (_, i) => row({ 'Mighty Member ID': i + 1, 'Primary Email': `member${i}@example.org` }, `rec${i}`));
    const f = fixture(records);
    let committed = [];
    const pending = [];
    f.collection.bulkWrite.mockImplementationOnce(async (ops) => {
      pending.push(...ops);
      return { modifiedCount: 0, upsertedCount: ops.length };
    }).mockRejectedValueOnce(new Error('second batch failed'));
    f.session.withTransaction.mockImplementation(async (callback) => {
      await callback();
      committed = pending;
    });
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('second batch failed');
    expect(pending).toHaveLength(250);
    expect(committed).toEqual([]);
    for (const [, options] of f.collection.bulkWrite.mock.calls) expect(options.session).toBe(f.session);
    expect(f.session.endSession).toHaveBeenCalled();
    expect(f.client.close).toHaveBeenCalled();
  });
  test('transaction retries do not double-count results', async () => {
    const f = fixture();
    f.collection.bulkWrite.mockResolvedValue({ modifiedCount: 0, upsertedCount: 1 });
    f.session.withTransaction.mockImplementation(async (callback) => { await callback(); await callback(); });
    expect(await syncAirtableToMongoDB(f.options)).toMatchObject({ upsertedCount: 1 });
  });
  test('session cleanup failure still closes client', async () => {
    const f = fixture();
    f.session.endSession.mockRejectedValue(new Error('session close failed'));
    await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('Mongo cleanup failed');
    expect(f.client.close).toHaveBeenCalled();
  });
});

test('normalizes legacy string Mighty IDs when resolving identity', async () => {
  const f = fixture([row({ 'Primary Email': '' })], [{ _id: 'existing', mightyId: '123' }]);
  await syncAirtableToMongoDB(f.options);
  expect(f.collection.bulkWrite.mock.calls[0][0][0].updateOne).toMatchObject({
    filter: { _id: 'existing' }, upsert: false, update: { $set: { mightyId: 123 } },
  });
});
test('does not insert an unidentified row but can retain its previous link', async () => {
  const records = [row({ 'Primary Email': '', 'Mighty Member ID': '', 'Short Bio': 'updated' })];
  const missing = fixture(records);
  await expect(syncAirtableToMongoDB(missing.options)).rejects.toThrow('No usable identity');
  expect(missing.collection.bulkWrite).not.toHaveBeenCalled();
  const linked = fixture(records, [{ _id: 'a', airtable: { recordId: 'rec1' }, mightyId: 123 }]);
  await syncAirtableToMongoDB(linked.options);
  const update = linked.collection.bulkWrite.mock.calls[0][0][0].updateOne;
  expect(update.filter).toEqual({ _id: 'a' });
  expect(update.update.$set).not.toHaveProperty('mightyId');
});
test('driver constructor failures propagate without requesting writes', async () => {
  const f = fixture();
  f.MongoClient.mockImplementation(() => { throw new Error('invalid URI'); });
  await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('invalid URI');
  expect(f.collection.bulkWrite).not.toHaveBeenCalled();
});
test('Mongo errors and cleanup errors preserve the original transaction failure', async () => {
  const f = fixture();
  f.collection.bulkWrite.mockRejectedValue(new Error('write conflict'));
  f.session.endSession.mockRejectedValue(new Error('end failed'));
  f.client.close.mockRejectedValue(new Error('close failed'));
  await expect(syncAirtableToMongoDB(f.options)).rejects.toThrow('write conflict');
  expect(f.client.close).toHaveBeenCalled();
});
