/** Strict Redis invalidation entry point for scheduled membership synchronization. */
import "dotenv/config";
import { invalidateMightyMemberCaches } from "../lib/mightyCacheInvalidate";
import redis from "../lib/redis";

async function main() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not configured");
  const result = await invalidateMightyMemberCaches({ throwOnError: true });
  console.error(JSON.stringify({ msg: "membership_sync_cache_invalidated", ...result }));
  await (redis as any).quit();
}

main().catch((error) => {
  console.error(JSON.stringify({
    msg: "membership_sync_cache_invalidation_failed",
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
