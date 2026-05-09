/**
 * Raw subscription row from Wix API fetch.
 * Includes order identifiers and diagnostics; email may be null when resolution fails.
 */
export type WixSubscriptionRaw = {
  orderId: string;
  memberId: string;
  email: string | null;
  customerName?: string;
  subscriptionStatus: string;
  lastPaymentStatus: string;
  plan?: string;
  /** Email from order form/checkout if present (e.g. formData.submissionData) */
  purchaserEmailFromOrder?: string | null;
  /** Diagnostic notes (e.g. "no memberId", "member lookup failed") */
  notes?: string;
};

/**
 * Aggregated authority row for a single email.
 */
export type AggregatedAuthorityRow = {
  email: string;
  customerName?: string;
  authorized: boolean;
  evidence: Array<{
    plan?: string;
    subscriptionStatus: string;
    lastPaymentStatus: string;
    orderId: string;
  }>;
  counts: {
    totalRowsForEmail: number;
    activeCount: number;
    draftCount: number;
    canceledCount: number;
    endedCount: number;
    pausedCount: number;
    pendingCount: number;
    freeTrialCount: number;
  };
};

/**
 * Unresolved row (no email) - excluded from Airtable enforcement.
 */
export type UnresolvedAuthorityRow = {
  orderId: string;
  memberId: string;
  plan?: string;
  subscriptionStatus: string;
  lastPaymentStatus: string;
  purchaserEmailFromOrder?: string | null;
  resolvedEmail: null;
  notes: string;
};
