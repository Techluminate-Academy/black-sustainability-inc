/** Recover legacy organization links. Dry-run by default; --apply fills blanks only.
 * Uses the legacy Airtable roster configured by NEXT_PUBLIC_AIRTABLE_* and the
 * members.mightyMembers collection. Never creates members or overwrites values.
 */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { getMemberOrganization, getMemberAffiliation } = require('../lib/memberOrganizations');

function email(value) { return typeof value === 'string' ? value.trim().toLowerCase() : ''; }
function planRecovery(records, members) {
  const sources = new Map();
  for (const record of records) {
    const f = record.fields || {};
    const key = email(f['EMAIL ADDRESS'] || f['Primary Email'] || f.Email || f.email);
    if (!key) continue;
    if (!sources.has(key)) sources.set(key, []);
    sources.get(key).push(record);
  }
  const targets = new Map();
  for (const member of members) {
    const key = email(member.email);
    if (!key) continue;
    if (!targets.has(key)) targets.set(key, []);
    targets.get(key).push(member);
  }
  const summary = { sourceRecords: records.length, matchedMembers: 0, unmatchedSourceEmails: 0,
    ambiguousTargetEmails: 0, conflictingSourceFields: 0, preservedExistingFields: 0,
    organizationNamesToRestore: 0, affiliationsToRestore: 0, membersToUpdate: 0 };
  const updates = [];
  for (const [key, rows] of sources) {
    if (!rows.some(row => getMemberOrganization(row) || getMemberAffiliation(row))) continue;
    const matches = targets.get(key) || [];
    if (!matches.length) { summary.unmatchedSourceEmails++; continue; }
    if (matches.length !== 1) { summary.ambiguousTargetEmails++; continue; }
    summary.matchedMembers++;
    const member = matches[0];
    const changes = {};
    for (const [field, read, count] of [
      ['organizationName', getMemberOrganization, 'organizationNamesToRestore'],
      ['affiliatedEntity', getMemberAffiliation, 'affiliationsToRestore'],
    ]) {
      const values = [...new Set(rows.map(read).filter(Boolean))];
      if (!values.length) continue;
      if (read(member)) { summary.preservedExistingFields++; continue; }
      if (values.length !== 1) { summary.conflictingSourceFields++; continue; }
      // Only missing/null/blank text fields are eligible for the guarded update.
      const previous = member[field];
      if (previous != null && (typeof previous !== 'string' || previous.trim())) {
        summary.preservedExistingFields++; continue;
      }
      changes[field] = values[0]; summary[count]++;
    }
    if (Object.keys(changes).length) updates.push({ id: member._id, changes,
      previous: Object.fromEntries(Object.keys(changes).map(field => [field, { exists: Object.hasOwn(member, field), value: member[field] ?? null }])),
      sourceRecordIds: rows.map(row => row.id) });
  }
  summary.membersToUpdate = updates.length;
  return { summary, updates };
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
  const apply = process.argv.includes('--apply');
  const e = process.env;
  const token = e.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
  const base = e.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const table = e.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;
  const uri = e.MONGODB_URI || e.NEXT_PUBLIC_MONGODB_URI;
  if (!token || !base || !table || !uri) throw new Error('Legacy Airtable roster and Mongo configuration are required');
  const records = [];
  const seenOffsets = new Set();
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${encodeURIComponent(base)}/${encodeURIComponent(table)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Legacy Airtable read failed (HTTP ${response.status}); no updates performed`);
    const data = await response.json();
    if (!Array.isArray(data.records)) throw new Error('Invalid Airtable response');
    records.push(...data.records);
    offset = data.offset;
    if (offset) {
      if (seenOffsets.has(offset)) throw new Error('Repeated Airtable offset');
      seenOffsets.add(offset);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  } while (offset);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const collection = client.db('members').collection('mightyMembers');
    const members = await collection.find({}, { projection: { email: 1, organizationName: 1, affiliatedEntity: 1,
      'fields.ORGANIZATION NAME': 1, 'fields.Organization': 1, 'fields.AFFILIATED ENTITY': 1, 'fields.Affiliated Entity': 1 } }).toArray();
    const { summary, updates } = planRecovery(records, members);
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...summary }));
    if (!apply || !updates.length) return;
    const backupDir = path.join(__dirname, '..', 'artifacts', 'organization-recovery');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify(updates, null, 2), { flag: 'wx', mode: 0o600 });
    let modifiedFields = 0;
    for (const update of updates) {
      for (const [field, value] of Object.entries(update.changes)) {
        const previous = update.previous[field];
        const guard = previous.exists ? previous.value : { $exists: false };
        const result = await collection.updateOne({ _id: update.id, [field]: guard }, { $set: { [field]: value } });
        modifiedFields += result.modifiedCount;
      }
    }
    console.log(JSON.stringify({ modifiedFields, backup }));
  } finally { await client.close(); }
}
if (require.main === module) main().catch(() => { console.error('Organization recovery failed; inspect the backup before retrying an applied run.'); process.exitCode = 1; });
module.exports = { planRecovery };
