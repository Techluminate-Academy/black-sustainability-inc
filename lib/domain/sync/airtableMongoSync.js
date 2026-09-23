// Server-only Airtable importer. Complete fetch + validation precede any member writes.
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { isDeepStrictEqual } = require('util');

const BATCH_SIZE = 250;
const EMAIL_COLLATION = { locale: 'en', strength: 2 };
const PROFILE_FIELDS = {
  'First Name': 'firstName', 'Last Name': 'lastName', City: 'location',
  'Profile Photo URL': 'avatarUrl', 'Industry / Sector': 'industry',
  'Account Created Date': 'accountCreatedAt',
};
const BIO_FIELDS = ['Extended Bio', 'Short Bio', 'BIO', 'Bio', 'Member Bio', 'About', 'Description'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nonblank = (v) => v != null && !(typeof v === 'string' && v.trim() === '');

function readConfig(env = process.env, mongoRequired = true) {
  const config = {
    token: env.AIRTABLE_PAT || env.AIRTABLE_ACCESS_TOKEN,
    base: env.AIRTABLE_MIGHTY_SYNC_BASE_ID || env.AIRTABLE_BASE_ID || env.NEXT_PUBLIC_AIRTABLE_BASE_ID,
    table: env.AIRTABLE_MIGHTY_SYNC_TABLE_ID || env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME || 'Mighty Members',
    mongoUri: env.MONGODB_URI,
  };
  if (!config.token || !config.token.trim()) throw new Error('AIRTABLE_PAT or AIRTABLE_ACCESS_TOKEN is required (server-only)');
  if (!config.base || !config.base.trim()) throw new Error('AIRTABLE_MIGHTY_SYNC_BASE_ID is required');
  if (mongoRequired && (!config.mongoUri || !config.mongoUri.trim())) throw new Error('MONGODB_URI is required (server-only)');
  return config;
}

async function getAllRecordsFromAirtable(options = {}) {
  const config = options.config || readConfig(options.env, false);
  const http = options.http || axios;
  const wait = options.sleep || sleep;
  const records = [];
  const seenOffsets = new Set();
  let offset;
  do {
    let data;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await http.get(
          `https://api.airtable.com/v0/${encodeURIComponent(config.base)}/${encodeURIComponent(config.table)}`,
          { headers: { Authorization: `Bearer ${config.token}` },
            params: { pageSize: 100, ...(offset ? { offset } : {}) }, timeout: 30000 }
        );
        data = response.data;
        break;
      } catch (error) {
        const status = error.response?.status;
        const transient = status === 429 || status >= 500 ||
          (!status && ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN'].includes(error.code));
        // Never include Axios config, response bodies, tokens, or request URLs in errors.
        if (!transient || attempt === 3) throw new Error(`Airtable fetch failed (${status ? `HTTP ${status}` : 'network error'}); no member writes performed`);
        const retryAfter = error.response?.headers?.['retry-after'];
        const seconds = typeof retryAfter === 'string' && !/^\d+(\.\d+)?$/.test(retryAfter)
          ? (Date.parse(retryAfter) - Date.now()) / 1000 : Number(retryAfter);
        // Honor bounded Retry-After; if longer, fail for the scheduler to retry later.
        if (Number.isFinite(seconds) && seconds > 120) throw new Error('Airtable retry delay exceeds 120 seconds; retry the job later');
        const delay = Math.max(status === 429 ? 30000 : 1000 * (2 ** attempt), Number.isFinite(seconds) ? seconds * 1000 : 0);
        await wait(delay);
      }
    }
    if (!data || !Array.isArray(data.records) ||
        (data.offset != null && (typeof data.offset !== 'string' || !data.offset.trim()))) {
      throw new Error('Invalid Airtable response: expected records array and optional nonempty offset');
    }
    records.push(...data.records);
    offset = data.offset;
    if (offset && seenOffsets.has(offset)) throw new Error('Repeated Airtable pagination offset; refusing incomplete sync');
    if (offset) seenOffsets.add(offset);
  } while (offset);
  return records;
}

