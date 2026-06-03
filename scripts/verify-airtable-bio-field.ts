/**
 * Smoke-test: upsert bio to Airtable using AIRTABLE_MIGHTY_BIO_FIELD (default Short Bio).
 *
 * Usage:
 *   AIRTABLE_MIGHTY_BIO_FIELD="Extended Bio" npx tsx scripts/verify-airtable-bio-field.ts
 *   AIRTABLE_MIGHTY_BIO_FIELD="Extended Bio" npx tsx scripts/verify-airtable-bio-field.ts --email you@example.com
 */
import "dotenv/config";

import {
  findAirtableMightyMemberByEmail,
  getAirtableMightyBioFieldName,
  upsertAirtableMightyMember,
} from "../lib/airtableMightyMembers";
import { fetchAirtableBaseTables, resolveAirtableTable } from "../lib/airtableMeta";

async function main() {
  const email =
    process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length) ||
    process.env.VERIFY_AIRTABLE_BIO_EMAIL?.trim() ||
    "jerry@techluminateacademy.com";

  const bioField = getAirtableMightyBioFieldName();
  console.log(JSON.stringify({ msg: "config", bioField, email }));

  const cfg = process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID;
  const table = process.env.AIRTABLE_MIGHTY_SYNC_TABLE_ID || process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME;
  if (cfg && table) {
    const tables = await fetchAirtableBaseTables(cfg);
    const t = resolveAirtableTable(tables, table);
    const names = (t?.fields ?? []).map((f) => f.name).filter((n) => /bio/i.test(n));
    console.log(JSON.stringify({ msg: "schema_bio_columns", names }));
  }

  const before = await findAirtableMightyMemberByEmail(email);
  if (!before) {
    console.error(JSON.stringify({ error: "member_not_found", email }));
    process.exit(1);
  }

  const stamp = `verify-${new Date().toISOString()}`;
  const upsert = await upsertAirtableMightyMember({
    mightyId: before.mightyId ?? undefined,
    email,
    bio: stamp,
  });
  const after = await findAirtableMightyMemberByEmail(email);

  const ok = after?.bio === stamp;
  console.log(
    JSON.stringify({
      msg: ok ? "pass" : "fail",
      recordId: before.recordId,
      mightyId: before.mightyId,
      bioField,
      beforeBio: before.bio?.slice(0, 80),
      stamp,
      afterBio: after?.bio,
      upsert,
    })
  );
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
