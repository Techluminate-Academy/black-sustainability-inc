/**
 * Full membership sync pipeline:
 *   1. Mighty Networks → Airtable (profile + plans + Last Sync Date)
 *   2. Airtable → MongoDB `mightyMembers` (map/directory runtime)
 *   3. Redis cache bust (optional)
 *
 * Intended for Render cron (twice daily) or manual runs:
 *   npm run sync:membership-pipeline:apply
 *
 * Webhooks handle real-time updates; cron reconciles the full roster morning + night.
 * Default Mighty API pacing: --sleep-ms 450 (override with --mighty-sleep-ms N).
 * Scheduled cron entry point: `node utils/sync-airtable.js` (same defaults).
 *
 * Usage:
 *   npx tsx scripts/membership-sync-pipeline.ts
 *   npx tsx scripts/membership-sync-pipeline.ts --apply
 *   npx tsx scripts/membership-sync-pipeline.ts --apply --skip-mighty
 *   npx tsx scripts/membership-sync-pipeline.ts --apply --skip-cache
 */
import "dotenv/config";

import { spawnSync } from "node:child_process";
import path from "node:path";

/** Pacing between Mighty Admin API calls (cron default; reduces 429 rate limits). */
const DEFAULT_MIGHTY_SLEEP_MS = 450;
const DEFAULT_MIGHTY_RETRY_ROUNDS = 3;

function parseArgs() {
  const argv = process.argv.slice(2);
  const retryIdx = argv.indexOf("--retry-rounds");
  const envRetry = parseInt(process.env.MIGHTY_SYNC_RETRY_ROUNDS || "", 10);
  return {
    apply: argv.includes("--apply"),
    skipMighty: argv.includes("--skip-mighty"),
    skipMongo: argv.includes("--skip-mongo"),
    skipCache: argv.includes("--skip-cache"),
    mightyLimit:
      (() => {
        const i = argv.indexOf("--mighty-limit");
        return i >= 0 && argv[i + 1] ? Math.max(0, parseInt(argv[i + 1]!, 10) || 0) : 0;
      })(),
    mightySleepMs:
      (() => {
        const i = argv.indexOf("--mighty-sleep-ms");
        return i >= 0 && argv[i + 1]
          ? Math.max(0, parseInt(argv[i + 1]!, 10) || 0)
          : DEFAULT_MIGHTY_SLEEP_MS;
      })(),
    mightyRetryRounds:
      retryIdx >= 0 && argv[retryIdx + 1]
        ? Math.max(1, parseInt(argv[retryIdx + 1]!, 10) || 1)
        : Number.isFinite(envRetry)
          ? Math.max(1, envRetry)
          : DEFAULT_MIGHTY_RETRY_ROUNDS,
  };
}

function runStep(label: string, command: string, args: string[]): number {
  console.error(JSON.stringify({ msg: "membership_sync_step_start", step: label, command, args }));
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    cwd: path.resolve(__dirname, ".."),
  });
  const code = result.status ?? 1;
  console.error(JSON.stringify({ msg: "membership_sync_step_done", step: label, exitCode: code }));
  return code;
}

async function invalidateCaches(): Promise<void> {
  const { invalidateMightyMemberCaches } = await import("../lib/mightyCacheInvalidate");
  await invalidateMightyMemberCaches();
}

async function main() {
  const args = parseArgs();
  const applyFlag = args.apply ? ["--apply"] : [];

  console.error(
    JSON.stringify({
      msg: "membership_sync_pipeline_start",
      mode: args.apply ? "apply" : "dry-run",
      skipMighty: args.skipMighty,
      skipMongo: args.skipMongo,
      skipCache: args.skipCache,
      mightySleepMs: args.mightySleepMs,
      mightyRetryRounds: args.mightyRetryRounds,
    })
  );

  if (!args.skipMighty) {
    const mightyArgs = ["tsx", "scripts/mighty-to-airtable-sync.ts", ...applyFlag];
    if (args.mightyLimit > 0) mightyArgs.push("--limit", String(args.mightyLimit));
    if (args.mightySleepMs > 0) mightyArgs.push("--sleep-ms", String(args.mightySleepMs));
    mightyArgs.push("--retry-rounds", String(args.mightyRetryRounds));
    const code = runStep("mighty_to_airtable", "npx", mightyArgs);
    if (code !== 0) process.exit(code);
  }

  if (!args.skipMongo) {
    if (!args.apply) {
      console.error(
        JSON.stringify({
          msg: "membership_sync_step_skipped",
          step: "airtable_to_mongo",
          reason: "dry-run (re-run with --apply)",
        })
      );
    } else {
      const code = runStep("airtable_to_mongo", "node", [
        "utils/sync-airtable.js",
        "--skip-mighty",
        "--skip-cache",
      ]);
      if (code !== 0) process.exit(code);
    }
  }

  if (args.apply && !args.skipCache) {
    await invalidateCaches().catch((e) => {
      console.warn(
        JSON.stringify({
          msg: "membership_sync_cache_invalidate_failed",
          error: e instanceof Error ? e.message : String(e),
        })
      );
    });
  }

  console.error(JSON.stringify({ msg: "membership_sync_pipeline_done", mode: args.apply ? "apply" : "dry-run" }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
