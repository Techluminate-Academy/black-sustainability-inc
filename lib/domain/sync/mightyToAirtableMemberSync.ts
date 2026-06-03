import {
  getAirtableLastSyncDateFieldName,
  getAirtableMightySyncStatusFieldName,
  patchAirtableMightyMemberByRecordId,
  upsertAirtableMightyMember,
  type MightySyncRowWithMemberId,
} from "@/lib/airtableMightyMembers";
import { extractMightyAvatarUrl } from "@/lib/domain/members/mightyAvatar";
import { fetchMightyProfileCustomFields } from "@/lib/domain/members/memberMightyCustomFields";
import {
  parseAirtableSubscriptionFields,
  resolveSubscriptionForMember,
} from "@/lib/domain/billing/mightySubscriptionSync";
import {
  fetchMightyMemberById,
  listMemberPlans,
  readMightyCustomFieldAnswer,
} from "@/lib/mightyAdmin";

import {
  classifyMightyToAirtableError,
  filterRowsNeedingMightySync,
  type MightyToAirtableErrorKind,
} from "@/lib/domain/sync/mightyToAirtableSyncHelpers";

export type { MightyToAirtableErrorKind } from "@/lib/domain/sync/mightyToAirtableSyncHelpers";
export { classifyMightyToAirtableError, filterRowsNeedingMightySync };

export type MightyToAirtableRowResult =
  | { ok: true; action: "created" | "updated" | "skipped"; recordId?: string; email?: string }
  | { ok: true; action: "marked_not_found"; recordId: string; email?: string }
  | { ok: false; kind: MightyToAirtableErrorKind; error: string };

function nonEmptyString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mapLocationFromMightyMember(member: Record<string, unknown>): string | undefined {
  const direct =
    nonEmptyString(member.location) ??
    nonEmptyString(member.city) ??
    nonEmptyString((member.profile as Record<string, unknown> | undefined)?.location);
  return direct;
}

async function mapLocationFromCustomField(mightyId: number): Promise<string | undefined> {
  const raw = process.env.MIGHTY_MAP_LOCATION_CUSTOM_FIELD_ID;
  const fieldId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(fieldId)) return undefined;
  const read = await readMightyCustomFieldAnswer({
    customFieldId: fieldId,
    mightyMemberId: mightyId,
  });
  return read?.loaded ? nonEmptyString(read.text) : undefined;
}

export type MightyToAirtableMemberPayload = Parameters<typeof upsertAirtableMightyMember>[0];

/**
 * Pull one member from Mighty Admin API and shape an Airtable upsert payload.
 */
export async function buildMightyToAirtablePayload(mightyId: number): Promise<MightyToAirtableMemberPayload> {
  const member = (await fetchMightyMemberById(mightyId)) as Record<string, unknown>;
  const nested = (member.member ?? member) as Record<string, unknown>;

  const email =
    nonEmptyString(nested.email)?.toLowerCase() ?? nonEmptyString(member.email)?.toLowerCase();
  const firstName = nonEmptyString(nested.first_name) ?? nonEmptyString(nested.firstName);
  const lastName = nonEmptyString(nested.last_name) ?? nonEmptyString(nested.lastName);
  const avatarUrl = extractMightyAvatarUrl(nested) ?? extractMightyAvatarUrl(member);

  const [custom, plans, mapLocationCustom] = await Promise.all([
    fetchMightyProfileCustomFields(mightyId),
    listMemberPlans(mightyId).catch(() => []),
    mapLocationFromCustomField(mightyId).catch(() => undefined),
  ]);

  const location =
    mapLocationCustom ??
    mapLocationFromMightyMember(nested) ??
    mapLocationFromMightyMember(member);

  const resolved = resolveSubscriptionForMember({
    airtable: parseAirtableSubscriptionFields({}),
    mightyPlans: plans,
    mightyFetched: true,
  });

  const now = new Date().toISOString();

  return {
    mightyId,
    email: email ?? undefined,
    firstName,
    lastName,
    avatarUrl: avatarUrl ?? undefined,
    bio: custom.bioLoaded ? (custom.bio ?? "") : undefined,
    location,
    organizationName: custom.organizationLoaded ? (custom.organizationName ?? undefined) : undefined,
    subscription: {
      isPaidActive: resolved.isPaidActive,
      planNames: resolved.planNames,
      planIds: resolved.planIds,
      statuses: resolved.isPaidActive ? ["active"] : [],
      updatedAt: now,
    },
    touchLastSyncDate: true,
  };
}

/** Stamp Airtable when Mighty has no member for this id (avoid endless retries). */
export async function markMightyMemberMissingInAirtable(row: {
  recordId: string;
  mightyId: number;
  email?: string | null;
}): Promise<void> {
  const fields: Record<string, unknown> = {
    [getAirtableLastSyncDateFieldName()]: new Date().toISOString(),
  };
  const statusField = getAirtableMightySyncStatusFieldName();
  if (statusField) {
    fields[statusField] = "Mighty Not Found";
  }
  await patchAirtableMightyMemberByRecordId(row.recordId, fields);
}

