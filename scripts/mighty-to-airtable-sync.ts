/**
 * Mighty Networks → Airtable (Mighty Members sync table).
 *
 * Default mode is discovery-first delta sync: list Mighty members cheaply,
 * compare `updated_at` to Airtable `Last Sync Date`, and only detail-sync
 * changed / new / missing-sync-date rows plus a small oldest-first safety batch.
 *
 * Retries 429 rate limits with backoff; marks 404 "Mighty Not Found" in Airtable
 * so cron does not retry deleted ids forever.
 *
 * Usage:
 *   npx tsx scripts/mighty-to-airtable-sync.ts
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply --full
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply --stale-only
 *   npx tsx scripts/mighty-to-airtable-sync.ts --apply --safety-batch 250
 */
import "dotenv/config";

import {
  airtableEnabled,
  fetchMightySyncRowsWithMemberId,
} from "../lib/airtableMightyMembers";
import {
  airtableRowToWorkItem,
  candidateToWorkItem,
  filterRowsNeedingMightySync,
  runMightyToAirtableBatchSync,
  type MightySyncWorkItem,
} from "../lib/domain/sync/mightyToAirtableMemberSync";
import {
  selectDeltaSyncCandidates,
  startOfUtcDayMs,
  type DeltaSelectionStats,
} from "../lib/domain/sync/mightyToAirtableSyncHelpers";
import { listMightyMemberMetadata } from "../lib/mightyAdmin";

const DEFAULT_SAFETY_BATCH = 100;

function parseArgs() {
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf("--limit");
  const offsetIdx = argv.indexOf("--offset");
  const emailIdx = argv.indexOf("--email");
  const sleepIdx = argv.indexOf("--sleep-ms");
  const retryIdx = argv.indexOf("--retry-rounds");
  const safetyIdx = argv.indexOf("--safety-batch");

  const envRetry = parseInt(process.env.MIGHTY_SYNC_RETRY_ROUNDS || "", 10);
  const envSleep = parseInt(process.env.MIGHTY_SYNC_SLEEP_MS || "", 10);
  const envSafety = parseInt(process.env.MIGHTY_SYNC_SAFETY_BATCH || "", 10);
  const defaultSleep = Number.isFinite(envSleep) ? envSleep : 450;
  const defaultSafety = Number.isFinite(envSafety) ? Math.max(0, envSafety) : DEFAULT_SAFETY_BATCH;

  const full =
    argv.includes("--full") ||
    process.env.MIGHTY_SYNC_FULL === "1";
  const staleOnly =
    !full &&
    (argv.includes("--stale-only") ||
      argv.includes("--incremental") ||
      process.env.MIGHTY_SYNC_STALE_ONLY === "1");
  // Delta is the default unless an explicit full/stale mode is requested.
  const delta = !full && !staleOnly;

  return {
    apply: argv.includes("--apply"),
    full,
    staleOnly,
    delta,
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
    safetyBatch:
      safetyIdx >= 0 && argv[safetyIdx + 1]
        ? Math.max(0, parseInt(argv[safetyIdx + 1]!, 10) || 0)
        : defaultSafety,
  };
}

function selectionMode(args: ReturnType<typeof parseArgs>): "delta" | "full" | "stale" {
  if (args.full) return "full";
  if (args.staleOnly) return "stale";
  return "delta";
}

async function resolveWorkItems(args: ReturnType<typeof parseArgs>): Promise<{
  rows: MightySyncWorkItem[];
  selectionStats: DeltaSelectionStats | null;
}> {
  const { rows: airtableRows } = await fetchMightySyncRowsWithMemberId();

  if (args.email) {
    const filtered = airtableRows.filter((r) => (r.email ?? "").trim().toLowerCase() === args.email);
    if (!filtered.length) {
      console.error(JSON.stringify({ error: "no_airtable_row_for_email", email: args.email }));
      process.exit(1);
    }
    return { rows: filtered.map(airtableRowToWorkItem), selectionStats: null };
  }

  if (args.full) {
    let rows = airtableRows.map(airtableRowToWorkItem);
    if (args.offset > 0) rows = rows.slice(args.offset);
    if (args.limit > 0) rows = rows.slice(0, args.limit);
    return { rows, selectionStats: null };
  }

  if (args.staleOnly) {
    let rows = filterRowsNeedingMightySync(airtableRows, startOfUtcDayMs()).map(airtableRowToWorkItem);
    if (args.offset > 0) rows = rows.slice(args.offset);
    if (args.limit > 0) rows = rows.slice(0, args.limit);
    return { rows, selectionStats: null };
  }

  // Delta discovery: cheap Mighty list first, then select work.
  const started = Date.now();
  const mightyMembers = await listMightyMemberMetadata({
    onPage: ({ page, count, totalSoFar }) => {
      console.error(
        JSON.stringify({
          msg: "mighty_discovery_page",
          page,
          count,
          totalSoFar,
        })
      );
    },
  });
  console.error(
    JSON.stringify({
      msg: "mighty_discovery_done",
      mightyDiscovered: mightyMembers.length,
      elapsedMs: Date.now() - started,
    })
  );

  const { candidates, stats } = selectDeltaSyncCandidates({
    mightyMembers,
    airtableRows,
    safetyBatchSize: args.safetyBatch,
  });

  let rows = candidates.map(candidateToWorkItem);
  if (args.offset > 0) rows = rows.slice(args.offset);
  if (args.limit > 0) rows = rows.slice(0, args.limit);
  return { rows, selectionStats: stats };
}

async function main() {
  const args = parseArgs();
  const mode = selectionMode(args);
  const startedMs = Date.now();

  if (!airtableEnabled()) {
    console.error(JSON.stringify({ error: "airtable_not_configured" }));
    process.exit(1);
  }

  const { rows, selectionStats } = await resolveWorkItems(args);

  console.error(
    JSON.stringify({
      msg: "mighty_to_airtable_sync_start",
      mode: args.apply ? "apply" : "dry-run",
      selectionMode: mode,
      rowCount: rows.length,
      sleepMs: args.sleepMs,
      retryRounds: args.retryRounds,
      safetyBatch: args.safetyBatch,
      selectionStats,
      limit: args.limit || null,
      offset: args.offset || null,
    })
  );

  if (!args.apply) {
    const reasonCounts: Record<string, number> = {};
    for (const row of rows) {
      const reason = row.reason || "unspecified";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      console.log(
        JSON.stringify({
          action: "would_sync",
          mightyId: row.mightyId,
          record_id: row.recordId ?? null,
          reason: row.reason ?? null,
        })
      );
    }
    console.error(
      JSON.stringify({
        msg: "mighty_to_airtable_sync_done",
        dryRun: true,
        selectionMode: mode,
        rowCount: rows.length,
        reasonCounts,
        selectionStats,
        elapsedMs: Date.now() - startedMs,
      })
    );
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
      selectionMode: mode,
      uniqueRows: rows.length,
      selectionStats,
      elapsedMs: Date.now() - startedMs,
      ...summary,
    })
  );

  if (summary.retryableFailures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
