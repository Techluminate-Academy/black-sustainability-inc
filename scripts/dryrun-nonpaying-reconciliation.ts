/**
 * READ-ONLY dry run: validates non-paying members list (Wix CSV) against Airtable.
 * Produces a reconciliation report - no Airtable updates.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/dryrun-nonpaying-reconciliation.ts \
 *   --csv ./test-data/Wix-non-active-members-non-paying.csv \
 *   [--baseId <id>] [--tableId <id>] [--viewId <id>]
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

async function loadNonPayingCsvEmails(filePath: string): Promise<{
  emails: string[];
  invalidCsvRowCount: number;
}> {
  const content = await readFile(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Record<string, string>[];

  const emailColumn =
    Object.keys(records[0] ?? {}).find(
      (k) => k.toLowerCase() === "email"
    ) ?? "Email";

  const seen = new Set<string>();
  let invalidCsvRowCount = 0;

  for (const row of records) {
    const raw = row[emailColumn] as string | undefined;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      invalidCsvRowCount++;
      continue;
    }
    const email = normalizeEmail(String(raw));
    if (!email || !email.includes("@")) {
      invalidCsvRowCount++;
      continue;
    }
    seen.add(email);
  }

  return { emails: Array.from(seen), invalidCsvRowCount };
}

type NonPayingReport = {
  timestamp: string;
  csvPath: string;
  airtable: { baseId: string; tableId: string; viewId: string; recordsFetched: number };
  summary: {
    csvNonPayingCount: number;
    invalidCsvRowCount: number;
    invalidAirtableRowCount: number;
    matchedInAirtableCount: number;
    missingInAirtableCount: number;
    incorrectPayingFlagCount: number;
    protectedByEquityCount: number;
    correctlyNonPayingCount: number;
    airtableNonPayingNotInCsvCount: number;
    duplicatesInAirtableForNonPayingCount: number;
  };
  missingInAirtable: string[];
  incorrectPayingFlags: Array<{ email: string; recordId: string; paying: boolean; equity: boolean }>;
  protectedByEquity: Array<{ email: string; recordId: string; equity: boolean }>;
  correctlyNonPaying: Array<{
    email: string;
    recordId: string;
    paying: boolean;
    needPaymentEmail: boolean;
  }>;
  airtableNonPayingNotInCsv: Array<{ email: string; recordId: string }>;
  duplicatesInAirtableForNonPaying: Array<{ email: string; recordIds: string[] }>;
};

async function main() {
  const args = process.argv.slice(2);
  const csvIdx = args.indexOf("--csv");
  if (csvIdx === -1 || !args[csvIdx + 1]) {
    throw new Error("Usage: --csv <path> [--baseId <id>] [--tableId <id>] [--viewId <id>]");
  }
  const csvPath = path.resolve(process.cwd(), args[csvIdx + 1]!);

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

  console.log("=== Non-Paying Members Reconciliation (READ ONLY) ===\n");
  console.log(`CSV: ${csvPath}`);
  console.log(`Airtable: base=${baseId} table=${tableId} view=${viewId}\n`);

  const { emails: csvEmails, invalidCsvRowCount } =
    await loadNonPayingCsvEmails(csvPath);
  const csvNonPayingSet = new Set(csvEmails);

  const airtableRecords = await fetchAllFromView({
    apiKey,
    baseId,
    tableId,
    viewId,
  });

  const byEmail = new Map<string, typeof airtableRecords>();
  let invalidAirtableRowCount = 0;

  for (const rec of airtableRecords) {
    const email = rec.email ? normalizeEmail(rec.email) : "";
    if (!email || !email.includes("@")) {
      invalidAirtableRowCount++;
      continue;
    }
    const existing = byEmail.get(email) ?? [];
    existing.push(rec);
    byEmail.set(email, existing);
  }

  const missingInAirtable: string[] = [];
  const incorrectPayingFlags: NonPayingReport["incorrectPayingFlags"] = [];
  const protectedByEquity: NonPayingReport["protectedByEquity"] = [];
  const correctlyNonPaying: NonPayingReport["correctlyNonPaying"] = [];
  const duplicatesInAirtableForNonPaying: NonPayingReport["duplicatesInAirtableForNonPaying"] = [];

  let matchedInAirtableCount = 0;

  for (const email of csvEmails) {
    const recs = byEmail.get(email);
    if (!recs || recs.length === 0) {
      missingInAirtable.push(email);
      continue;
    }

    if (recs.length > 1) {
      duplicatesInAirtableForNonPaying.push({
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

  const airtableNonPayingNotInCsv: NonPayingReport["airtableNonPayingNotInCsv"] = [];
  for (const [email, recs] of Array.from(byEmail.entries())) {
    const rec = recs[0];
    if (!rec) continue;
    const payingUnchecked = !rec.paying;
    const needPaymentChecked = rec.needPaymentEmail ?? false;
    if (payingUnchecked && needPaymentChecked && !csvNonPayingSet.has(email)) {
      airtableNonPayingNotInCsv.push({ email, recordId: rec.id });
    }
  }

  const report: NonPayingReport = {
    timestamp: new Date().toISOString(),
    csvPath,
    airtable: {
      baseId,
      tableId,
      viewId,
      recordsFetched: airtableRecords.length,
    },
    summary: {
      csvNonPayingCount: csvEmails.length,
      invalidCsvRowCount,
      invalidAirtableRowCount,
      matchedInAirtableCount,
      missingInAirtableCount: missingInAirtable.length,
      incorrectPayingFlagCount: incorrectPayingFlags.length,
      protectedByEquityCount: protectedByEquity.length,
      correctlyNonPayingCount: correctlyNonPaying.length,
      airtableNonPayingNotInCsvCount: airtableNonPayingNotInCsv.length,
      duplicatesInAirtableForNonPayingCount: duplicatesInAirtableForNonPaying.length,
    },
    missingInAirtable,
    incorrectPayingFlags,
    protectedByEquity,
    correctlyNonPaying,
    airtableNonPayingNotInCsv,
    duplicatesInAirtableForNonPaying,
  };

  console.log("--- Summary ---");
  console.log(`A) Does Airtable reflect the non-paying list?`);
  console.log(
    `   Matched: ${report.summary.matchedInAirtableCount}/${report.summary.csvNonPayingCount} CSV emails found in Airtable`
  );
  console.log(
    `   Correctly non-paying: ${report.summary.correctlyNonPayingCount}`
  );
  console.log(
    `   Incorrect paying flag: ${report.summary.incorrectPayingFlagCount}`
  );
  console.log(`   Protected by equity: ${report.summary.protectedByEquityCount}`);
  console.log(`B) Airtable non-paying NOT in CSV: ${report.summary.airtableNonPayingNotInCsvCount}`);
  console.log(`C) CSV emails missing from Airtable: ${report.summary.missingInAirtableCount}`);
  console.log(`D) Incorrectly marked Paying (no equity): ${report.summary.incorrectPayingFlagCount}`);
  console.log(`E) Protected by Equity: ${report.summary.protectedByEquityCount}`);
  console.log(
    `   Invalid CSV rows (skipped): ${report.summary.invalidCsvRowCount}`
  );
  console.log(
    `   Invalid Airtable rows (no email): ${report.summary.invalidAirtableRowCount}`
  );
  console.log(
    `   Duplicates in Airtable (same email): ${report.summary.duplicatesInAirtableForNonPayingCount}`
  );

  const topN = 20;
  if (missingInAirtable.length > 0) {
    console.log(`\n--- Missing in Airtable (first ${topN}) ---`);
    missingInAirtable.slice(0, topN).forEach((e) => console.log(`  ${e}`));
  }
  if (incorrectPayingFlags.length > 0) {
    console.log(`\n--- Incorrect Paying Flag (first ${topN}) ---`);
    incorrectPayingFlags.slice(0, topN).forEach((x) =>
      console.log(`  ${x.email} -> ${x.recordId} (paying=true, equity=false)`)
    );
  }
  if (protectedByEquity.length > 0) {
    console.log(`\n--- Protected by Equity (first ${topN}) ---`);
    protectedByEquity.slice(0, topN).forEach((x) =>
      console.log(`  ${x.email} -> ${x.recordId}`)
    );
  }
  if (correctlyNonPaying.length > 0) {
    console.log(`\n--- Correctly Non-Paying (first ${topN}) ---`);
    correctlyNonPaying.slice(0, topN).forEach((x) =>
      console.log(
        `  ${x.email} -> ${x.recordId} (needPaymentEmail=${x.needPaymentEmail})`
      )
    );
  }
  if (airtableNonPayingNotInCsv.length > 0) {
    console.log(`\n--- Airtable Non-Paying NOT in CSV (first ${topN}) ---`);
    airtableNonPayingNotInCsv.slice(0, topN).forEach((x) =>
      console.log(`  ${x.email} -> ${x.recordId}`)
    );
  }
  if (duplicatesInAirtableForNonPaying.length > 0) {
    console.log(
      `\n--- Duplicates in Airtable for Non-Paying (first ${topN}) ---`
    );
    duplicatesInAirtableForNonPaying.slice(0, topN).forEach((x) =>
      console.log(`  ${x.email}: ${x.recordIds.join(", ")}`)
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactsDir = path.join(process.cwd(), "artifacts");
  const reportPath = path.join(
    artifactsDir,
    `nonpaying_dryrun_${timestamp}.json`
  );
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
