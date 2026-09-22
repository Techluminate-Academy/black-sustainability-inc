// utils/sync-airtable.js
//
// Scheduled membership reconciliation (twice daily — morning + night):
//   Mighty webhooks keep Mongo + Airtable mostly current in between; this job
//   runs discovery-first Mighty → Airtable (delta by default), then Airtable → Mongo.
//   Default --sleep-ms 450 to stay under Mighty Admin API rate limits.
//
// Render: create TWO Cron Jobs with the same command (set timezone, e.g. America/New_York):
//   Morning: 0 6 * * *
//   Night:   0 2 * * *
//   Command: node utils/sync-airtable.js
//   Plan:    delta runs are typically much shorter than full roster sweeps
//
// Usage:
//   node utils/sync-airtable.js
//   node utils/sync-airtable.js --sleep-ms 500
//   node utils/sync-airtable.js --full                # full Mighty→Airtable roster
//   node utils/sync-airtable.js --stale-only          # Last Sync Date before today only
//   node utils/sync-airtable.js --skip-mighty        # Airtable → Mongo only
//   node utils/sync-airtable.js --skip-cache         # do not invalidate Redis
//
// Env: MIGHTY_SYNC_SLEEP_MS (default 450), MIGHTY_SYNC_RETRY_ROUNDS (default 3),
//      MIGHTY_SYNC_SAFETY_BATCH (default 100 oldest rows each delta run),
//      MIGHTY_SYNC_FULL=1 for full roster, MIGHTY_SYNC_STALE_ONLY=1 for stale filter,
//      SYNC_REQUIRE_COMPLETE=0 to run Mongo when Mighty rows still failing,
//      SKIP_MIGHTY_SYNC=1 to skip step 1

// Use require instead of import
require('dotenv').config();

const { spawnSync } = require("child_process");
const path = require("path");
const { readConfig, getAllRecordsFromAirtable, syncAirtableToMongoDB } = require("../lib/domain/sync/airtableMongoSync");
const DEFAULT_MIGHTY_SLEEP_MS = 450;

// Export functions for use in other modules if needed
module.exports = {
  getAllRecordsFromAirtable,
  syncAirtableToMongoDB,
  runMightyToAirtableSync,
  runCacheInvalidation,
  runScheduledMembershipSync,
  parseSyncCliArgs,
};

function parseSyncCliArgs(argv = process.argv.slice(2)) {
  function integerOption(flag, envName, fallback, minimum) {
    const index = argv.indexOf(flag);
    const raw = index >= 0 ? argv[index + 1] : process.env[envName] || String(fallback);
    if (typeof raw !== "string" || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < minimum) {
      throw new Error(`Invalid sync option ${flag}: expected an integer >= ${minimum}`);
    }
    return Number(raw);
  }
  const requireComplete = process.env.SYNC_REQUIRE_COMPLETE !== "0";
  const full = argv.includes("--full") || process.env.MIGHTY_SYNC_FULL === "1";
  const staleOnly =
    !full &&
    (argv.includes("--stale-only") ||
      argv.includes("--incremental") ||
      process.env.MIGHTY_SYNC_STALE_ONLY === "1");
  return {
    skipMighty:
      argv.includes("--skip-mighty") ||
      argv.includes("--airtable-only") ||
      process.env.SKIP_MIGHTY_SYNC === "1",
    full,
    staleOnly,
    // Delta is default when neither full nor stale-only is requested.
    delta: !full && !staleOnly,
    sleepMs: integerOption("--sleep-ms", "MIGHTY_SYNC_SLEEP_MS", DEFAULT_MIGHTY_SLEEP_MS, 0),
    retryRounds: integerOption("--retry-rounds", "MIGHTY_SYNC_RETRY_ROUNDS", 3, 1),
    safetyBatch: integerOption("--safety-batch", "MIGHTY_SYNC_SAFETY_BATCH", 100, 0),
    requireComplete,
    skipCache: argv.includes("--skip-cache") || process.env.SKIP_CACHE_INVALIDATION === "1",
  };
}

function mightyToAirtableConfigured() {
  const mightyKey =
    process.env.MIGHTY_NETWORK_API_KEY || process.env.MIGHTY_API_KEY;
  const networkId = process.env.MIGHTY_NETWORK_ID;
  return Boolean(mightyKey && networkId);
}

