/**
 * Mighty Networks → Airtable (Mighty Members sync table).
 *
 * Retries 429 rate limits with backoff; marks 404 "Mighty Not Found" in Airtable
 * so cron does not retry deleted ids forever.
 *
 * Usage:
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply --sleep-ms 200 --retry-rounds 3
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply --stale-only
 */
import "dotenv/config";

import {
  airtableEnabled,
  fetchMightySyncRowsWithMemberId,
} from "../lib/airtableMightyMembers";
import {
  filterRowsNeedingMightySync,
  runMightyToAirtableBatchSync,
} from "../lib/domain/sync/mightyToAirtableMemberSync";

function parseArgs() {
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf("--limit");
  const offsetIdx = argv.indexOf("--offset");
  const emailIdx = argv.indexOf("--email");
  const sleepIdx = argv.indexOf("--sleep-ms");
  const retryIdx = argv.indexOf("--retry-rounds");

  const envRetry = parseInt(process.env.MIGHTY_SYNC_RETRY_ROUNDS || "", 10);
  const envSleep = parseInt(process.env.MIGHTY_SYNC_SLEEP_MS || "", 10);
  const defaultSleep = Number.isFinite(envSleep) ? envSleep : 450;

  return {
    apply: argv.includes("--apply"),
    staleOnly:
      argv.includes("--stale-only") ||
      argv.includes("--incremental") ||
      process.env.MIGHTY_SYNC_STALE_ONLY === "1",
    limit: limitIdx >= 0 && argv[limitIdx + 1] ? Math.max(1, parseInt(argv[limitIdx + 1]!, 10) || 0) : 0,
    offset: offsetIdx >= 0 && argv[offsetIdx + 1] ? Math.max(0, parseInt(argv[offsetIdx + 1]!, 10) || 0) : 0,
    email:
      emailIdx >= 0 && argv[emailIdx + 1]?.includes("@")
        ? argv[emailIdx + 1]!.trim().toLowerCase()
        : null,
    sleepMs:
      sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : defaultSleep,
    retryRounds:
      retryIdx >= 0 && argv[retryIdx + 1]
        ? Math.max(1, parseInt(argv[retryIdx + 1]!, 10) || 1)
        : Number.isFinite(envRetry)
          ? Math.max(1, envRetry)
          : 3,
  };
}

async function main() {
  const args = parseArgs();

  if (!airtableEnabled()) {
    console.error(JSON.stringify({ error: "airtable_not_configured" }));
    process.exit(1);
  }

  const runStartedMs = Date.now();
  let { rows } = await fetchMightySyncRowsWithMemberId();

  if (args.staleOnly) {
    rows = filterRowsNeedingMightySync(rows, runStartedMs);
  }
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
      sleepMs: args.sleepMs,
      retryRounds: args.retryRounds,
      staleOnly: args.staleOnly,
      limit: args.limit || null,
      offset: args.offset || null,
    })
  );

  if (!args.apply) {
    for (const row of rows) {
      console.log(
        JSON.stringify({
          action: "would_sync",
          mightyId: row.mightyId,
          email: row.email,
          record_id: row.recordId,
          lastSyncDate: row.lastSyncDate,
        })
      );
    }
    console.error(JSON.stringify({ msg: "mighty_to_airtable_sync_done", dryRun: true, rowCount: rows.length }));
    return;
  }

  const summary = await runMightyToAirtableBatchSync({
    rows,
    sleepMs: args.sleepMs,
    retryRounds: args.retryRounds,
    onRow: (payload) => console.log(JSON.stringify(payload)),
  });

  console.error(
    JSON.stringify({
      msg: "mighty_to_airtable_sync_done",
      dryRun: false,
      uniqueRows: rows.length,
      ...summary,
    })
  );

  if (summary.retryableFailures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
