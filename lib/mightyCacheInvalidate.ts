import redis from "./redis";

/**
 * Cache key shapes maintained by the public list/map APIs.
 * Keep these in sync with: pages/api/getMarkers.js, getData.js, filterData.js, searchData.js.
 */
const FIXED_KEYS: string[] = ["map-locations:v9:mightyMembers"];
const SCAN_PATTERNS: string[] = [
  "getData:v13:photo-tier:mightyMembers:*",
  "filterData:v11:photo-tier:mightyMembers:*",
  "search:v4:mightyMembers:*",
];

const SCAN_COUNT = 200;

async function delByPattern(pattern: string): Promise<number> {
  let cursor = "0";
  let deleted = 0;
  do {
    const reply: [string, string[]] = await (redis as any).scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      SCAN_COUNT
    );
    cursor = reply[0];
    const keys = reply[1] || [];
    if (keys.length) {
      await (redis as any).del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== "0");
  return deleted;
}

/**
 * Best-effort invalidate the map/list/search caches that depend on `mightyMembers`.
 * Called after a successful Mighty webhook upsert so the public site reflects
 * profile updates on the next request instead of waiting for the TTL.
 */
export async function invalidateMightyMemberCaches(options: { throwOnError?: boolean } = {}): Promise<{ totalDeleted: number }> {
  let totalDeleted = 0;
  const failures: Error[] = [];
  try {
    if (FIXED_KEYS.length) {
      const removed = await (redis as any).del(...FIXED_KEYS);
      totalDeleted += typeof removed === "number" ? removed : 0;
    }
    for (const pattern of SCAN_PATTERNS) {
      try {
        totalDeleted += await delByPattern(pattern);
      } catch (e: any) {
        console.warn("[mighty cache invalidate] pattern failed:", pattern, e?.message || e);
        failures.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (totalDeleted > 0) {
      console.log(`[mighty cache invalidate] cleared ${totalDeleted} key(s)`);
    }
  } catch (e: any) {
    console.warn("[mighty cache invalidate] non-fatal error:", e?.message || e);
    failures.push(e instanceof Error ? e : new Error(String(e)));
  }
  if (options.throwOnError && failures.length) {
    throw new Error(`Mighty member cache invalidation failed: ${failures[0].message}`);
  }
  return { totalDeleted };
}
