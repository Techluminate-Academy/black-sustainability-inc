/**
 * READ-ONLY dry run: Removal Enforcement for Wix non-active subscriptions.
 * Compares Wix non-active CSV against Airtable and generates a removal report.
 * No updates. No creates.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/airtable-dryrun-removal.ts \
 *   --csvPath test-data/wix-non-active-subscriptions.csv \
 *   [--baseId <id>] [--tableId <id>] [--viewId <id>]
 *
 * Example output:
 * {
 *   "timestamp": "2026-02-16T18:52:13.257Z",
 *   "csvPath": "/path/to/wix-non-active-subscriptions.csv",
 *   "airtable": { "baseId": "...", "tableId": "...", "viewId": "...", "recordsFetched": 2427 },
 *   "summary": {
 *     "csvNonActiveCount": 39,
 *     "invalidCsvRowCount": 20,
 *     "matchedInAirtableCount": 29,
 *     "missingInAirtableCount": 10,
 *     "incorrectPayingFlagCount": 15,
 *     "protectedByEquityCount": 7,
 *     "correctlyNonPayingCount": 7,
 *     "airtableNonPayingNotInCsvCount": 2284,
 *     "duplicatesInAirtableForNonActiveCount": 0
 *   },
 *   "missingInAirtable": ["dwight23@eclipsestash.com", ...],
 *   "incorrectPayingFlags": [{ "email": "...", "recordId": "...", "paying": true, "equity": false }],
 *   "protectedByEquity": [{ "email": "...", "recordId": "...", "equity": true }],
 *   "correctlyNonPaying": [{ "email": "...", "recordId": "...", "paying": false, "needPaymentEmail": true }],
 *   "airtableNonPayingNotInCsv": [{ "email": "...", "recordId": "..." }],
 *   "duplicatesInAirtableForNonActive": [{ "email": "...", "recordIds": ["rec..."] }]
 * }
 */
import dotenv from "dotenv";
import path from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { parse } from "csv-parse/sync";
import { fetchAllFromView } from "../lib/reconciliation/airtableClient";

dotenv.config();

const ENV_FALLBACKS: Record<string, string[]> = {
  AIRTABLE_API_KEY: ["NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN"],
  AIRTABLE_BASE_ID: ["NEXT_PUBLIC_AIRTABLE_BASE_ID"],
  AIRTABLE_TABLE_ID: ["NEXT_PUBLIC_AIRTABLE_TABLE_NAME", "AIRTABLE_TABLE_NAME"],
  AIRTABLE_VIEW_ID: ["NEXT_PUBLIC_AIRTABLE_VIEW_ID"],
};

function requireEnv(name: string): string {
  let val = process.env[name]?.trim();
  if (!val && ENV_FALLBACKS[name]) {
    for (const fallback of ENV_FALLBACKS[name]) {
      val = process.env[fallback]?.trim();
      if (val) break;
    }
  }
  if (name === "AIRTABLE_VIEW_ID" && !val) val = "viwYDUY0xStG108Lv";
  if (!val) {
    const fallbacks = ENV_FALLBACKS[name]?.join(", ");
    throw new Error(
      `Missing env: ${name}${fallbacks ? ` (or ${fallbacks})` : ""}`
    );
  }
  return val;
}

