import {
  extractMemberImageUrl,
  isLikelyWideBrandImageUrl,
  isPlatformIconUrl,
  isPortraitHeadshotUrl,
} from "@/lib/getMemberDisplayImage";
import { extractMightyAvatarUrl } from "@/lib/domain/members/mightyAvatar";
import {
  downloadImageForAvatar,
  fetchMightyMemberById,
  getMightyCustomFieldAnswerText,
  mightyGetMemberByEmail,
  updateMightyMemberAvatar,
  uploadMightyAvatarAsset,
  upsertMightyCustomFieldAnswer,
  withMightyRateLimitRetry,
} from "@/lib/mightyAdmin";
import { getMightySyncTableConfig, upsertAirtableMightyMember } from "@/lib/airtableMightyMembers";
import type { Db } from "mongodb";

const EMAIL_FIELDS = ["Primary Email", "EMAIL ADDRESS", "Email", "email"] as const;
const BIO_FIELD_KEYS = [
  "Extended Bio",
  "Short Bio",
  "BIO",
  "Bio",
  "Member Bio",
  "About",
  "Description",
  "bio",
] as const;
const BIO_MAX = 5000;

export type LegacyRosterRecord = {
  recordId: string;
  email: string;
  mightyIdFromAirtable: number | null;
  fields: Record<string, unknown>;
  legacyBio: string;
  legacyPhotoUrl: string | null;
};

export type LegacyRosterConfig = {
  apiKey: string;
  baseId: string;
  table: string;
  view?: string;
};

export type BackfillTargets = {
  mightyBio: boolean;
  mightyPhoto: boolean;
  mongoBio: boolean;
  mongoPhoto: boolean;
};

export type BackfillMemberState = {
  email: string;
  mightyId: number;
  legacyBio: string;
  legacyPhotoUrl: string | null;
  mightyBio: string | null;
  mightyAvatarUrl: string | null;
  mongoBio: string | null;
  mongoAvatarUrl: string | null;
  targets: BackfillTargets;
};

