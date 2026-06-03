/**
 * Mighty Networks → Airtable (Mighty Members sync table).
 *
 * Pulls profile + plans from Mighty Admin API and upserts Airtable, stamping Last Sync Date.
 * Pair with `node utils/sync-airtable.js` (Airtable → MongoDB) for the full pipeline.
 *
 * Usage:
 *   npx tsx scripts/mighty-to-airtable-sync.ts
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply --limit 50 --sleep-ms 100
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply --email one@example.com
 */
import "dotenv/config";

import {
  airtableEnabled,
  fetchMightySyncRowsWithMemberId,
} from "../lib/airtableMightyMembers";
import { syncMightyMemberToAirtable } from "../lib/domain/sync/mightyToAirtableMemberSync";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf("--limit");
  const offsetIdx = argv.indexOf("--offset");
  const emailIdx = argv.indexOf("--email");
  const sleepIdx = argv.indexOf("--sleep-ms");

  return {
    apply: argv.includes("--apply"),
    limit: limitIdx >= 0 && argv[limitIdx + 1] ? Math.max(1, parseInt(argv[limitIdx + 1]!, 10) || 0) : 0,
    offset: offsetIdx >= 0 && argv[offsetIdx + 1] ? Math.max(0, parseInt(argv[offsetIdx + 1]!, 10) || 0) : 0,
    email:
      emailIdx >= 0 && argv[emailIdx + 1]?.includes("@")
        ? argv[emailIdx + 1]!.trim().toLowerCase()
        : null,
    sleepMs:
      sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : 75,
  };
}

async function main() {
  const args = parseArgs();

  if (!airtableEnabled()) {
    console.error(JSON.stringify({ error: "airtable_not_configured" }));
    process.exit(1);
  }

  let { rows } = await fetchMightySyncRowsWithMemberId();
  if (args.email) {
    rows = rows.filter((r) => (r.email ?? "").trim().toLowerCase() === args.email);
    if (!rows.length) {
      console.error(JSON.stringify({ error: "no_airtable_row_for_email", email: args.email }));
      process.exit(1);
    }
  }
  if (args.offset > 0) rows = rows.slice(args.offset);
  if (args.limit > 0) rows = rows.slice(0, args.limit);

  console.error(
    JSON.stringify({
      msg: "mighty_to_airtable_sync_start",
      mode: args.apply ? "apply" : "dry-run",
      rowCount: rows.length,
      limit: args.limit || null,
      offset: args.offset || null,
    })
  );

  let processed = 0;
  let updated = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    processed++;
    const email = (row.email ?? "").trim().toLowerCase();

    if (!args.apply) {
      console.log(
        JSON.stringify({
          action: "would_sync",
          mightyId: row.mightyId,
          email: email || null,
          record_id: row.recordId,
        })
      );
      continue;
    }

    try {
      const result = await syncMightyMemberToAirtable(row.mightyId);
      if (result.skipped) skipped++;
      else if (result.action === "created") created++;
      else if (result.action === "updated") updated++;
      console.log(
        JSON.stringify({
          action: result.action ?? "skipped",
          mightyId: row.mightyId,
          email: result.email ?? email,
          record_id: result.recordId ?? row.recordId,
        })
      );
    } catch (e) {
      errors++;
      console.log(
        JSON.stringify({
          action: "error",
          mightyId: row.mightyId,
          email,
          record_id: row.recordId,
          error: e instanceof Error ? e.message : String(e),
        })
      );
    }

    await sleep(args.sleepMs);
  }

  console.error(
    JSON.stringify({
      msg: "mighty_to_airtable_sync_done",
      dryRun: !args.apply,
      processed,
      created,
      updated,
      skipped,
      errors,
    })
  );

  if (errors > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