export async function syncMightyMemberToAirtable(mightyId: number): Promise<{
  skipped: boolean;
  action?: "created" | "updated";
  recordId?: string;
  email?: string;
}> {
  const payload = await buildMightyToAirtablePayload(mightyId);
  const result = await upsertAirtableMightyMember(payload);
  return { ...result, email: payload.email ?? undefined };
}

/** Mighty fetch + Airtable upsert with backoff on 429. */
export async function syncMightyMemberToAirtableWithRetry(
  mightyId: number,
  opts?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<{ skipped: boolean; action?: "created" | "updated"; recordId?: string; email?: string }> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const baseDelayMs = opts?.baseDelayMs ?? 2500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await syncMightyMemberToAirtable(mightyId);
    } catch (e) {
      lastError = e;
      const kind = classifyMightyToAirtableError(e);
      if (kind !== "rate_limit" || attempt >= maxAttempts) throw e;
      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function syncMightyRowToAirtable(row: MightySyncRowWithMemberId): Promise<MightyToAirtableRowResult> {
  const email = (row.email ?? "").trim().toLowerCase();
  try {
    const result = await syncMightyMemberToAirtableWithRetry(row.mightyId);
    if (result.skipped) {
      return { ok: true, action: "skipped", recordId: row.recordId, email: result.email ?? email };
    }
    return {
      ok: true,
      action: result.action ?? "updated",
      recordId: result.recordId ?? row.recordId,
      email: result.email ?? email,
    };
  } catch (e) {
    const kind = classifyMightyToAirtableError(e);
    if (kind === "not_found") {
      await markMightyMemberMissingInAirtable(row);
      return {
        ok: true,
        action: "marked_not_found",
        recordId: row.recordId,
        email: email || undefined,
      };
    }
    return {
      ok: false,
      kind,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type MightyToAirtableBatchSummary = {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  markedNotFound: number;
  retryableFailures: number;
  roundsUsed: number;
  failedRows: Array<{ mightyId: number; email: string | null; recordId: string; kind: string; error: string }>;
};

export async function runMightyToAirtableBatchSync(params: {
  rows: MightySyncRowWithMemberId[];
  sleepMs: number;
  retryRounds: number;
  onRow?: (payload: Record<string, unknown>) => void;
}): Promise<MightyToAirtableBatchSummary> {
  let pending = [...params.rows];
  const summary: MightyToAirtableBatchSummary = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    markedNotFound: 0,
    retryableFailures: 0,
    roundsUsed: 0,
    failedRows: [],
  };

  const maxRounds = Math.max(1, params.retryRounds);

  for (let round = 1; round <= maxRounds && pending.length > 0; round++) {
    summary.roundsUsed = round;
    const roundSleepMs = params.sleepMs * round;
    const failedNext: MightySyncRowWithMemberId[] = [];

    for (const row of pending) {
      summary.processed++;
      const email = (row.email ?? "").trim().toLowerCase();
      const result = await syncMightyRowToAirtable(row);

      if (result.ok) {
        if (result.action === "created") summary.created++;
        else if (result.action === "updated") summary.updated++;
        else if (result.action === "skipped") summary.skipped++;
        else if (result.action === "marked_not_found") summary.markedNotFound++;
        params.onRow?.({
          action: result.action,
          round,
          mightyId: row.mightyId,
          email: result.email ?? email,
          record_id: result.recordId ?? row.recordId,
        });
      } else {
        failedNext.push(row);
        summary.failedRows.push({
          mightyId: row.mightyId,
          email: row.email,
          recordId: row.recordId,
          kind: result.kind,
          error: result.error,
        });
        params.onRow?.({
          action: "error",
          round,
          mightyId: row.mightyId,
          email,
          record_id: row.recordId,
          kind: result.kind,
          error: result.error,
        });
      }

      if (roundSleepMs > 0) await sleep(roundSleepMs);
    }

    pending = failedNext;
    summary.retryableFailures = pending.length;

    if (pending.length > 0 && round < maxRounds) {
      params.onRow?.({
        msg: "mighty_to_airtable_retry_round",
        round: round + 1,
        pendingCount: pending.length,
        sleepMs: params.sleepMs * (round + 1),
      });
      // Extra pause between rounds when rate-limited.
      await sleep(Math.max(5000, params.sleepMs * 5));
    }
  }

  summary.retryableFailures = pending.length;
  summary.failedRows = pending.map((row) => ({
    mightyId: row.mightyId,
    email: row.email,
    recordId: row.recordId,
    kind: "pending_after_retries",
    error: "Exhausted retry rounds",
  }));

  return summary;
}
