/**
 * Send BSN Membership Sync report email after dryrun or apply.
 * Uses Gmail SMTP (EMAIL_USER, EMAIL_PASSWORD).
 * Never throws - email failures are logged and do not block sync.
 */
import nodemailer from "nodemailer";

const RECIPIENTS = [
  "admin@blacksustainability.org",
  "info@blacksustainability.org",
  "jerry@techluminateacademy.com",
] as const;

const MAX_LIST_ITEMS = 20;

import type { SyncReportPayload } from "../reconciliation/syncReportPayload";

/** Summary shape for email; compatible with SyncReportPayload. */
export type SyncRunSummary = SyncReportPayload & {
  runId: string;
  lists: SyncReportPayload["lists"] & {
    duplicateEmails: string[];
  };
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

function truncateList(arr: string[]): string {
  if (arr.length <= MAX_LIST_ITEMS) {
    return arr.join(", ");
  }
  const shown = arr.slice(0, MAX_LIST_ITEMS).join(", ");
  const more = arr.length - MAX_LIST_ITEMS;
  return `${shown} (+${more} more, see logs)`;
}

function buildSubject(summary: SyncRunSummary): string {
  const totalChanges = summary.actions.setTrue + summary.actions.setFalse;
  const hasErrors = (summary.actions.errors ?? 0) > 0 || (summary.errors?.length ?? 0) > 0;

  if (hasErrors) {
    return `BSN Membership Sync Report – FAILED (Run #${summary.runId})`;
  }

  return `BSN Membership Sync Report – Success – ${totalChanges} changes (Run #${summary.runId})`;
}

function buildPlainTextBody(summary: SyncRunSummary): string {
  const totalChanges = summary.actions.setTrue + summary.actions.setFalse;
  const errorCount = summary.actions.errors ?? 0;
  const hasErrors = errorCount > 0 || (summary.errors?.length ?? 0) > 0;

  const status = hasErrors
    ? "FAILED"
    : totalChanges === 0
      ? "SUCCESS (0 changes applied)"
      : `SUCCESS (${totalChanges} changes applied)`;

  let body = `Status: ${status}

Run details
- Run type: ${summary.runType}
- Schedule: Every 8 hours
- Run ID: ${summary.runId}
- Timestamp: ${summary.timestamp}
- Source of truth: Wix API

Wix snapshot
- Subscriptions scanned: ${summary.wix.subscriptions}
- Unique member emails: ${summary.wix.uniqueEmails}
- Authorized (paying): ${summary.wix.authorized}
- Not authorized: ${summary.wix.unauthorized}

Airtable actions
- Updated to Paying=true: ${summary.actions.setTrue}
- Updated to Paying=false: ${summary.actions.setFalse}
- No change needed (idempotent): ${summary.actions.noop}
- Skipped (Equity protected): ${summary.actions.skippedEquity}

Exceptions
- Missing in Airtable: ${summary.airtable.missing}
- Duplicate emails in Airtable: ${summary.airtable.duplicates}
- Errors: ${errorCount}

Guardrails
- Idempotent diff enforcement active.
- Equity-protected emails were not modified.
`;

  if (totalChanges > 0) {
    body += `
Updates applied
- Paying=true: ${truncateList(summary.lists.setTrueEmails)}
- Paying=false: ${truncateList(summary.lists.setFalseEmails)}
`;
  }

  if (hasErrors && summary.errors && summary.errors.length > 0) {
    body += `
Error list
${summary.errors.slice(0, MAX_LIST_ITEMS).map((e) => `- ${e}`).join("\n")}
${summary.errors.length > MAX_LIST_ITEMS ? `(+${summary.errors.length - MAX_LIST_ITEMS} more, see logs)` : ""}
`;
  }

  return body;
}

/**
 * Send sync report email. Never throws - logs and returns on failure.
 * Accepts SyncReportPayload from createSyncReportPayload.
 */
export async function sendSyncReportEmail(
  summary: SyncReportPayload | SyncRunSummary
): Promise<void> {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPassword = process.env.EMAIL_PASSWORD?.trim();
  if (!emailUser || !emailPassword) {
    console.warn("EMAIL_USER or EMAIL_PASSWORD not configured, skipping sync report email");
    return;
  }

  const runId = summary.runId ?? formatRunId(summary.timestamp);
  const duplicateEmails = summary.lists.duplicateEmails ?? [];
  const normalizedSummary: SyncRunSummary = {
    ...summary,
    runId,
    lists: { ...summary.lists, duplicateEmails },
  };

  const subject = buildSubject(normalizedSummary);
  const text = buildPlainTextBody(normalizedSummary);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    await transporter.sendMail({
      from: `"Black Sustainability, Inc." <${emailUser}>`,
      to: RECIPIENTS.join(", "),
      subject,
      text,
      replyTo: "info@blacksustainability.org",
    });

    console.log("Sync report email sent successfully");
  } catch (error) {
    console.error("Email send failed:", error instanceof Error ? error.message : error);
    // Do NOT throw - sync must not fail if email fails
  }
}
