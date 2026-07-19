import type { MightySyncRowWithMemberId } from "@/lib/airtableMightyMembers";

export type MightyToAirtableErrorKind = "rate_limit" | "not_found" | "other";

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