export type BackfillApplyResult = {
  email: string;
  mightyId: number;
  applied: {
    mightyBio: boolean;
    mightyPhoto: boolean;
    mongoBio: boolean;
    mongoPhoto: boolean;
    airtable: boolean;
  };
  errors: string[];
};

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function bioFieldIdFromEnv(): number | null {
  const raw = process.env.MIGHTY_BIO_CUSTOM_FIELD_ID;
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

/** Mighty Members Airtable sync table (AIRTABLE_PAT + AIRTABLE_MIGHTY_SYNC_*). */
export function getMightyMembersSourceConfig(): LegacyRosterConfig | null {
  const cfg = getMightySyncTableConfig();
  if (!cfg) return null;
  const view = process.env.AIRTABLE_MIGHTY_SYNC_VIEW_ID?.trim() || undefined;
  return { apiKey: cfg.apiKey, baseId: cfg.baseId, table: cfg.table, view };
}

/** @deprecated Use getMightyMembersSourceConfig */
export const getLegacyRosterConfig = getMightyMembersSourceConfig;

export function extractEmailFromAirtableFields(fields: Record<string, unknown>): string | null {
  for (const key of EMAIL_FIELDS) {
    const email = nonEmpty(fields[key]);
    if (email?.includes("@")) return email.toLowerCase();
  }
  return null;
}

export function extractLegacyPhotoUrl(fields: Record<string, unknown>): string | null {
  const profilePhotoUrl = nonEmpty(fields["Profile Photo URL"]);
  if (profilePhotoUrl) {
    if (isPlatformIconUrl(profilePhotoUrl) || isLikelyWideBrandImageUrl(profilePhotoUrl)) return null;
    return profilePhotoUrl;
  }

  if (!isPortraitHeadshotUrl(fields)) return null;
  for (const key of ["PHOTO", "Profile Photo", "Profile Image", "userphoto", "headshot"]) {
    const url = extractMemberImageUrl(fields[key]);
    if (url) return url;
  }
  return null;
}

export function extractLegacyBio(fields: Record<string, unknown>): string {
  for (const key of BIO_FIELD_KEYS) {
    const bio = nonEmpty(fields[key]);
    if (bio) return bio.length > BIO_MAX ? bio.slice(0, BIO_MAX) : bio;
  }
  return "";
}

function parseMightyMemberId(fields: Record<string, unknown>): number | null {
  const raw = fields["Mighty Member ID"];
  const id = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

export async function fetchAllLegacyRosterRecords(
  cfg: LegacyRosterConfig
): Promise<LegacyRosterRecord[]> {
  const out: LegacyRosterRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.table)}`
    );
    url.searchParams.set("pageSize", "100");
    if (cfg.view) url.searchParams.set("view", cfg.view);
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Mighty Members Airtable fetch failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      records?: Array<{ id: string; fields?: Record<string, unknown> }>;
      offset?: string;
    };

    for (const rec of data.records ?? []) {
      const fields = rec.fields ?? {};
      const email = extractEmailFromAirtableFields(fields);
      if (!email) continue;

      const legacyBio = extractLegacyBio(fields);
      const legacyPhotoUrl = extractLegacyPhotoUrl(fields);
      if (!legacyBio && !legacyPhotoUrl) continue;

      out.push({
        recordId: rec.id,
        email,
        mightyIdFromAirtable: parseMightyMemberId(fields),
        fields,
        legacyBio,
        legacyPhotoUrl,
      });
    }

    offset = data.offset;
  } while (offset);

  return out;
}

export async function summarizeBackfillCandidates(
  db: Db,
  rows: LegacyRosterRecord[],
  opts: { includeBios: boolean; includePhotos: boolean }
): Promise<{
  skippedNoMightyId: number;
  mongoBioGaps: number;
  mongoPhotoGaps: number;
  airtableWithBio: number;
  airtableWithPhoto: number;
}> {
  const emails = rows.map((r) => r.email);
  const mongoDocs = await db
    .collection("mightyMembers")
    .find({ email: { $in: emails } }, { projection: { email: 1, bio: 1, avatarUrl: 1, mightyId: 1 } })
    .toArray();
  const mongoByEmail = new Map(
    mongoDocs.map((d) => [String(d.email).toLowerCase(), d as Record<string, unknown>])
  );

  let skippedNoMightyId = 0;
  let mongoBioGaps = 0;
  let mongoPhotoGaps = 0;
  let airtableWithBio = 0;
  let airtableWithPhoto = 0;

  for (const row of rows) {
    if (row.legacyBio) airtableWithBio++;
    if (row.legacyPhotoUrl) airtableWithPhoto++;

    const mongo = mongoByEmail.get(row.email);
    const mightyId =
      row.mightyIdFromAirtable ??
      (typeof mongo?.mightyId === "number" && Number.isFinite(mongo.mightyId) ? mongo.mightyId : null);
    if (mightyId == null) {
      skippedNoMightyId++;
      continue;
    }

    const mongoBio = nonEmpty(mongo?.bio);
    const mongoAvatar = nonEmpty(mongo?.avatarUrl);
    if (opts.includeBios && row.legacyBio && !mongoBio) mongoBioGaps++;
    if (opts.includePhotos && row.legacyPhotoUrl && !mongoAvatar) mongoPhotoGaps++;
  }

  return {
    skippedNoMightyId,
    mongoBioGaps,
    mongoPhotoGaps,
    airtableWithBio,
    airtableWithPhoto,
  };
}

/** Re-fetch Profile Photo URL from Airtable (attachment URLs expire). */
export async function fetchPhotoUrlFromAirtableRecord(
  cfg: LegacyRosterConfig,
  recordId: string
): Promise<string | null> {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.table)}/${encodeURIComponent(recordId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { fields?: Record<string, unknown> };
  return extractLegacyPhotoUrl(data.fields ?? {});
}

export async function loadMemberBackfillState(
  db: Db,
  params: {
    email: string;
    mightyIdHint?: number | null;
    legacyBio: string;
    legacyPhotoUrl: string | null;
    includeBios: boolean;
    includePhotos: boolean;
  }
): Promise<BackfillMemberState | { skip: string }> {
  const coll = db.collection("mightyMembers");
  const mongoDoc = await coll.findOne(
    { email: params.email },
    { projection: { mightyId: 1, bio: 1, avatarUrl: 1 } }
  );

  let mightyId =
    params.mightyIdHint ??
    (typeof mongoDoc?.mightyId === "number" && Number.isFinite(mongoDoc.mightyId)
      ? mongoDoc.mightyId
      : null);

  if (mightyId == null) {
    const byEmail = await mightyGetMemberByEmail(params.email);
    mightyId = byEmail?.id ?? null;
  }

  if (mightyId == null) {
    return { skip: "no_mighty_member" };
  }

  const bioFieldId = bioFieldIdFromEnv();
  const [mightyMember, mightyBioAnswer] = await Promise.all([
    fetchMightyMemberById(mightyId).catch(() => null),
    bioFieldId && params.includeBios
      ? getMightyCustomFieldAnswerText({ customFieldId: bioFieldId, mightyMemberId: mightyId })
      : Promise.resolve(null),
  ]);

  const mightyAvatarUrl = mightyMember ? extractMightyAvatarUrl(mightyMember) : null;
  const mongoBio = nonEmpty(mongoDoc?.bio);
  const mongoAvatarUrl = nonEmpty(mongoDoc?.avatarUrl);

  const targets: BackfillTargets = {
    mightyBio:
      params.includeBios &&
      !!params.legacyBio &&
      !!bioFieldId &&
      !nonEmpty(mightyBioAnswer),
    mongoBio: params.includeBios && !!params.legacyBio && !mongoBio,
    mightyPhoto:
      params.includePhotos && !!params.legacyPhotoUrl && !mightyAvatarUrl,
    mongoPhoto: params.includePhotos && !!params.legacyPhotoUrl && !mongoAvatarUrl,
  };

  return {
    email: params.email,
    mightyId,
    legacyBio: params.legacyBio,
    legacyPhotoUrl: params.legacyPhotoUrl,
    mightyBio: nonEmpty(mightyBioAnswer),
    mightyAvatarUrl,
    mongoBio,
    mongoAvatarUrl,
    targets,
  };
}

export async function applyLegacyProfileBackfill(
  db: Db,
  state: BackfillMemberState,
  opts: {
    syncAirtable: boolean;
    airtableRecordId?: string;
    airtableCfg?: LegacyRosterConfig | null;
  }
): Promise<BackfillApplyResult> {
  const result: BackfillApplyResult = {
    email: state.email,
    mightyId: state.mightyId,
    applied: {
      mightyBio: false,
      mightyPhoto: false,
      mongoBio: false,
      mongoPhoto: false,
      airtable: false,
    },
    errors: [],
  };

  const coll = db.collection("mightyMembers");
  const mongoSet: Record<string, unknown> = {
    email: state.email,
    mightyId: state.mightyId,
    updatedAt: new Date(),
  };
  let mongoChanged = false;
  let uploadedAvatarUrl: string | null = null;

  if (state.targets.mightyBio) {
    const bioFieldId = bioFieldIdFromEnv();
    if (!bioFieldId) {
      result.errors.push("MIGHTY_BIO_CUSTOM_FIELD_ID not configured");
    } else {
      const ans = await withMightyRateLimitRetry(
        () =>
          upsertMightyCustomFieldAnswer({
            customFieldId: bioFieldId,
            mightyMemberId: state.mightyId,
            text: state.legacyBio,
          }),
        (r) => (r.ok ? "" : r.message)
      );
      if (!ans.ok) {
        result.errors.push(`Mighty bio: ${ans.message.slice(0, 200)}`);
      } else {
        result.applied.mightyBio = true;
      }
    }
  }

  if (state.targets.mightyPhoto && state.legacyPhotoUrl) {
    let photoUrl = state.legacyPhotoUrl;
    const apiKey = opts.airtableCfg?.apiKey;
    let downloaded = await downloadImageForAvatar(photoUrl, { airtableApiKey: apiKey });

    if (!downloaded.ok && opts.airtableRecordId && opts.airtableCfg) {
      const fresh = await fetchPhotoUrlFromAirtableRecord(
        opts.airtableCfg,
        opts.airtableRecordId
      );
      if (fresh && fresh !== photoUrl) {
        photoUrl = fresh;
        downloaded = await downloadImageForAvatar(fresh, { airtableApiKey: apiKey });
      }
    }

    if (!downloaded.ok) {
      result.errors.push(`Photo download: ${downloaded.error}`);
    } else {
      const uploaded = await withMightyRateLimitRetry(
        () =>
          uploadMightyAvatarAsset({
            imageBytes: downloaded.bytes,
            filename: downloaded.filename,
            contentType: downloaded.contentType,
          }),
        (r) => (r.ok ? "" : r.error)
      );
      if (!uploaded.ok) {
        result.errors.push(`Mighty asset upload: ${uploaded.error.slice(0, 200)}`);
      } else {
        const assigned = await withMightyRateLimitRetry(
          () =>
            updateMightyMemberAvatar({
              mightyMemberId: state.mightyId,
              avatarUrl: uploaded.url,
            }),
          (r) => (r.ok ? "" : r.message)
        );
        if (!assigned.ok) {
          result.errors.push(`Mighty avatar assign: ${assigned.message.slice(0, 200)}`);
        } else {
          uploadedAvatarUrl =
            extractMightyAvatarUrl(assigned.member as Record<string, unknown>) || uploaded.url;
          result.applied.mightyPhoto = true;
          mongoSet.avatarUrl = uploadedAvatarUrl;
          mongoChanged = true;
          result.applied.mongoPhoto = true;
        }
      }
    }
  }

  if (state.targets.mongoBio) {
    mongoSet.bio = state.legacyBio;
    mongoChanged = true;
    result.applied.mongoBio = true;
  } else if (!state.mongoBio && state.mightyBio) {
    mongoSet.bio = state.mightyBio;
    mongoChanged = true;
    result.applied.mongoBio = true;
  }

  if (state.targets.mongoPhoto) {
    const photoUrl = uploadedAvatarUrl || state.mightyAvatarUrl || state.legacyPhotoUrl;
    if (photoUrl) {
      mongoSet.avatarUrl = photoUrl;
      mongoChanged = true;
      result.applied.mongoPhoto = true;
    }
  }

  if (mongoChanged) {
    mongoSet.source = "legacy:profile-backfill";
    await coll.updateOne(
      { $or: [{ mightyId: state.mightyId }, { email: state.email }] },
      {
        $set: mongoSet,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  if (
    opts.syncAirtable &&
    (result.applied.mightyBio || result.applied.mongoBio || result.applied.mongoPhoto)
  ) {
    try {
      await upsertAirtableMightyMember({
        mightyId: state.mightyId,
        email: state.email,
        bio: result.applied.mongoBio ? state.legacyBio : undefined,
        avatarUrl: typeof mongoSet.avatarUrl === "string" ? mongoSet.avatarUrl : undefined,
      });
      result.applied.airtable = true;
    } catch (e) {
      result.errors.push(
        `Airtable sync: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200)
      );
    }
  }

  return result;
}

export async function invalidateCachesAfterBackfill(): Promise<void> {
  const { invalidateMightyMemberCaches } = await import("@/lib/mightyCacheInvalidate");
  await invalidateMightyMemberCaches().catch(() => {});
}
