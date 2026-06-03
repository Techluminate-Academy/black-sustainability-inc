import type { MightySyncRowWithMemberId } from "@/lib/airtableMightyMembers";

export type MightyToAirtableErrorKind = "rate_limit" | "not_found" | "other";

export function classifyMightyToAirtableError(error: unknown): MightyToAirtableErrorKind {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (/429|rate limit/.test(msg)) return "rate_limit";
  if (/404|couldn't find user|not find user|member fetch failed \(404\)/.test(msg)) {
    return "not_found";
  }
  return "other";
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
