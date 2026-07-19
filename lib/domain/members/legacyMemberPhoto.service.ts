import {
  fetchPhotoUrlFromAirtableRecord,
  getMightyMembersSourceConfig,
  type LegacyRosterConfig,
} from "@/lib/domain/members/legacyProfileBackfill";
import { isValidAirtableRecordId } from "@/lib/memberMapPhotoUrl";

const DEFAULT_CACHE_SECS = 45 * 60;

function cacheSecsFromEnv(): number {
  const raw = process.env.LEGACY_PHOTO_CACHE_SECS;
  const n = raw ? Number(raw) : DEFAULT_CACHE_SECS;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_CACHE_SECS;
}

function cacheKey(recordId: string): string {
  return `legacy-photo:v1:${recordId}`;
}

export type LegacyMemberPhotoResolveResult =
  | { ok: true; url: string; fromCache: boolean }
  | { ok: false; status: 400 | 404 | 503; error: string };

export async function fetchFreshLegacyPhotoUrl(
  cfg: LegacyRosterConfig,
  recordId: string
): Promise<string | null> {
  return fetchPhotoUrlFromAirtableRecord(cfg, recordId);
}

export async function resolveLegacyMemberPhotoUrl(
  recordId: string,
  opts?: { cfg?: LegacyRosterConfig | null; useCache?: boolean }
): Promise<LegacyMemberPhotoResolveResult> {
  const id = recordId.trim();
  if (!isValidAirtableRecordId(id)) {
    return { ok: false, status: 400, error: "Invalid recordId" };
  }

  const cfg = opts?.cfg ?? getMightyMembersSourceConfig();
  if (!cfg) {
    return { ok: false, status: 503, error: "Airtable legacy photo source not configured" };
  }

  const useCache = opts?.useCache !== false;
  const ttl = cacheSecsFromEnv();

  if (useCache) {
    try {
      const redis = (await import("@/lib/redis")).default;
      const cached = await (redis as { get: (k: string) => Promise<string | null> }).get(
        cacheKey(id)
      );
      if (cached && cached.startsWith("http")) {
        return { ok: true, url: cached, fromCache: true };
      }
    } catch {
      // Redis optional — fall through to Airtable
    }
  }

  const url = await fetchFreshLegacyPhotoUrl(cfg, id);
  if (!url) {
    return { ok: false, status: 404, error: "No legacy photo on record" };
  }

  if (useCache) {
    try {
      const redis = (await import("@/lib/redis")).default;
      await (redis as { setex: (k: string, ttl: number, v: string) => Promise<unknown> }).setex(
        cacheKey(id),
        ttl,
        url
      );
    } catch {
      // non-fatal
    }
  }

  return { ok: true, url, fromCache: false };
}
