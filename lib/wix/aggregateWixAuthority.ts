/**
 * Aggregate Wix raw subscription rows by email with Phase 1 reconciliation rules.
 * Unresolved rows (no email) are excluded from enforcement and reported separately.
 */
import type {
  AggregatedAuthorityRow,
  UnresolvedAuthorityRow,
  WixSubscriptionRaw,
} from "./types";

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/** authorized = TRUE if: Free trial OR (Active AND lastPaymentStatus in {Paid, Pending}) */
function rowQualifiesAsAuthorized(row: {
  subscriptionStatus: string;
  lastPaymentStatus: string;
}): boolean {
  const status = row.subscriptionStatus;
  const payment = row.lastPaymentStatus;

  if (status === "Free trial") return true;
  if (status === "Active" && (payment === "Paid" || payment === "Pending")) {
    return true;
  }
  return false;
}

function countByStatus(rows: WixSubscriptionRaw[]) {
  return {
    activeCount: rows.filter((r) => r.subscriptionStatus === "Active").length,
    draftCount: rows.filter((r) => r.subscriptionStatus === "Draft").length,
    canceledCount: rows.filter((r) => r.subscriptionStatus === "Canceled").length,
    endedCount: rows.filter((r) => r.subscriptionStatus === "Ended").length,
    pausedCount: rows.filter((r) => r.subscriptionStatus === "Paused").length,
    pendingCount: rows.filter((r) => r.subscriptionStatus === "Pending").length,
    freeTrialCount: rows.filter((r) => r.subscriptionStatus === "Free trial").length,
  };
}

/**
 * Aggregate raw subscription rows by email. Unresolved rows (no email) are excluded
 * from byEmail and returned separately. Never use unresolved for deauthorization.
 */
export function aggregateWixAuthority(
  rawRows: WixSubscriptionRaw[]
): {
  byEmail: AggregatedAuthorityRow[];
  unresolved: UnresolvedAuthorityRow[];
} {
  const byEmail = new Map<string, WixSubscriptionRaw[]>();
  const unresolved: UnresolvedAuthorityRow[] = [];

  for (const row of rawRows) {
    if (!row.email || !row.email.includes("@")) {
      unresolved.push({
        orderId: row.orderId,
        memberId: row.memberId,
        plan: row.plan,
        subscriptionStatus: row.subscriptionStatus,
        lastPaymentStatus: row.lastPaymentStatus,
        purchaserEmailFromOrder: row.purchaserEmailFromOrder ?? null,
        resolvedEmail: null,
        notes: row.notes ?? "email resolution failed",
      });
      continue;
    }

    const email = normalizeEmail(row.email);
    const existing = byEmail.get(email) ?? [];
    existing.push(row);
    byEmail.set(email, existing);
  }

  const byEmailResult: AggregatedAuthorityRow[] = [];

  for (const [email, rows] of Array.from(byEmail.entries())) {
    const customerName = rows.map((r) => r.customerName).find(Boolean);
    const authorized = rows.some(rowQualifiesAsAuthorized);
    const qualifyingRow = rows.find(rowQualifiesAsAuthorized);
    const evidence = rows.map((r) => ({
      plan: r.plan,
      subscriptionStatus: r.subscriptionStatus,
      lastPaymentStatus: r.lastPaymentStatus,
      orderId: r.orderId,
    }));
    const statusCounts = countByStatus(rows);
    const counts = {
      totalRowsForEmail: rows.length,
      ...statusCounts,
    };

    byEmailResult.push({
      email,
      customerName,
      authorized,
      evidence,
      counts,
    });
  }

  return { byEmail: byEmailResult, unresolved };
}
