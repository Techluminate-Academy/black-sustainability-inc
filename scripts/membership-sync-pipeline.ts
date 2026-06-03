/**
 * Full membership sync pipeline:
 *   1. Mighty Networks → Airtable (profile + plans + Last Sync Date)
 *   2. Airtable → MongoDB `mightyMembers` (map/directory runtime)
 *   3. Redis cache bust (optional)
 *
 * Intended for Render cron / external scheduler every 30 minutes:
 *   npm run sync:membership-pipeline
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

function parseArgs() {
  const argv = process.argv.slice(2);
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
        return i >= 0 && argv[i + 1] ? Math.max(0, parseInt(argv[i + 1]!, 10) || 0) : 75;
      })(),
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
    })
  );

  if (!args.skipMighty) {
    const mightyArgs = ["tsx", "scripts/mighty-to-airtable-sync.ts", ...applyFlag];
    if (args.mightyLimit > 0) mightyArgs.push("--limit", String(args.mightyLimit));
    if (args.mightySleepMs > 0) mightyArgs.push("--sleep-ms", String(args.mightySleepMs));
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
      const code = runStep("airtable_to_mongo", "node", ["utils/sync-airtable.js"]);
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
