/**
 * Deterministic diff engine for Wix → Airtable sync.
 * Idempotent: only includes updates when wixAuthorized !== airtablePaying.
 * Equity-protected emails are always skipped.
 */
import type { MemberAuthorization } from "../billing/aggregateAuthorization";
import type { AirtableMember } from "./airtableClient";

const EQUITY_PROTECTED_EMAILS = new Set(
  [
    "uniquepassion1@gmail.com",
    "greenacresfarm679@gmail.com",
    "lavoulle@gmail.com",
    "cocohoustonnow@gmail.com",
  ].map((e) => e.trim().toLowerCase())
);

function normalize(s: string | null): string {
  if (!s || typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

function formatWixEvidence(subs: MemberAuthorization["sourceSubscriptions"]): string {
  return subs
    .map((s) => `${s.subscriptionStatus}/${s.lastPaymentStatus} (${s.plan ?? "-"})`)
    .join(", ");
}

export type UpdateToTrue = {
  email: string;
  recordId: string;
  from: boolean;
  to: true;
  wixEvidence: string;
};

export type UpdateToFalse = {
  email: string;
  recordId: string;
  from: boolean;
  to: false;
  wixEvidence: string;
};

export type NoopAligned = {
  email: string;
  recordId: string;
};

export type MissingInAirtable = {
  email: string;
  wixEvidence: string;
};

export type SkippedEquityProtected = {
  email: string;
  recordId?: string;
};

export type DuplicateInAirtable = {
  email: string;
  recordIds: string[];
};

export type WixAirtableDiffResult = {
  updatesToTrue: UpdateToTrue[];
  updatesToFalse: UpdateToFalse[];
  noopsAligned: NoopAligned[];
  missingInAirtable: MissingInAirtable[];
  skippedEquityProtected: SkippedEquityProtected[];
  duplicatesInAirtable: DuplicateInAirtable[];
};

/**
 * Compute the diff between Wix-derived authorizations and Airtable state.
 * Idempotent: only includes updates when wixAuthorized !== airtablePaying.
 * Equity-protected emails are never included in updates.
 */
export function computeWixAirtableDiff(
  authorizations: MemberAuthorization[],
  airtableMembers: AirtableMember[]
): WixAirtableDiffResult {
  const byEmail = new Map<string, AirtableMember[]>();
  for (const m of airtableMembers) {
    const email = normalize(m.email);
    if (!email) continue;
    const existing = byEmail.get(email) ?? [];
    existing.push(m);
    byEmail.set(email, existing);
  }

  const duplicatesInAirtable: DuplicateInAirtable[] = [];
  for (const [email, members] of Array.from(byEmail.entries())) {
    if (members.length > 1) {
      duplicatesInAirtable.push({
        email,
        recordIds: members.map((m) => m.id),
      });
    }
  }

  const updatesToTrue: UpdateToTrue[] = [];
  const updatesToFalse: UpdateToFalse[] = [];
  const noopsAligned: NoopAligned[] = [];
  const missingInAirtable: MissingInAirtable[] = [];
  const skippedEquityProtected: SkippedEquityProtected[] = [];

  for (const auth of authorizations) {
    const email = normalize(auth.email);
    if (!email) continue;

    const wixAuthorized = auth.authorized;
    const wixEvidence = formatWixEvidence(auth.sourceSubscriptions);

    if (EQUITY_PROTECTED_EMAILS.has(email)) {
      const records = byEmail.get(email);
      skippedEquityProtected.push({
        email: auth.email,
        recordId: records?.[0]?.id,
      });
      continue;
    }

    const records = byEmail.get(email);
    if (!records || records.length === 0) {
      missingInAirtable.push({ email: auth.email, wixEvidence });
      continue;
    }

    const record = records[0]!;
    const airtablePaying = record.paying;

    if (wixAuthorized === airtablePaying) {
      noopsAligned.push({ email: auth.email, recordId: record.id });
      continue;
    }

    if (wixAuthorized && !airtablePaying) {
      updatesToTrue.push({
        email: auth.email,
        recordId: record.id,
        from: airtablePaying,
        to: true,
        wixEvidence,
      });
    } else if (!wixAuthorized && airtablePaying) {
      updatesToFalse.push({
        email: auth.email,
        recordId: record.id,
        from: airtablePaying,
        to: false,
        wixEvidence,
      });
    }
  }

  return {
    updatesToTrue,
    updatesToFalse,
    noopsAligned,
    missingInAirtable,
    skippedEquityProtected,
    duplicatesInAirtable,
  };
}

/** Check if an email is equity-protected. */
export function isEquityProtected(email: string): boolean {
  return EQUITY_PROTECTED_EMAILS.has(normalize(email));
}
