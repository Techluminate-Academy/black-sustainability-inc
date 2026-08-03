import type { MightySyncRowWithMemberId } from "@/lib/airtableMightyMembers";
import type { MightyMemberListMetadata } from "@/lib/mightyAdmin";

export type MightyToAirtableErrorKind = "rate_limit" | "not_found" | "other";

export type DeltaSyncReason = "changed" | "new" | "missing_sync_date" | "safety";

export type DeltaSyncCandidate = {
  mightyId: number;
  email: string | null;
  recordId?: string;
  reason: DeltaSyncReason;
  lastSyncDate?: string | null;
  mightyUpdatedAt?: string | null;
};

export type DeltaSelectionStats = {
  mightyDiscovered: number;
  airtableWithId: number;
  changed: number;
  newMembers: number;
  missingSyncDate: number;
  safety: number;
  selected: number;
};

export function normalizeAirtableSelectOption(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  let value = v.trim();
  if (!value) return undefined;
  while (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

export function classifyMightyToAirtableError(error: unknown): MightyToAirtableErrorKind {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (/429|rate limit/.test(msg)) return "rate_limit";
  if (/404|couldn't find user|not find user|member fetch failed \(404\)/.test(msg)) {
    return "not_found";
  }
  return "other";
}

export function startOfUtcDayMs(at: Date = new Date()): number {
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
}

export function filterRowsNeedingMightySync(
  rows: MightySyncRowWithMemberId[],
  syncedAfterMs: number
): MightySyncRowWithMemberId[] {
  return rows.filter((row) => {
    if (!row.lastSyncDate) return true;
    const d = new Date(row.lastSyncDate);
    if (Number.isNaN(d.getTime())) return true;
    return d.getTime() < syncedAfterMs;
  });
}

function parseTimestampMs(v: string | null | undefined): number | null {
  if (!v?.trim()) return null;
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Compare Mighty list `updated_at` against Airtable `Last Sync Date` and pick
 * only rows that need a detail sync, plus an oldest-first safety batch.
 */
export function selectDeltaSyncCandidates(params: {
  mightyMembers: MightyMemberListMetadata[];
  airtableRows: MightySyncRowWithMemberId[];
  safetyBatchSize?: number;
}): { candidates: DeltaSyncCandidate[]; stats: DeltaSelectionStats } {
  const safetyBatchSize = Math.max(0, params.safetyBatchSize ?? 100);
  const airtableById = new Map<number, MightySyncRowWithMemberId>();
  for (const row of params.airtableRows) {
    airtableById.set(row.mightyId, row);
  }

  const selectedIds = new Set<number>();
  const candidates: DeltaSyncCandidate[] = [];
  let changed = 0;
  let newMembers = 0;
  let missingSyncDate = 0;

  for (const member of params.mightyMembers) {
    const row = airtableById.get(member.mightyId);
    if (!row) {
      newMembers++;
      selectedIds.add(member.mightyId);
      candidates.push({
        mightyId: member.mightyId,
        email: member.email,
        reason: "new",
        mightyUpdatedAt: member.updatedAt,
      });
      continue;
    }

    const lastSyncMs = parseTimestampMs(row.lastSyncDate);
    if (lastSyncMs == null) {
      missingSyncDate++;
      selectedIds.add(member.mightyId);
      candidates.push({
        mightyId: member.mightyId,
        email: row.email ?? member.email,
        recordId: row.recordId,
        reason: "missing_sync_date",
        lastSyncDate: row.lastSyncDate,
        mightyUpdatedAt: member.updatedAt,
      });
      continue;
    }

    const mightyUpdatedMs = parseTimestampMs(member.updatedAt);
    if (mightyUpdatedMs != null && mightyUpdatedMs > lastSyncMs) {
      changed++;
      selectedIds.add(member.mightyId);
      candidates.push({
        mightyId: member.mightyId,
        email: row.email ?? member.email,
        recordId: row.recordId,
        reason: "changed",
        lastSyncDate: row.lastSyncDate,
        mightyUpdatedAt: member.updatedAt,
      });
    }
  }

  // Oldest-first safety sweep for rows not already selected (covers plan/custom-field drift).
  const safetyPool = params.airtableRows
    .filter((row) => !selectedIds.has(row.mightyId))
    .slice()
    .sort((a, b) => {
      const aMs = parseTimestampMs(a.lastSyncDate);
      const bMs = parseTimestampMs(b.lastSyncDate);
      if (aMs == null && bMs == null) return a.mightyId - b.mightyId;
      if (aMs == null) return -1;
      if (bMs == null) return 1;
      if (aMs !== bMs) return aMs - bMs;
      return a.mightyId - b.mightyId;
    });

  let safety = 0;
  for (const row of safetyPool.slice(0, safetyBatchSize)) {
    safety++;
    selectedIds.add(row.mightyId);
    candidates.push({
      mightyId: row.mightyId,
      email: row.email,
      recordId: row.recordId,
      reason: "safety",
      lastSyncDate: row.lastSyncDate,
    });
  }

  const stats: DeltaSelectionStats = {
    mightyDiscovered: params.mightyMembers.length,
    airtableWithId: params.airtableRows.length,
    changed,
    newMembers,
    missingSyncDate,
    safety,
    selected: candidates.length,
  };

  return { candidates, stats };
}
