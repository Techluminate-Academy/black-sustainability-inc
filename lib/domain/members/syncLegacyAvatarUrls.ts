import {
  fetchAllLegacyRosterRecords,
  getMightyMembersSourceConfig,
  invalidateCachesAfterBackfill,
  type LegacyRosterConfig,
} from "@/lib/domain/members/legacyProfileBackfill";
import type { Db } from "mongodb";

export type SyncLegacyAvatarUrlsResult = {
  airtableWithPhoto: number;
  matchedMongo: number;
  updated: number;
  clearedStaleUrls: number;
  skippedNoEmail: number;
  skippedNoPhoto: number;
  skippedNoMongoRow: number;
};

/**
 * Link mongo members to Mighty Members Airtable rows that have legacy photos.
 * Stores `legacyAvatarAirtableRecordId` only — map UI uses /api/member-legacy-photo
 * to resolve fresh attachment URLs (Airtable CDN links expire).
 */
export async function syncLegacyAvatarUrlsToMongo(
  db: Db,
  cfg: LegacyRosterConfig,
  opts?: { emailFilter?: string | null }
): Promise<SyncLegacyAvatarUrlsResult> {
  const coll = db.collection("mightyMembers");
  const rows = await fetchAllLegacyRosterRecords(cfg);
  let workRows = rows;
  const normalizedEmailFilter = opts?.emailFilter?.trim().toLowerCase() || null;
  if (normalizedEmailFilter) {
    workRows = rows.filter((r) => r.email === normalizedEmailFilter);
  }

  const stats: SyncLegacyAvatarUrlsResult = {
    airtableWithPhoto: 0,
    matchedMongo: 0,
    updated: 0,
    clearedStaleUrls: 0,
    skippedNoEmail: 0,
    skippedNoPhoto: 0,
    skippedNoMongoRow: 0,
  };

  for (const row of workRows) {
    if (!row.email) {
      stats.skippedNoEmail++;
      continue;
    }
    if (!row.legacyPhotoUrl) {
      stats.skippedNoPhoto++;
      continue;
    }
    stats.airtableWithPhoto++;

    const filter = row.mightyIdFromAirtable
      ? { $or: [{ email: row.email }, { mightyId: row.mightyIdFromAirtable }] }
      : { email: row.email };

    const existing = await coll.findOne(filter, {
      projection: { legacyAvatarAirtableRecordId: 1, legacyAvatarUrl: 1 },
    });
    if (!existing) {
      stats.skippedNoMongoRow++;
      continue;
    }
    stats.matchedMongo++;

    const currentId =
      typeof existing.legacyAvatarAirtableRecordId === "string"
        ? existing.legacyAvatarAirtableRecordId.trim()
        : "";
    const needsRecordId = currentId !== row.recordId;
    const hasStaleUrl =
      typeof existing.legacyAvatarUrl === "string" && existing.legacyAvatarUrl.length > 0;

    if (!needsRecordId && !hasStaleUrl) continue;

    const $set: Record<string, unknown> = {
      legacyAvatarAirtableRecordId: row.recordId,
      updatedAt: new Date(),
    };
    const update: Record<string, unknown> = { $set };
    if (hasStaleUrl) {
      update.$unset = { legacyAvatarUrl: "" };
      stats.clearedStaleUrls++;
    }

    await coll.updateOne(filter, update);
    stats.updated++;
  }

  return stats;
}

export async function runSyncLegacyAvatarUrls(opts?: {
  emailFilter?: string | null;
  invalidateCache?: boolean;
}): Promise<SyncLegacyAvatarUrlsResult> {
  const cfg = getMightyMembersSourceConfig();
  if (!cfg) {
    throw new Error(
      "Mighty Members Airtable not configured. Set AIRTABLE_PAT and AIRTABLE_MIGHTY_SYNC_BASE_ID + table id/name."
    );
  }

  const { connectToDatabase } = await import("@/lib/mongodb");
  const { db } = await connectToDatabase();
  const stats = await syncLegacyAvatarUrlsToMongo(db, cfg, {
    emailFilter: opts?.emailFilter ?? null,
  });

  if (stats.updated > 0 && opts?.invalidateCache !== false) {
    await invalidateCachesAfterBackfill();
  }

  return stats;
}
