import {
  AIRTABLE_ROWS,
  DRY_RUN_TERMINAL,
  JSONL_AUDIT_LINES,
  MIGRATION_ERROR_ROWS,
  MIGRATION_METRICS,
  MIGHTY_PROFILE,
  MONGO_MEMBER_DOC,
  OUTREACH_ROWS,
  SECONDARY_EMAIL_ROWS,
  WIX_SYNC_LINES,
  type CaseStudyFixtureSlug,
} from "../../lib/caseStudyFixtures";

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Black Sustainability Inc. · Operational Systems
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "slate" | "red" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: Record<string, React.ReactNode>[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.className ?? ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/80">
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className ?? ""}`}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Terminal({ lines }: { lines: string | string[] }) {
  const text = Array.isArray(lines) ? lines.join("\n") : lines;
  return (
    <div
      data-testid="case-study-terminal"
      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg"
    >
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-rose-500" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-500" />
        <span className="ml-2 text-xs text-slate-400">Terminal — migration tooling</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-emerald-300">{text}</pre>
    </div>
  );
}

export function CaseStudyFixtureView({ fixture }: { fixture: CaseStudyFixtureSlug }) {
  switch (fixture) {
    case "airtable-mighty-members":
      return (
        <Shell title="Mighty Members" subtitle="Staff-facing subscription mirror · Airtable">
          <DataTable
            columns={[
              { key: "name", label: "Member" },
              { key: "email", label: "Email" },
              { key: "mightyId", label: "Mighty Member ID" },
              { key: "paidStatus", label: "Paid Subscription Status" },
              { key: "plan", label: "Paid Subscription Plans" },
              { key: "active", label: "Active" },
            ]}
            rows={AIRTABLE_ROWS.map((r) => ({
              name: r.name,
              email: r.email,
              mightyId: r.mightyId,
              paidStatus:
                r.paidStatus === "paid" ? (
                  <StatusPill tone="green">paid</StatusPill>
                ) : (
                  <StatusPill tone="slate">free</StatusPill>
                ),
              plan: r.plan,
              active: r.active ? (
                <StatusPill tone="green">active</StatusPill>
              ) : (
                <StatusPill tone="red">deactivated</StatusPill>
              ),
            }))}
          />
        </Shell>
      );

    case "bulk-migration-dry-run":
      return (
        <Shell title="Bulk member migration" subtitle="Dry-run preview before API writes">
          <Terminal lines={DRY_RUN_TERMINAL} />
        </Shell>
      );

    case "jsonl-audit-log":
      return (
        <Shell title="Batch audit log" subtitle="JSONL output · offset 526 · limit 500">
          <Terminal lines={JSONL_AUDIT_LINES} />
        </Shell>
      );

    case "mighty-member-profile":
      return (
        <Shell title="Mighty member profile" subtitle="Admin API · newly provisioned member">
          <div
            data-testid="case-study-mighty-profile"
            className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-800">
                {MIGHTY_PROFILE.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{MIGHTY_PROFILE.name}</h2>
                <p className="text-sm text-slate-600">{MIGHTY_PROFILE.email}</p>
                <p className="mt-2 text-sm text-slate-500">Network: {MIGHTY_PROFILE.network}</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 text-sm">
              <div>
                <dt className="text-slate-500">Mighty Member ID</dt>
                <dd className="mt-1 font-medium">{MIGHTY_PROFILE.mightyId}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Joined</dt>
                <dd className="mt-1 font-medium">{MIGHTY_PROFILE.joined}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Plan</dt>
                <dd className="mt-1">
                  <StatusPill tone="green">{MIGHTY_PROFILE.plan}</StatusPill>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Map location</dt>
                <dd className="mt-1 font-medium">Synced via webhook</dd>
              </div>
            </dl>
          </div>
        </Shell>
      );

    case "subscription-sync-summary":
      return (
        <Shell title="Subscription sync summary" subtitle="Mighty Members cohort · apply mode">
          <div data-testid="case-study-sync-summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Members processed" value={MIGRATION_METRICS.synced} />
            <MetricCard label="Paid (map access)" value={MIGRATION_METRICS.paidTotal} accent="text-emerald-600" />
            <MetricCard label="Unpaid / free" value={MIGRATION_METRICS.unpaid} />
            <MetricCard label="Sync errors" value={MIGRATION_METRICS.errors} accent="text-emerald-600" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MetricCard label="Paid via Mighty plans" value={MIGRATION_METRICS.paidMighty} />
            <MetricCard label="Paid via Wix (transition)" value={MIGRATION_METRICS.paidWix} />
            <MetricCard label="Staff review queue" value={MIGRATION_METRICS.reviewQueue} accent="text-amber-600" />
          </div>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs text-slate-600">
            {`{"msg":"mighty_bulk_subscription_sync_done","processed":${MIGRATION_METRICS.synced},"paid":${MIGRATION_METRICS.paidMighty},"unpaid":${MIGRATION_METRICS.unpaid},"errors":${MIGRATION_METRICS.errors}}`}
          </div>
        </Shell>
      );

    case "wix-paid-sync-log":
      return (
        <Shell title="Wix paid sync" subtitle="Transitional billing · 30 authorized subscribers">
          <Terminal lines={WIX_SYNC_LINES} />
        </Shell>
      );

    case "mongo-member-document":
      return (
        <Shell title="MongoDB member document" subtitle="Runtime authority · mightyMembers collection">
          <pre
            data-testid="case-study-mongo-doc"
            className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 font-mono text-sm leading-7 text-slate-800 shadow-sm"
          >
            {JSON.stringify(MONGO_MEMBER_DOC, null, 2)}
          </pre>
        </Shell>
      );

    case "migration-errors-csv":
      return (
        <Shell title="Migration errors export" subtitle="mighty-bulk-migration-errors.csv">
          <DataTable
            columns={[
              { key: "email", label: "email" },
              { key: "category", label: "issue_category" },
              { key: "action", label: "suggested_action", className: "max-w-md" },
            ]}
            rows={MIGRATION_ERROR_ROWS.map((r) => ({
              email: r.email,
              category: <StatusPill tone="amber">{r.category}</StatusPill>,
              action: r.action,
            }))}
          />
        </Shell>
      );

    case "secondary-email-report":
      return (
        <Shell title="Secondary email check" subtitle="Link existing Mighty accounts · avoid duplicates">
          <DataTable
            columns={[
              { key: "primary", label: "primary_email" },
              { key: "secondary", label: "secondary_email" },
              { key: "action", label: "action" },
              { key: "mightyId", label: "mighty_id" },
              { key: "note", label: "note", className: "max-w-xs" },
            ]}
            rows={SECONDARY_EMAIL_ROWS.map((r) => ({
              primary: r.primary,
              secondary: r.secondary || "—",
              action: <StatusPill tone={r.action.includes("secondary") ? "green" : "slate"}>{r.action}</StatusPill>,
              mightyId: r.mightyId || "—",
              note: r.note,
            }))}
          />
        </Shell>
      );

    case "migration-outreach-list":
      return (
        <Shell title="Migration outreach list" subtitle="Unresolved records · staff follow-up">
          <DataTable
            columns={[
              { key: "email", label: "email" },
              { key: "phone", label: "phone_best" },
              { key: "status", label: "issue_category" },
            ]}
            rows={OUTREACH_ROWS.map((r) => ({
              email: r.email,
              phone: r.phone || "—",
              status: <StatusPill tone="amber">{r.status}</StatusPill>,
            }))}
          />
        </Shell>
      );

    case "deactivated-exclusion":
      return (
        <Shell title="Deactivated member exclusion" subtitle="Staff-controlled · skipped by bulk sync">
          <div data-testid="case-study-deactivated" className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Shevon M.</h2>
                <StatusPill tone="red">deactivated</StatusPill>
              </div>
              <p className="mt-2 text-sm text-slate-600">deactivated.01@example.org</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>• Hidden from public map</li>
                <li>• Not marked paid during subscription sync</li>
                <li>• Skipped by Wix paid sync (`deactivated_in_mongo`)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Bulk sync decision log</h2>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-300">
                {`{"email":"deactivated.01@example.org","action":"skipped","reason":"deactivated_in_mongo","isPaidActive":false,"note":"subscriptionStatuses contains deactivated"}`}
              </pre>
            </div>
          </div>
        </Shell>
      );

    default:
      return null;
  }
}
