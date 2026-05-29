/**
 * Email notifications for member-map support tickets.
 * Sends via Gmail SMTP using EMAIL_USER + EMAIL_PASSWORD from .env.
 * Never throws — email failures are logged and must not block ticket creation.
 */
import {
  getSupportTicketCcRecipients,
  getSupportTicketRecipients,
} from "@/lib/mapSupportConfig";
import type { SupportTicket } from "@/lib/domain/support/supportTicket.service";
import { getGmailTransport, gmailFromHeader } from "@/lib/notifications/gmailTransport";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function staffHtml(ticket: SupportTicket): string {
  const submitter = ticket.submitterEmail || "Anonymous (no email provided)";
  const name = ticket.submitterName ? `${escapeHtml(ticket.submitterName)} ` : "";
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#333;max-width:600px;margin:0 auto">
  <div style="background:#111827;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:16px">New Member Map Support Ticket</h2>
    <p style="margin:6px 0 0;font-size:13px;opacity:.85">Ticket ${escapeHtml(ticket.ticketNumber)}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;width:120px">Ticket #</td><td style="font-weight:600">${escapeHtml(ticket.ticketNumber)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">From</td><td>${name}${escapeHtml(submitter)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Mighty ID</td><td>${ticket.mightyId ?? "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Page</td><td style="word-break:break-all">${ticket.pageUrl ? escapeHtml(ticket.pageUrl) : "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Submitted</td><td>${ticket.createdAt.toISOString()}</td></tr>
    </table>
    <div style="margin-top:16px;padding:14px;background:#f9fafb;border-radius:8px;border-left:4px solid #2c5aa0">
      <p style="margin:0 0 6px;font-weight:600;color:#374151">Message</p>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(ticket.message)}</p>
    </div>
  </div>
</div>`;
}

function staffText(ticket: SupportTicket): string {
  return [
    `New Member Map Support Ticket`,
    `Ticket #: ${ticket.ticketNumber}`,
    `From: ${ticket.submitterName ? ticket.submitterName + " " : ""}${ticket.submitterEmail || "Anonymous"}`,
    `Mighty ID: ${ticket.mightyId ?? "—"}`,
    `Page: ${ticket.pageUrl || "—"}`,
    `Submitted: ${ticket.createdAt.toISOString()}`,
    ``,
    `Message:`,
    ticket.message,
  ].join("\n");
}

function confirmationHtml(ticket: SupportTicket): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#333;max-width:600px;margin:0 auto">
  <div style="background:#16a34a;color:#fff;padding:18px 20px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:16px">We received your message</h2>
    <p style="margin:6px 0 0;font-size:13px;opacity:.9">Ticket ${escapeHtml(ticket.ticketNumber)}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px;line-height:1.6">
    <p style="margin:0 0 12px">Hi${ticket.submitterName ? " " + escapeHtml(ticket.submitterName) : ""},</p>
    <p style="margin:0 0 12px">
      Thanks for reaching out about the Black Sustainability member map. Your support ticket
      <strong>${escapeHtml(ticket.ticketNumber)}</strong> has been created and our team is
      working on resolving the issue.
    </p>
    <div style="margin:0 0 12px;padding:12px;background:#f9fafb;border-radius:8px;border-left:4px solid #16a34a">
      <p style="margin:0 0 6px;font-weight:600;color:#374151">Your message</p>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(ticket.message)}</p>
    </div>
    <p style="margin:0 0 12px">
      Please keep this ticket number for reference. We'll follow up by email as soon as we have an update.
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px">— The Black Sustainability team</p>
  </div>
</div>`;
}

function confirmationText(ticket: SupportTicket): string {
  return [
    `Hi${ticket.submitterName ? " " + ticket.submitterName : ""},`,
    ``,
    `Thanks for reaching out about the Black Sustainability member map. Your support ticket ${ticket.ticketNumber} has been created and our team is working on resolving the issue.`,
    ``,
    `Your message:`,
    ticket.message,
    ``,
    `Please keep this ticket number (${ticket.ticketNumber}) for reference. We'll follow up by email as soon as we have an update.`,
    ``,
    `— The Black Sustainability team`,
  ].join("\n");
}

/**
 * Send the staff notification and (when an email is provided) the submitter confirmation.
 * Returns which emails were sent. Never throws.
 */
export async function sendSupportTicketEmails(
  ticket: SupportTicket
): Promise<{ staffNotified: boolean; submitterNotified: boolean }> {
  const transport = getGmailTransport();
  if (!transport) {
    console.warn(
      "[supportTicket] Set EMAIL_USER and EMAIL_PASSWORD in .env (Gmail App Password) to send ticket emails"
    );
    return { staffNotified: false, submitterNotified: false };
  }

  const { transporter, authUser } = transport;
  const fromHeader = gmailFromHeader("Black Sustainability Member Map", authUser);
  const cc = getSupportTicketCcRecipients().join(", ");
  let staffNotified = false;
  let submitterNotified = false;

  try {
    await transporter.sendMail({
      from: fromHeader,
      to: getSupportTicketRecipients().join(", "),
      cc: cc || undefined,
      replyTo: ticket.submitterEmail || undefined,
      subject: `New map support ticket ${ticket.ticketNumber}`,
      text: staffText(ticket),
      html: staffHtml(ticket),
    });
    staffNotified = true;
  } catch (error) {
    console.error(
      "[supportTicket] Staff notification failed:",
      error instanceof Error ? error.message : error
    );
  }

  if (ticket.submitterEmail) {
    try {
      await transporter.sendMail({
        from: fromHeader,
        to: ticket.submitterEmail,
        cc: cc || undefined,
        subject: `We received your message — ticket ${ticket.ticketNumber}`,
        text: confirmationText(ticket),
        html: confirmationHtml(ticket),
      });
      submitterNotified = true;
    } catch (error) {
      console.error(
        "[supportTicket] Submitter confirmation failed:",
        error instanceof Error ? error.message : error
      );
    }
  }

  return { staffNotified, submitterNotified };
}
