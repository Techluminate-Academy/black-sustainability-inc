/**
 * Send BSN Membership Sync report email after dryrun or apply.
 * Uses Gmail SMTP (EMAIL_USER, EMAIL_PASSWORD).
 * Never throws - email failures are logged and do not block sync.
 */
import nodemailer from "nodemailer";

const TO_RECIPIENTS = ["kelyce@blacksustainability.org"] as const;
const CC_RECIPIENTS = ["info@blacksustainability.org"] as const;
const DEFAULT_FROM_EMAIL = "imara@blacksustainability.org";

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

function getScheduledRunLabel(isoTimestamp: string): string {
  const day = new Date(isoTimestamp).getUTCDate();
  if (day === 1) return "1st of month";
  if (day === 15) return "15th of month";
  return "Off-cycle/manual run";
}

export function buildSubject(summary: SyncRunSummary): string {
  const totalChanges = summary.actions.setTrue + summary.actions.setFalse;
  const hasErrors = (summary.actions.errors ?? 0) > 0 || (summary.errors?.length ?? 0) > 0;

  if (hasErrors) {
    return `BSN Membership Sync Report – FAILED (Run #${summary.runId})`;
  }

  return `BSN Membership Sync Report – Success – ${totalChanges} changes (Run #${summary.runId})`;
}

