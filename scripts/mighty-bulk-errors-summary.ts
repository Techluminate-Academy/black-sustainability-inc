/**
 * Summarize mighty-bulk-migration-errors.csv for stakeholders.
 *
 * Usage:
 *   npx tsx scripts/mighty-bulk-errors-summary.ts
 *   npx tsx scripts/mighty-bulk-errors-summary.ts ./mighty-bulk-migration-errors.csv --out ./reports/mighty-migration-errors-summary.md
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const CATEGORY_LABELS: Record<string, string> = {
  typo_likely: "Clear typos (Mighty suggested a fix)",
  invalid_email: "Rejected as invalid email",
  needs_review: "Needs manual review (record_invalid — email may be OK)",
  skipped_no_email: "Missing email in Airtable",
  airtable_sync_error: "Created in Mighty but Airtable sync failed",
  error: "Other error",
};

const CATEGORY_ACTION: Record<string, string> = {
  typo_likely: "Correct the email in Airtable using Mighty’s suggestion, then re-run bulk for that address.",
  invalid_email:
    "Confirm the real email with the member; fix typos/domains in Airtable. Many Gmail addresses failed Mighty’s deliverability checks, not just format.",
  needs_review:
    "Check first/last name for special characters; try adding the member manually in Mighty admin, then set Mighty Member ID in Airtable.",
  skipped_no_email: "Add Primary Email in the Mighty Members Airtable table.",
  airtable_sync_error: "Member exists in Mighty — update Airtable Mighty Member ID manually or re-run with --sync-airtable.",
  error: "Review mighty_error_summary and fix before retry.",
};

function isPlaceholderEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  const domain = e.split("@")[1];
  return (
    e === "test@example.com" ||
    e === "john.doe@example.com" ||
    domain === "example.com" ||
    domain === "example.org"
  );
}

type ErrorRow = {
  email: string;
  first_name: string;
  last_name: string;
  issue_category: string;
  mighty_error_summary: string;
  suggested_action: string;
  airtable_record_id: string;
  batch_offset: string;
};

function parseArgs() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf("--out");
  const outPath = outIdx >= 0 && argv[outIdx + 1] ? path.resolve(argv[outIdx + 1]!) : null;
  const skip = new Set<number>();
  if (outIdx >= 0) {
    skip.add(outIdx);
    if (argv[outIdx + 1]) skip.add(outIdx + 1);
  }
  const positional = argv.filter((a, i) => !skip.has(i) && !a.startsWith("--"));
  const csvArg = positional[0];
  const defaultCsv = "mighty-bulk-migration-errors.csv";
  return {
    csvPath: path.resolve(csvArg && csvArg.endsWith(".csv") ? csvArg : defaultCsv),
    outPath,
  };
}

function main() {
  const { csvPath, outPath } = parseArgs();
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const allRows = parse(fs.readFileSync(csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as ErrorRow[];
  const rows = allRows.filter((r) => !isPlaceholderEmail(r.email || ""));
  const placeholdersExcluded = allRows.length - rows.length;

  const byCategory = new Map<string, ErrorRow[]>();
  for (const row of rows) {
    const cat = row.issue_category || "error";
    const list = byCategory.get(cat) ?? [];
    list.push(row);
    byCategory.set(cat, list);
  }

  const order = [
    "typo_likely",
    "invalid_email",
    "needs_review",
    "skipped_no_email",
    "airtable_sync_error",
    "error",
  ];
  const categories = [
    ...order.filter((c) => byCategory.has(c)),
    ...Array.from(byCategory.keys()).filter((c) => !order.includes(c)),
  ];

  const lines: string[] = [
    "# Mighty bulk migration — members not added",
    "",
    `Generated from \`${path.basename(csvPath)}\` · **${rows.length}** members need attention.` +
      (placeholdersExcluded > 0
        ? ` (${placeholdersExcluded} test/placeholder row(s) excluded, e.g. test@example.com.)`
        : "") +
      "",
    "",
    "## Summary by issue type",
    "",
    "| Issue type | Count | What to do |",
    "|------------|------:|------------|",
  ];

  for (const cat of categories) {
    const list = byCategory.get(cat)!;
    const label = CATEGORY_LABELS[cat] ?? cat;
    const action = CATEGORY_ACTION[cat] ?? "Review and retry.";
    lines.push(`| ${label} | ${list.length} | ${action} |`);
  }

  lines.push("", "## Member list by category", "");

  for (const cat of categories) {
    const list = byCategory.get(cat)!;
    const label = CATEGORY_LABELS[cat] ?? cat;
    lines.push(`### ${label} (${list.length})`, "");
    lines.push("| Email | First name | Last name | Suggested action |");
    lines.push("|-------|------------|-----------|------------------|");
    for (const r of list.sort((a, b) => a.email.localeCompare(b.email))) {
      const action = (r.suggested_action || CATEGORY_ACTION[cat] || "").replace(/\|/g, "\\|");
      lines.push(
        `| ${r.email} | ${r.first_name || "—"} | ${r.last_name || "—"} | ${action} |`
      );
    }
    lines.push("");
  }

  lines.push(
    "## After fixes",
    "",
    "Re-add one member at a time:",
    "",
    "```bash",
    "npm run mighty-bulk-create-from-csv -- ./missing-mighty-id.csv \\",
    "  --email member@example.com --apply --no-welcome --sync-airtable \\",
    "  --errors-csv ./mighty-bulk-migration-errors.csv",
    "```",
    ""
  );

  const report = lines.join("\n");

  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, report, "utf8");
    console.error(`Wrote ${outPath}`);
  }

  console.log(report);
}

main();
