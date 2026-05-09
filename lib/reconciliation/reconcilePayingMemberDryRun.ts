import type { MemberAuthorization } from "../billing/aggregateAuthorization";
import type { AirtableMember } from "./airtableClient";

function normalize(s: string | null): string {
  if (!s || typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

export type ReconcileResult = {
  matchedCount: number;
  wouldCheck: Array<{ email: string; recordId: string }>;
  wouldUncheck: Array<{ email: string; recordId: string }>;
  missingInAirtable: string[];
  duplicateEmailsInAirtable: string[];
};

export function reconcilePayingMemberDryRun(
  authorizations: MemberAuthorization[],
  airtableMembers: AirtableMember[]
): ReconcileResult {
  const byEmail = new Map<string, AirtableMember[]>();
  for (const m of airtableMembers) {
    const email = normalize(m.email);
    if (!email) continue;
    const existing = byEmail.get(email) ?? [];
    existing.push(m);
    byEmail.set(email, existing);
  }

  const duplicateEmailsInAirtable: string[] = [];
  for (const [email, members] of Array.from(byEmail.entries())) {
    if (members.length > 1) {
      duplicateEmailsInAirtable.push(email);
    }
  }

  const wouldCheck: Array<{ email: string; recordId: string }> = [];
  const wouldUncheck: Array<{ email: string; recordId: string }> = [];
  const missingInAirtable: string[] = [];
  let matchedCount = 0;

  for (const auth of authorizations) {
    const email = normalize(auth.email);
    if (!email) continue;

    const records = byEmail.get(email);
    if (!records || records.length === 0) {
      missingInAirtable.push(auth.email);
      continue;
    }

    const record = records[0];
    matchedCount++;

    if (auth.authorized && !record.paying) {
      wouldCheck.push({ email: auth.email, recordId: record.id });
    } else if (!auth.authorized && record.paying) {
      wouldUncheck.push({ email: auth.email, recordId: record.id });
    }
  }

  return {
    matchedCount,
    wouldCheck,
    wouldUncheck,
    missingInAirtable,
    duplicateEmailsInAirtable,
  };
}
