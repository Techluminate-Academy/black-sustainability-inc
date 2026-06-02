/**
 * QA/tester-only visibility for paid/unpaid impersonation controls.
 * Does not grant admin access or change real membership / billing data.
 *
 * Built-in emails cover approved map QA testers; `BSN_IMPERSONATE_ALLOWLIST`
 * merges additional addresses (comma- or newline-separated), compared case-insensitively.
 */

/** Approved map QA testers (Mighty sign-in emails). */
export const DEFAULT_QA_TESTER_EMAILS = [
  "jerry@techluminateacademy.com",
  "kelyce@blacksustainability.org",
  // Alexis Vidot — personal + BSN research inbox (separate Mighty/map sign-in)
  "alexis.vidot@gmail.com",
  "research@blacksustainability.org",
] as const;

function normalizeEmail(email: string): string {
  return String(email).trim().toLowerCase();
}

function parseEnvAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getQaTesterEmailAllowlist(
  envAllowlist: string | undefined = process.env.BSN_IMPERSONATE_ALLOWLIST
): Set<string> {
  const merged = [...DEFAULT_QA_TESTER_EMAILS, ...parseEnvAllowlist(envAllowlist)];
  return new Set(merged.map(normalizeEmail));
}

/** Whether the signed-in user may see/use tester impersonation tools. */
export function canAccessTesterTools(email: string | null | undefined): boolean {
  if (!email) return false;
  return getQaTesterEmailAllowlist().has(normalizeEmail(email));
}
