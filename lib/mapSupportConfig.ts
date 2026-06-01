/** Approved copy for the map help popup (do not change without stakeholder sign-off). */
export const MAP_HELP_INTRO = "Running into any issues? Let us know here:";

/** Main Black Sustainability Network site (member-facing). */
export const BLACK_SUSTAINABILITY_NETWORK_HOME_URL = "https://www.blacksustainability.org/";

/** Mongo collection that stores member-submitted support tickets. */
export const SUPPORT_TICKETS_COLLECTION = "supportTickets";

/** Prefix for human-facing ticket numbers, e.g. BSN-000123. */
export const SUPPORT_TICKET_PREFIX = "BSN";

const DEFAULT_SUPPORT_TICKET_TO = [
  "jerry@techluminateacademy.com",
  "kelyce@blacksustainability.org",
];

const DEFAULT_SUPPORT_TICKET_CC = ["raina@blacksustainability.org"];

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,\n]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Staff To: recipients for new-ticket alerts.
 * Override with SUPPORT_TICKET_RECIPIENTS (comma-separated) if needed.
 */
export function getSupportTicketRecipients(): string[] {
  const list = parseEmailList(process.env.SUPPORT_TICKET_RECIPIENTS);
  if (list.length) return list;
  return [...DEFAULT_SUPPORT_TICKET_TO];
}

/**
 * Staff CC on every support ticket email (staff alert + member confirmation).
 * Override with SUPPORT_TICKET_CC (comma-separated). Raina is always included by default.
 */
export function getSupportTicketCcRecipients(): string[] {
  const fromEnv = parseEmailList(process.env.SUPPORT_TICKET_CC);
  const merged = new Set([...DEFAULT_SUPPORT_TICKET_CC, ...fromEnv]);
  return [...merged];
}

/** Format a sequential number into a padded ticket number (BSN-000123). */
export function formatSupportTicketNumber(seq: number): string {
  return `${SUPPORT_TICKET_PREFIX}-${String(seq).padStart(6, "0")}`;
}