function normalizeEmail(s: string | null | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

function isValidEmail(s: string): boolean {
  const n = normalizeEmail(s);
  return n.length > 0 && n.includes("@") && n.includes(".");
}

async function loadWixNonActiveEmails(filePath: string): Promise<{
  emails: string[];
  invalidCsvRowCount: number;
}> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read CSV at "${filePath}": ${msg}`);
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Record<string, string>[];

  const emailColumn =
    Object.keys(records[0] ?? {}).find(
      (k) => k.toLowerCase() === "email/name" || k.toLowerCase() === "email"
    ) ?? "Email/Name";

  const seen = new Set<string>();
  let invalidCsvRowCount = 0;

  for (const row of records) {
    const raw = row[emailColumn] as string | undefined;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      invalidCsvRowCount++;
      continue;
    }
    const email = normalizeEmail(String(raw));
    if (!isValidEmail(email)) {
      invalidCsvRowCount++;
      continue;
    }
    seen.add(email);
  }

  return { emails: Array.from(seen), invalidCsvRowCount };
}

type RemovalReport = {
  timestamp: string;
  csvPath: string;
  airtable: {
    baseId: string;
    tableId: string;
    viewId: string;
    recordsFetched: number;
  };
  summary: {
    csvNonActiveCount: number;
    invalidCsvRowCount: number;
    matchedInAirtableCount: number;
    missingInAirtableCount: number;
    incorrectPayingFlagCount: number;
    protectedByEquityCount: number;
    correctlyNonPayingCount: number;
    airtableNonPayingNotInCsvCount: number;
    duplicatesInAirtableForNonActiveCount: number;
  };
  missingInAirtable: string[];
  incorrectPayingFlags: Array<{
    email: string;
    recordId: string;
    paying: boolean;
    equity: boolean;
  }>;
  protectedByEquity: Array<{
    email: string;
    recordId: string;
    equity: boolean;
  }>;
  correctlyNonPaying: Array<{
    email: string;
    recordId: string;
    paying: boolean;
    needPaymentEmail: boolean;
  }>;
  airtableNonPayingNotInCsv: Array<{ email: string; recordId: string }>;
  duplicatesInAirtableForNonActive: Array<{
    email: string;
    recordIds: string[];
  }>;
};

async function main() {
  const args = process.argv.slice(2);
  const csvPathIdx = args.indexOf("--csvPath");
  if (csvPathIdx === -1 || !args[csvPathIdx + 1]) {
    throw new Error(
      "Usage: --csvPath <path> [--baseId <id>] [--tableId <id>] [--viewId <id>]"
    );
  }
  const csvPath = path.resolve(process.cwd(), args[csvPathIdx + 1]!);

  const apiKey = requireEnv("AIRTABLE_API_KEY");
  const baseId =
    args.includes("--baseId") && args[args.indexOf("--baseId") + 1]
      ? args[args.indexOf("--baseId") + 1]
      : requireEnv("AIRTABLE_BASE_ID");
  const tableId =
    args.includes("--tableId") && args[args.indexOf("--tableId") + 1]
      ? args[args.indexOf("--tableId") + 1]
      : requireEnv("AIRTABLE_TABLE_ID");
  const viewId =
    args.includes("--viewId") && args[args.indexOf("--viewId") + 1]
      ? args[args.indexOf("--viewId") + 1]
      : requireEnv("AIRTABLE_VIEW_ID");

  const { emails: csvEmails, invalidCsvRowCount } =
    await loadWixNonActiveEmails(csvPath);
  const csvNonActiveSet = new Set(csvEmails);

  const airtableRecords = await fetchAllFromView({
    apiKey,
    baseId,
    tableId,
    viewId,
  });

  const byEmail = new Map<string, typeof airtableRecords>();
  for (const rec of airtableRecords) {
    const email = rec.email ? normalizeEmail(rec.email) : "";
    if (!email || !isValidEmail(email)) continue;
    const existing = byEmail.get(email) ?? [];
    existing.push(rec);
    byEmail.set(email, existing);
  }

  const missingInAirtable: string[] = [];
  const incorrectPayingFlags: RemovalReport["incorrectPayingFlags"] = [];
  const protectedByEquity: RemovalReport["protectedByEquity"] = [];
  const correctlyNonPaying: RemovalReport["correctlyNonPaying"] = [];
  const duplicatesInAirtableForNonActive: RemovalReport["duplicatesInAirtableForNonActive"] =
    [];

  let matchedInAirtableCount = 0;

  for (const email of csvEmails) {
    const recs = byEmail.get(email);
    if (!recs || recs.length === 0) {
      missingInAirtable.push(email);
      continue;
    }

    if (recs.length > 1) {
      duplicatesInAirtableForNonActive.push({
        email,
        recordIds: recs.map((r) => r.id),
      });
    }

    const rec = recs[0];
    const payingChecked = rec.paying;
    const equityChecked = rec.equity;
    const needPaymentChecked = rec.needPaymentEmail ?? false;

    matchedInAirtableCount++;

    if (equityChecked) {
      protectedByEquity.push({ email, recordId: rec.id, equity: true });
    } else if (payingChecked) {
      incorrectPayingFlags.push({
        email,
        recordId: rec.id,
        paying: true,
        equity: false,
      });
    } else {
      correctlyNonPaying.push({
        email,
        recordId: rec.id,
        paying: false,
        needPaymentEmail: needPaymentChecked,
      });
    }
  }

  const airtableNonPayingNotInCsv: RemovalReport["airtableNonPayingNotInCsv"] =
    [];
  for (const [email, recs] of Array.from(byEmail.entries())) {
    const rec = recs[0];
    if (!rec) continue;
    const payingUnchecked = !rec.paying;
    const equityUnchecked = !rec.equity;
    if (
      payingUnchecked &&
      equityUnchecked &&
      !csvNonActiveSet.has(email)
    ) {
      airtableNonPayingNotInCsv.push({ email, recordId: rec.id });
    }
  }

  const report: RemovalReport = {
    timestamp: new Date().toISOString(),
    csvPath,
    airtable: {
      baseId,
      tableId,
      viewId,
      recordsFetched: airtableRecords.length,
    },
    summary: {
      csvNonActiveCount: csvEmails.length,
      invalidCsvRowCount,
      matchedInAirtableCount,
      missingInAirtableCount: missingInAirtable.length,
      incorrectPayingFlagCount: incorrectPayingFlags.length,
      protectedByEquityCount: protectedByEquity.length,
      correctlyNonPayingCount: correctlyNonPaying.length,
      airtableNonPayingNotInCsvCount: airtableNonPayingNotInCsv.length,
      duplicatesInAirtableForNonActiveCount:
        duplicatesInAirtableForNonActive.length,
    },
    missingInAirtable,
    incorrectPayingFlags,
    protectedByEquity,
    correctlyNonPaying,
    airtableNonPayingNotInCsv,
    duplicatesInAirtableForNonActive,
  };

  const jsonOutput = JSON.stringify(report, null, 2);
  console.log(jsonOutput);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportsDir = path.join(process.cwd(), "reports");
  const reportPath = path.join(reportsDir, `removal-dryrun-${timestamp}.json`);
  await mkdir(reportsDir, { recursive: true });
  await writeFile(reportPath, jsonOutput, "utf-8");
  console.error(`\nReport written to: ${reportPath}`);

  // --- Artifacts for Wix non-paying NOT in Airtable + ambiguous ---
  const artifactsDir = path.join(process.cwd(), "artifacts");
  await mkdir(artifactsDir, { recursive: true });

  const wixOnlyNonPayingJson = {
    timestamp: report.timestamp,
    sourceCsv: report.csvPath,
    description: "Wix non-paying (inactive/cancelled/expired) members NOT found in Airtable",
    count: report.missingInAirtable.length,
    emails: report.missingInAirtable,
  };
  await writeFile(
    path.join(artifactsDir, "wix_only_non_paying.json"),
    JSON.stringify(wixOnlyNonPayingJson, null, 2),
    "utf-8"
  );

  const wixOnlyCsvLines = ["email", ...report.missingInAirtable];
  await writeFile(
    path.join(artifactsDir, "wix_only_non_paying.csv"),
    wixOnlyCsvLines.join("\n"),
    "utf-8"
  );

  const ambiguousRows: string[][] = [
    ["email", "record_id_or_ids", "reason"],
  ];
  for (const d of report.duplicatesInAirtableForNonActive) {
    ambiguousRows.push([d.email, d.recordIds.join(";"), "duplicate_airtable_records"]);
  }
  for (const r of report.incorrectPayingFlags) {
    ambiguousRows.push([r.email, r.recordId, "wix_non_active_airtable_paying"]);
  }
  for (const r of report.protectedByEquity) {
    ambiguousRows.push([r.email, r.recordId, "wix_non_active_airtable_equity"]);
  }
  const ambiguousCsv = ambiguousRows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  await writeFile(
    path.join(artifactsDir, "ambiguous_matches.csv"),
    ambiguousCsv,
    "utf-8"
  );

  const summaryMd = [
    "# Wix → Airtable diff summary",
    "",
    `**Generated:** ${report.timestamp}`,
    `**Wix source CSV:** ${report.csvPath}`,
    `**Airtable:** base \`${report.airtable.baseId}\`, table \`${report.airtable.tableId}\`, view \`${report.airtable.viewId}\` — ${report.airtable.recordsFetched} records fetched.`,
    "",
    "## Counts",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    `| Wix non-active CSV rows (valid emails) | ${report.summary.csvNonActiveCount} |`,
    `| Invalid CSV rows (no/empty email or invalid email) | ${report.summary.invalidCsvRowCount} |`,
    `| Matched in Airtable (Wix non-active email found in Airtable) | ${report.summary.matchedInAirtableCount} |`,
    `| **Missing in Airtable (Wix non-paying NOT found in Airtable)** | **${report.summary.missingInAirtableCount}** |`,
    `| Incorrect Paying flag (Wix non-active but Airtable Paying = true) | ${report.summary.incorrectPayingFlagCount} |`,
    `| Protected by Equity (Wix non-active but Airtable Equity = true) | ${report.summary.protectedByEquityCount} |`,
    `| Correctly non-paying in Airtable | ${report.summary.correctlyNonPayingCount} |`,
    `| Airtable non-paying not in Wix CSV | ${report.summary.airtableNonPayingNotInCsvCount} |`,
    `| Duplicates in Airtable for same Wix non-active email | ${report.summary.duplicatesInAirtableForNonActiveCount} |`,
    "",
    "## Assumptions",
    "",
    "- **Matching key:** Email (normalized: trim + lowercase). Wix CSV column: `Email/Name` or `email`. Airtable field: `EMAIL ADDRESS`.",
    "- **Wix non-active:** Rows in the provided CSV are treated as non-active (cancelled/expired/inactive) subscription exports from Wix.",
    "- **No writes:** This run does not modify Airtable, Mongo, or Wix.",
    "",
  ].join("\n");
  await writeFile(
    path.join(artifactsDir, "summary.md"),
    summaryMd,
    "utf-8"
  );

  console.error(`Artifacts written to: ${artifactsDir}/`);
  console.error("  - wix_only_non_paying.csv");
  console.error("  - wix_only_non_paying.json");
  console.error("  - ambiguous_matches.csv");
  console.error("  - summary.md");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