function finiteNumber(value) {
  if (!nonblank(value) || !['string', 'number'].includes(typeof value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRecords(records) {
  const seen = { recordId: new Set(), mightyId: new Set(), email: new Set() };
  return records.map((record, index) => {
    const fail = (reason) => { throw new Error(`Airtable row ${index + 1}: ${reason}`); };
    if (typeof record?.id !== 'string' || !record.id.trim() || !record.fields ||
        typeof record.fields !== 'object' || Array.isArray(record.fields)) fail('invalid record shape');
    const f = record.fields;
    const mightyId = finiteNumber(f['Mighty Member ID']);
    if (nonblank(f['Mighty Member ID']) && (!Number.isSafeInteger(mightyId) || mightyId <= 0)) fail('Mighty ID must be a positive safe integer');
    if (nonblank(f['Primary Email']) && typeof f['Primary Email'] !== 'string') fail('email must be text');
    const email = typeof f['Primary Email'] === 'string' ? f['Primary Email'].trim().toLowerCase() : '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('invalid email');
    const item = { recordId: record.id, mightyId, email, fields: {} };
    for (const key of Object.keys(seen)) {
      if (!item[key]) continue;
      if (seen[key].has(item[key])) fail(`duplicate input ${key}; resolve source duplicates before retrying`);
      seen[key].add(item[key]);
    }
    // A linked record can still be resolved when both current identifiers are absent.
    for (const [source, target] of Object.entries(PROFILE_FIELDS)) {
      if (!nonblank(f[source])) continue;
      if (typeof f[source] !== 'string') fail(`${source} must be text`);
      item.fields[target] = f[source];
    }
    for (const key of BIO_FIELDS) {
      if (!nonblank(f[key])) continue;
      if (typeof f[key] !== 'string') fail('bio must be text');
      item.fields.bio = f[key];
      break;
    }
    const lat = finiteNumber(f.Latitude);
    const lng = finiteNumber(f.Longitude);
    if (nonblank(f.Latitude) && (lat === null || lat < -90 || lat > 90)) fail('invalid latitude');
    if (nonblank(f.Longitude) && (lng === null || lng < -180 || lng > 180)) fail('invalid longitude');
    if (lat !== null && lng !== null) {
      Object.assign(item.fields, { latitude: lat, longitude: lng, geo: { type: 'Point', coordinates: [lng, lat] } });
    }
    // Missing/blank values preserve existing fields. Explicit false and [] are meaningful.
    if (nonblank(f.isPaidActive)) {
      const v = String(f.isPaidActive).trim().toLowerCase();
      if (!['true', 'false', 'yes', 'no', '1', '0'].includes(v)) fail('invalid isPaidActive');
      item.fields['subscription.isPaidActive'] = ['true', 'yes', '1'].includes(v);
      item.fields['subscription.syncSource'] = 'airtable:mighty_members';
    }
    for (const key of ['planNames', 'planIds']) {
      if (!nonblank(f[key])) continue;
      if (!Array.isArray(f[key]) && typeof f[key] !== 'string') fail(`invalid ${key}`);
      const list = Array.isArray(f[key]) ? f[key] : [f[key]];
      if (list.some((v) => typeof v !== 'string')) fail(`invalid ${key} element`);
      item.fields[`subscription.${key}`] = list.map((v) => v.trim()).filter(Boolean);
    }
    for (const [source, target] of [['Last Sync Date', 'lastSyncDate'], ['subscriptionUpdatedAt', 'subscription.updatedAt']]) {
      if (!nonblank(f[source])) continue;
      if (typeof f[source] !== 'string' || !Number.isFinite(Date.parse(f[source]))) fail(`invalid ${source}`);
      item.fields[target] = f[source];
    }
    return item;
  });
}

async function ensureIdentityIndexes(collection) {
  let indexes;
  try { indexes = await collection.indexes(); } catch (error) {
    if (error.code !== 26) throw error; // A new collection has no index catalog yet.
    indexes = [];
  }
  const specs = [
    ['mightyId', 'number', 0, undefined],
    ['airtable.recordId', 'string', '', undefined],
    ['email', 'string', '', EMAIL_COLLATION],
  ];
  for (const [field, type, minimum, collation] of specs) {
    const partial = { [field]: { $type: type, $gt: minimum } };
    const compatible = indexes.some(index => {
      if (index.unique !== true || Object.keys(index.key).length !== 1 ||
          ![1, -1].includes(index.key[field])) return false;
      // Accept only known filters covering every identity the importer writes.
      if (index.partialFilterExpression &&
          !isDeepStrictEqual(index.partialFilterExpression, partial) &&
          !isDeepStrictEqual(index.partialFilterExpression, { [field]: { $type: type } })) return false;
      if (!collation) return !index.collation || index.collation.locale === 'simple';
      const defaults = { caseLevel: false, caseFirst: 'off', strength: 3,
        numericOrdering: false, alternate: 'non-ignorable', maxVariable: 'punct',
        normalization: false, backwards: false };
      const { version, ...actual } = index.collation || {};
      return isDeepStrictEqual({ ...defaults, ...actual }, { ...defaults, ...collation });
    });
    if (compatible) continue;
    // Never drop an incompatible index or suppress a failed unique-index build.
    await collection.createIndex({ [field]: 1 }, {
      unique: true, partialFilterExpression: partial,
      ...(collation ? { name: 'sync_unique_email', collation } : {}),
    });
  }
}

function buildIdentityLookup(docs) {
  const maps = { recordId: new Map(), mightyId: new Map(), email: new Map() };
  for (const doc of docs) {
    const keys = { recordId: doc.airtable?.recordId, mightyId: finiteNumber(doc.mightyId) ?? doc.mightyId,
      email: typeof doc.email === 'string' ? doc.email.trim().toLowerCase() : '' };
    for (const key of Object.keys(maps)) {
      if (keys[key] == null || keys[key] === '') continue;
      const values = maps[key].get(keys[key]) || [];
      values.push(doc);
      maps[key].set(keys[key], values);
    }
  }
  return maps;
}

function resolveIdentity(item, maps) {
  const candidates = new Map();
  for (const key of ['recordId', 'mightyId', 'email']) {
    if (!item[key]) continue;
    const matches = maps[key].get(item[key]) || [];
    if (matches.length > 1) throw new Error(`Ambiguous ${key} for Airtable record ${item.recordId}`);
    for (const doc of matches) candidates.set(String(doc._id), doc);
  }
  if (candidates.size > 1) throw new Error(`Identity conflict for Airtable record ${item.recordId}`);
  const doc = candidates.values().next().value;
  if (doc && ((doc.airtable?.recordId && doc.airtable.recordId !== item.recordId) ||
      (item.mightyId && doc.mightyId != null && finiteNumber(doc.mightyId) !== item.mightyId))) {
    throw new Error(`Incompatible identity for Airtable record ${item.recordId}`);
  }
  if (!doc && !item.mightyId && !item.email) throw new Error(`No usable identity for Airtable record ${item.recordId}`);
  return doc;
}

const getPath = (doc, path) => path.split('.').reduce((v, key) => v?.[key], doc);

async function syncAirtableToMongoDB(options = {}) {
  const config = readConfig(options.env);
  const items = normalizeRecords(await getAllRecordsFromAirtable({ ...options, config }));
  const summary = { fetchedCount: items.length, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, unchangedCount: 0 };
  if (!items.length) return summary; // Valid empty source; never delete existing members.
  const client = new (options.MongoClient || MongoClient)(config.mongoUri, {
    serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, socketTimeoutMS: 45000,
  });
  let session;
  let failure;
  let stage = 'mongo_connect';
  try {
    await client.connect();
    const collection = client.db('members').collection('mightyMembers');
    stage = 'mongo_indexes';
    await ensureIdentityIndexes(collection);
    stage = 'mongo_transaction';
    session = client.startSession();
    await session.withTransaction(async () => {
      // Retryable transaction callbacks must not accumulate results from aborted attempts.
      Object.assign(summary, { matchedCount: 0, modifiedCount: 0, upsertedCount: 0, unchangedCount: 0 });
      const docs = await collection.find({}, { session, projection: {
        mightyId: 1, email: 1, airtable: 1, firstName: 1, lastName: 1, location: 1,
        bio: 1, avatarUrl: 1, industry: 1, latitude: 1, longitude: 1, geo: 1,
        accountCreatedAt: 1, lastSyncDate: 1, subscription: 1,
      } }).toArray();
      const maps = buildIdentityLookup(docs);
      const targets = new Set();
      // Resolve the entire input before the first write, including cross-row collisions.
      const resolved = items.map((item) => {
        const doc = resolveIdentity(item, maps);
        if (doc) {
          const id = String(doc._id);
          if (targets.has(id)) throw new Error('Multiple Airtable rows resolve to the same Mongo member');
          targets.add(id);
        }
        return { item, doc };
      });
      const now = new Date();
      for (let start = 0; start < resolved.length; start += BATCH_SIZE) {
        const ops = [];
        for (const { item, doc } of resolved.slice(start, start + BATCH_SIZE)) {
          const fields = { ...item.fields, 'airtable.recordId': item.recordId,
            ...(item.mightyId ? { mightyId: item.mightyId } : {}), ...(item.email ? { email: item.email } : {}) };
          const changed = Object.fromEntries(Object.entries(fields).filter(([key, value]) => !isDeepStrictEqual(getPath(doc, key), value)));
          if (doc) summary.matchedCount++;
          if (!Object.keys(changed).length) { summary.unchangedCount++; continue; }
          const profileChanged = Object.keys(changed).some((key) => !['lastSyncDate', 'subscription.updatedAt'].includes(key));
          ops.push({ updateOne: {
            filter: doc ? { _id: doc._id } : { 'airtable.recordId': item.recordId },
            update: { $set: { ...changed, ...(profileChanged ? { updatedAt: now } : {}) },
              ...(!doc ? { $setOnInsert: { createdAt: now, source: 'airtable:mighty_members' } } : {}) },
            upsert: !doc,
          } });
        }
        if (ops.length) {
          const result = await collection.bulkWrite(ops, { session, ordered: true });
          summary.modifiedCount += result.modifiedCount;
          summary.upsertedCount += result.upsertedCount;
        }
      }
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' });
    return summary;
  } catch (error) {
    failure = error;
    if (error instanceof Error) error.syncStage = stage;
    throw error;
  } finally {
    // Always attempt both cleanups; a close error must not replace the root failure.
    let cleanupFailure;
    try { if (session) await session.endSession(); } catch (error) { cleanupFailure = error; }
    try { await client.close(); } catch (error) { cleanupFailure ||= error; }
    if (!failure && cleanupFailure) throw new Error('Mongo cleanup failed after sync; inspect job and cache status');
  }
}

module.exports = { readConfig, getAllRecordsFromAirtable, normalizeRecords, resolveIdentity, buildIdentityLookup, syncAirtableToMongoDB };
