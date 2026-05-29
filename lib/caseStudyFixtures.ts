/** Redacted fixture data for portfolio case-study screenshots (no real member PII). */

export const MIGRATION_METRICS = {
  synced: 2510,
  migrated: 1911,
  paidTotal: 34,
  paidMighty: 4,
  paidWix: 30,
  unpaid: 2506,
  errors: 0,
  reviewQueue: 86,
  deactivated: 2,
} as const;

export const AIRTABLE_ROWS = [
  {
    name: "Jordan M.",
    email: "member.paid.01@example.org",
    mightyId: "39772213",
    paidStatus: "paid",
    plan: "ENTHUSIAST",
    active: true,
  },
  {
    name: "Alex R.",
    email: "member.paid.02@example.org",
    mightyId: "38837562",
    paidStatus: "paid",
    plan: "ENTITY - Annual",
    active: true,
  },
  {
    name: "Sam T.",
    email: "member.free.01@example.org",
    mightyId: "39771182",
    paidStatus: "free",
    plan: "Free (auto-generated)",
    active: true,
  },
  {
    name: "Casey L.",
    email: "member.free.02@example.org",
    mightyId: "7737522",
    paidStatus: "free",
    plan: "Free (auto-generated)",
    active: true,
  },
  {
    name: "Riley K.",
    email: "member.equity.01@example.org",
    mightyId: "13188756",
    paidStatus: "free",
    plan: "Equity",
    active: true,
  },
  {
    name: "Shevon M.",
    email: "deactivated.01@example.org",
    mightyId: "39771180",
    paidStatus: "free",
    plan: "—",
    active: false,
  },
];

export const MIGRATION_ERROR_ROWS = [
  {
    email: "invalid.address@",
    category: "invalid_email",
    action: "Confirm/correct email in Airtable",
  },
  {
    email: "member.typo@gmail.co.uk",
    category: "typo_likely",
    action: "Fix domain to gmail.com in Airtable",
  },
  {
    email: "needs.review@example.org",
    category: "needs_review",
    action: "Verify email/name; try manual add in Mighty admin",
  },
  {
    email: "alt.email@example.org",
    category: "secondary_already_in_mighty",
    action: "Link existing Mighty ID from secondary email",
  },
  {
    email: "missing.fields@example.org",
    category: "invalid_email",
    action: "Confirm/correct email in Airtable",
  },
];

export const SECONDARY_EMAIL_ROWS = [
  {
    primary: "primary.01@example.org",
    secondary: "alt.01@example.org",
    action: "secondary_already_in_mighty",
    mightyId: "39898479",
    note: "Created member using secondary email",
  },
  {
    primary: "primary.02@example.org",
    secondary: "",
    action: "no_secondary_email",
    mightyId: "",
    note: "No secondary email found in Airtable",
  },
  {
    primary: "primary.03@example.org",
    secondary: "alt.03@example.org",
    phone: "(404) 555-0101",
    action: "needs_outreach",
    mightyId: "",
    note: "Secondary plausible; manual outreach recommended",
  },
];

export const OUTREACH_ROWS = [
  { email: "outreach.01@example.org", phone: "(410) 555-0102", status: "invalid_email" },
  { email: "outreach.02@example.org", phone: "(567) 555-0103", status: "needs_review" },
  { email: "outreach.03@example.org", phone: "(336) 555-0104", status: "typo_likely" },
  { email: "outreach.04@example.org", phone: "", status: "no_secondary_email" },
];

export const JSONL_AUDIT_LINES = [
  '{"action":"created","email":"member.batch.01@example.org","mightyId":39772213,"record_id":"recGz14NROPN8mzbR"}',
  '{"action":"created","email":"member.batch.02@example.org","mightyId":39772214,"record_id":"recGzWToSjeGVZ7xg"}',
  '{"action":"created","email":"member.batch.03@example.org","mightyId":39772216,"record_id":"recH05IdtOOHujfRl"}',
  '{"action":"skipped","email":"invalid.address@","reason":"Mighty: Email must be valid","record_id":"rec26F3OsmVCEVNRs"}',
  '{"action":"linked","email":"alt.email@example.org","mightyId":39898479,"note":"secondary_already_in_mighty"}',
];

export const DRY_RUN_TERMINAL = `$ npx tsx scripts/mighty-bulk-create-members-from-csv.ts ./missing-mighty-id.csv \\
    --offset 526 --limit 500 --errors-csv ./mighty-bulk-migration-errors.csv

Mode: dry-run (pass --apply to create members)
Batch: offset=526 limit=500 sleepMs=500

Would create: 412
Would skip (already in Mighty): 58
Would error: 30

Sample preview:
  + member.batch.01@example.org → create (recGz14NROPN8mzbR)
  + member.batch.02@example.org → create (recGzWToSjeGVZ7xg)
  ~ alt.email@example.org → link existing mightyId 39898479
  ✗ invalid.address@ → invalid_email

No API writes performed. Re-run with --apply to execute.`;

export const WIX_SYNC_LINES = [
  '{"msg":"wix_paid_sync_start","mode":"apply","wixAuthorized":30}',
  '{"email":"member.paid.01@example.org","action":"applied","mightyId":39772213,"isPaidActive":true,"planNames":["ENTHUSIAST"]}',
  '{"email":"member.paid.02@example.org","action":"applied","mightyId":38837562,"isPaidActive":true,"planNames":["ENTITY - Annual","ENTITY"]}',
  '{"email":"member.paid.03@example.org","action":"applied","mightyId":12953367,"isPaidActive":true,"planNames":["EXPERT"]}',
  '{"msg":"wix_paid_sync_done","dryRun":false,"wixAuthorized":30,"applied":30,"errors":0}',
];

export const MONGO_MEMBER_DOC = {
  email: "member.paid.01@example.org",
  mightyId: 39772213,
  accountStatus: "active",
  subscription: {
    isPaidActive: true,
    planNames: ["ENTHUSIAST"],
    planIds: [],
    syncSource: "wix:mighty-paid-sync",
    statuses: ["WixPaidSync", "BulkSubscriptionSync"],
    updatedAt: "2026-05-28T14:32:00.000Z",
  },
  location: {
    city: "Atlanta",
    state: "GA",
    coordinates: [-84.388, 33.749],
  },
  updatedAt: "2026-05-28T14:32:00.000Z",
};

export const MIGHTY_PROFILE = {
  name: "Jordan M.",
  email: "member.paid.01@example.org",
  mightyId: "39772213",
  joined: "2026-05-15",
  plan: "ENTHUSIAST",
  network: "Black Sustainability Network",
};

export const FIXTURE_SLUGS = [
  "airtable-mighty-members",
  "bulk-migration-dry-run",
  "jsonl-audit-log",
  "mighty-member-profile",
  "subscription-sync-summary",
  "wix-paid-sync-log",
  "mongo-member-document",
  "migration-errors-csv",
  "secondary-email-report",
  "migration-outreach-list",
  "deactivated-exclusion",
] as const;

export type CaseStudyFixtureSlug = (typeof FIXTURE_SLUGS)[number];

export function isCaseStudyFixtureSlug(v: string): v is CaseStudyFixtureSlug {
  return (FIXTURE_SLUGS as readonly string[]).includes(v);
}