function runMightyToAirtableSync({ sleepMs, retryRounds, full, staleOnly, safetyBatch }) {
  const repoRoot = path.join(__dirname, "..");
  const args = [
    "tsx",
    "scripts/mighty-to-airtable-sync.ts",
    "--apply",
    "--sleep-ms",
    String(sleepMs),
    "--retry-rounds",
    String(retryRounds),
    "--safety-batch",
    String(safetyBatch),
  ];
  if (full) args.push("--full");
  else if (staleOnly) args.push("--stale-only");
  // else: delta (script default)
  console.error(
    JSON.stringify({
      msg: "sync_airtable_mighty_step_start",
      sleepMs,
      retryRounds,
      full: Boolean(full),
      staleOnly: Boolean(staleOnly),
      delta: !full && !staleOnly,
      safetyBatch,
      command: "npx",
      args,
    })
  );
  const config = readConfig();
  const result = spawnSync("npx", args, {
    stdio: "inherit",
    env: { ...process.env, AIRTABLE_PAT: config.token,
      AIRTABLE_MIGHTY_SYNC_BASE_ID: config.base, AIRTABLE_MIGHTY_SYNC_TABLE_ID: config.table },
    cwd: repoRoot,
  });
  const exitCode = result.status ?? 1;
  console.error(
    JSON.stringify({ msg: "sync_airtable_mighty_step_done", exitCode, sleepMs, retryRounds })
  );
  return exitCode;
}

function runCacheInvalidation() {
  const repoRoot = path.join(__dirname, "..");
  const args = ["tsx", "scripts/invalidate-mighty-member-caches.ts"];
  console.error(JSON.stringify({ msg: "sync_airtable_cache_step_start", command: "npx", args }));
  const result = spawnSync("npx", args, {
    stdio: "inherit", env: process.env, cwd: repoRoot, timeout: 120000, killSignal: "SIGKILL",
  });
  const exitCode = result.status ?? 1;
  console.error(JSON.stringify({ msg: "sync_airtable_cache_step_done", exitCode }));
  if (exitCode !== 0) throw new Error(`Redis cache invalidation failed with exit code ${exitCode}`);
}

async function runScheduledMembershipSync() {
  const args = parseSyncCliArgs();
  // Validate all required downstream configuration before Mighty/Airtable writes.
  readConfig();
  if (!args.skipCache && !process.env.REDIS_URL?.trim()) {
    throw new Error("REDIS_URL is not configured");
  }
  const selectionMode = args.full ? "full" : args.staleOnly ? "stale" : "delta";

  console.error(
    JSON.stringify({
      msg: "sync_airtable_scheduled_start",
      mode: selectionMode,
      sleepMs: args.sleepMs,
      retryRounds: args.retryRounds,
      safetyBatch: args.safetyBatch,
      requireComplete: args.requireComplete,
    })
  );

  let degraded = false;
  if (!args.skipMighty && mightyToAirtableConfigured()) {
    const mightyExit = runMightyToAirtableSync({
      sleepMs: args.sleepMs,
      retryRounds: args.retryRounds,
      full: args.full,
      staleOnly: args.staleOnly,
      safetyBatch: args.safetyBatch,
    });
    degraded = mightyExit !== 0;
    if (mightyExit !== 0 && args.requireComplete) {
      console.error(
        JSON.stringify({
          msg: "sync_airtable_mongo_step_skipped",
          reason: "Mighty → Airtable had retryable failures (set SYNC_REQUIRE_COMPLETE=0 to force Mongo)",
          mightyExit,
        })
      );
      throw new Error(`Mighty to Airtable sync failed with exit code ${mightyExit}`);
    }
  } else if (!args.skipMighty) {
    throw new Error("Mighty → Airtable sync is not configured (use --skip-mighty only intentionally)");
  }

  const mongoResult = await syncAirtableToMongoDB();
  console.error(JSON.stringify({
    msg: "sync_airtable_mongo_step_done",
    fetchedCount: mongoResult?.fetchedCount ?? 0,
    unchangedCount: mongoResult?.unchangedCount ?? 0,
    matchedCount: mongoResult?.matchedCount ?? 0,
    modifiedCount: mongoResult?.modifiedCount ?? 0,
    upsertedCount: mongoResult?.upsertedCount ?? 0,
  }));
  if (!args.skipCache) runCacheInvalidation();
  console.error(JSON.stringify({ msg: "sync_airtable_scheduled_done", status: degraded ? "degraded" : "success", cacheSkipped: args.skipCache }));
}

// If this file is executed directly, run the full scheduled sync
if (require.main === module) {
  runScheduledMembershipSync().catch((err) => {
    // Driver errors may embed credentials or member data; never dump raw errors.
    console.error(JSON.stringify({ msg: "sync_airtable_scheduled_failed", error:
      err instanceof Error && /^(AIRTABLE_|MONGODB_URI|REDIS_URL|Invalid sync option|Airtable |Invalid Airtable|Repeated Airtable|Identity conflict|Incompatible identity|Ambiguous |No usable identity|Multiple Airtable|Mighty to Airtable|Mighty → Airtable|Redis cache)/.test(err.message)
        ? err.message : "Membership sync failed; check database connectivity, identity indexes, and transaction support" }));
    process.exitCode = 1;
  });
}
