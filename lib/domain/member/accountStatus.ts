export const ACCOUNT_STATUS_ACTIVE = "active" as const;
export const ACCOUNT_STATUS_DEACTIVATED = "deactivated" as const;

/** Written to Airtable column `subscriptionStatuses` for deactivated members. */
export const SUBSCRIPTION_STATUS_DEACTIVATED = "deactivated" as const;
export const SUBSCRIPTION_STATUS_ACTIVE = "active" as const;

export type MemberAccountStatus = typeof ACCOUNT_STATUS_ACTIVE | typeof ACCOUNT_STATUS_DEACTIVATED;

/** Mighty Members table column for paid/deactivated state (not `subscriptionStatuses`). */
export function getAirtableSubscriptionStatusesFieldName(): string {
  return (
    process.env.AIRTABLE_SUBSCRIPTION_STATUSES_FIELD ||
    process.env.AIRTABLE_PAID_SUBSCRIPTION_STATUS_FIELD ||
    "Paid Subscription Status"
  );
}

/** @deprecated Use subscriptionStatuses column; kept for optional override via env. */
export function getAirtableAccountStatusFieldName(): string {
  return process.env.AIRTABLE_ACCOUNT_STATUS_FIELD || "accountStatus";
}

function normalizeStatusToken(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

/** True if Airtable `subscriptionStatuses` (string or list) includes deactivated. */
export function subscriptionStatusesIndicateDeactivated(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((v) => normalizeStatusToken(v) === SUBSCRIPTION_STATUS_DEACTIVATED);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((s) => s.trim().toLowerCase())
      .includes(SUBSCRIPTION_STATUS_DEACTIVATED);
  }
  return false;
}

export function airtableSubscriptionStatusesForMemberStatus(
  status: MemberAccountStatus
): string[] {
  return status === ACCOUNT_STATUS_DEACTIVATED
    ? [SUBSCRIPTION_STATUS_DEACTIVATED]
    : [SUBSCRIPTION_STATUS_ACTIVE];
}

export function isDeactivatedAccountStatus(status: unknown): boolean {
  if (status === ACCOUNT_STATUS_DEACTIVATED) return true;
  if (typeof status === "string" && status.trim().toLowerCase() === ACCOUNT_STATUS_DEACTIVATED) {
    return true;
  }
  return false;
}

/** Mongo filter: exclude members marked deactivated (missing status = active). */
export function activeMembersMongoClause(): { accountStatus: { $ne: string } } {
  return { accountStatus: { $ne: ACCOUNT_STATUS_DEACTIVATED } };
}
