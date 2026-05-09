/**
 * JSON report payload for Wix → Airtable sync (cron-friendly).
 * Also used as input for sendSyncReportEmail.
 */
export type SyncReportPayload = {
  runType: "dryrun" | "apply";
  timestamp: string;
  runId?: string;
  wix: {
    subscriptions: number;
    uniqueEmails: number;
    authorized: number;
    unauthorized: number;
  };
  airtable: {
    matched: number;
    missing: number;
    duplicates: number;
  };
  actions: {
    setTrue: number;
    setFalse: number;
    noop: number;
    skippedEquity: number;
    errors?: number;
  };
  lists: {
    setTrueEmails: string[];
    setFalseEmails: string[];
    missingEmails: string[];
    duplicateEmails?: string[];
    skippedEquityEmails?: string[];
  };
  errors?: string[];
};

function formatRunId(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${day}-${h}${min}`;
}

export function createSyncReportPayload(
  runType: "dryrun" | "apply",
  opts: {
    wixSubscriptions: number;
    wixUniqueEmails: number;
    wixAuthorized: number;
    wixUnauthorized: number;
    airtableMatched: number;
    airtableMissing: number;
    airtableDuplicates: number;
    setTrueCount: number;
    setFalseCount: number;
    noopCount: number;
    skippedEquityCount: number;
    setTrueEmails: string[];
    setFalseEmails: string[];
    missingEmails: string[];
    duplicateEmails?: string[];
    skippedEquityEmails?: string[];
    errorsCount?: number;
    errors?: string[];
  }
): SyncReportPayload {
  const timestamp = new Date().toISOString();
  return {
    runType,
    timestamp,
    runId: formatRunId(timestamp),
    wix: {
      subscriptions: opts.wixSubscriptions,
      uniqueEmails: opts.wixUniqueEmails,
      authorized: opts.wixAuthorized,
      unauthorized: opts.wixUnauthorized,
    },
    airtable: {
      matched: opts.airtableMatched,
      missing: opts.airtableMissing,
      duplicates: opts.airtableDuplicates,
    },
    actions: {
      setTrue: opts.setTrueCount,
      setFalse: opts.setFalseCount,
      noop: opts.noopCount,
      skippedEquity: opts.skippedEquityCount,
      ...(opts.errorsCount !== undefined && { errors: opts.errorsCount }),
    },
    lists: {
      setTrueEmails: opts.setTrueEmails,
      setFalseEmails: opts.setFalseEmails,
      missingEmails: opts.missingEmails,
      ...(opts.duplicateEmails && { duplicateEmails: opts.duplicateEmails }),
      ...(opts.skippedEquityEmails && {
        skippedEquityEmails: opts.skippedEquityEmails,
      }),
    },
    ...(opts.errors && { errors: opts.errors }),
  };
}