export function buildHtmlBody(summary: SyncRunSummary): string {
  const scheduledRunLabel = getScheduledRunLabel(summary.timestamp);

  const totalChanges = summary.actions.setTrue + summary.actions.setFalse;
  const errorCount = summary.actions.errors ?? 0;
  const hasErrors = errorCount > 0 || (summary.errors?.length ?? 0) > 0;

  const statusLabel = hasErrors
    ? "FAILED"
    : totalChanges === 0
      ? "No Changes"
      : `${totalChanges} Changes Applied`;
  const statusColor = hasErrors ? "#dc3545" : totalChanges === 0 ? "#6c757d" : "#28a745";

  const metricRow = (label: string, value: string | number) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666">${label}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`;

  let updatesSection = "";
  if (totalChanges > 0) {
    const setTrueList = summary.lists.setTrueEmails.length
      ? summary.lists.setTrueEmails.slice(0, MAX_LIST_ITEMS).join("<br>") +
        (summary.lists.setTrueEmails.length > MAX_LIST_ITEMS ? `<br><em>(+${summary.lists.setTrueEmails.length - MAX_LIST_ITEMS} more)</em>` : "")
      : "—";
    const setFalseList = summary.lists.setFalseEmails.length
      ? summary.lists.setFalseEmails.slice(0, MAX_LIST_ITEMS).join("<br>") +
        (summary.lists.setFalseEmails.length > MAX_LIST_ITEMS ? `<br><em>(+${summary.lists.setFalseEmails.length - MAX_LIST_ITEMS} more)</em>` : "")
      : "—";
    updatesSection = `
    <div style="margin-top:20px;padding:16px;background:#f8f9fa;border-radius:8px;border-left:4px solid #2c5aa0">
      <h3 style="margin:0 0 12px 0;font-size:14px;color:#333">Updates Applied</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 12px 4px 0;color:#28a745;font-weight:600;vertical-align:top;width:120px">Paying ✓</td><td style="padding:4px 0;word-break:break-all">${setTrueList}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#dc3545;font-weight:600;vertical-align:top;width:120px">Paying ✗</td><td style="padding:4px 0;word-break:break-all">${setFalseList}</td></tr>
      </table>
    </div>`;
  }

  let errorsSection = "";
  if (hasErrors && summary.errors && summary.errors.length > 0) {
    const errList = summary.errors
      .slice(0, MAX_LIST_ITEMS)
      .map((e) => `<li style="margin:4px 0">${e.replace(/</g, "&lt;")}</li>`)
      .join("");
    const more = summary.errors.length > MAX_LIST_ITEMS ? `<li><em>+${summary.errors.length - MAX_LIST_ITEMS} more (see logs)</em></li>` : "";
    errorsSection = `
    <div style="margin-top:20px;padding:16px;background:#fff5f5;border-radius:8px;border-left:4px solid #dc3545">
      <h3 style="margin:0 0 8px 0;font-size:14px;color:#dc3545">Error List</h3>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#333">${errList}${more}</ul>
    </div>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;color:#333;background:#f5f5f5;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#2c5aa0;color:#fff;padding:20px 24px;text-align:center">
      <h1 style="margin:0;font-size:18px;font-weight:600">Black Sustainability, Inc.</h1>
      <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9">Membership Sync Report</p>
      <div style="margin-top:12px;display:inline-block;padding:6px 14px;background:${statusColor};border-radius:6px;font-weight:600;font-size:13px">${statusLabel}</div>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td colspan="2" style="padding:0 0 12px 0;font-weight:600;color:#2c5aa0;font-size:12px;text-transform:uppercase">Run Details</td></tr>
        ${metricRow("Run type", summary.runType)}
        ${metricRow("Scheduled run", scheduledRunLabel)}
        ${metricRow("Run ID", `#${summary.runId}`)}
        ${metricRow("Timestamp", summary.timestamp)}
        ${metricRow("Source", "Wix API")}
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:20px">
        <tr><td colspan="2" style="padding:0 0 12px 0;font-weight:600;color:#2c5aa0;font-size:12px;text-transform:uppercase">Wix Snapshot</td></tr>
        ${metricRow("Subscriptions scanned", summary.wix.subscriptions.toLocaleString())}
        ${metricRow("Unique member emails", summary.wix.uniqueEmails.toLocaleString())}
        ${metricRow("Authorized (paying)", summary.wix.authorized)}
        ${metricRow("Not authorized", summary.wix.unauthorized)}
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:20px">
        <tr><td colspan="2" style="padding:0 0 12px 0;font-weight:600;color:#2c5aa0;font-size:12px;text-transform:uppercase">Airtable Actions</td></tr>
        ${metricRow("Updated to Paying ✓", summary.actions.setTrue)}
        ${metricRow("Updated to Paying ✗", summary.actions.setFalse)}
        ${metricRow("No change (aligned)", summary.actions.noop)}
        ${metricRow("Skipped (equity protected)", summary.actions.skippedEquity)}
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:20px">
        <tr><td colspan="2" style="padding:0 0 12px 0;font-weight:600;color:#2c5aa0;font-size:12px;text-transform:uppercase">Exceptions</td></tr>
        ${metricRow("Missing in Airtable", summary.airtable.missing)}
        ${metricRow("Duplicate emails", summary.airtable.duplicates)}
        ${metricRow("Errors", errorCount)}
      </table>
      <p style="margin:20px 0 0 0;padding:12px;background:#e8f4f8;border-radius:6px;font-size:12px;color:#555">
        ✓ Idempotent diff enforcement active &nbsp;|&nbsp; ✓ Equity-protected emails were not modified
      </p>
      ${updatesSection}
      ${errorsSection}
    </div>
    <div style="padding:16px 24px;background:#f8f9fa;text-align:center;font-size:12px;color:#999">
      © ${new Date().getFullYear()} Black Sustainability, Inc. · Run #${summary.runId}
    </div>
  </div>
</body>
</html>`;
}

function buildPlainTextBody(summary: SyncRunSummary): string {
  const scheduledRunLabel = getScheduledRunLabel(summary.timestamp);

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
- Scheduled run: ${scheduledRunLabel}
- Run ID: #${summary.runId}
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

Guardrails: Idempotent diff enforcement active. Equity-protected emails were not modified.
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
  const configuredFrom = process.env.SYNC_REPORT_FROM?.trim();
  const fromEmail = configuredFrom || DEFAULT_FROM_EMAIL;
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
  const html = buildHtmlBody(normalizedSummary);
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
      from: `"Black Sustainability, Inc. (Imara)" <${fromEmail}>`,
      to: TO_RECIPIENTS.join(", "),
      cc: CC_RECIPIENTS.join(", "),
      subject,
      text,
      html,
      replyTo: "info@blacksustainability.org",
    });

    console.log("Sync report email sent successfully");
  } catch (error) {
    console.error("Email send failed:", error instanceof Error ? error.message : error);
    // Do NOT throw - sync must not fail if email fails
  }
}
