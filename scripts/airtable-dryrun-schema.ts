/**
 * Read-only Airtable schema discovery script.
 * Run: npx ts-node -r tsconfig-paths/register scripts/airtable-dryrun-schema.ts
 */
import dotenv from "dotenv";
import { fetchAirtableRecords, type AirtableRecord } from "../lib/reconciliation/airtableClient";

dotenv.config();

const ENV_FALLBACKS: Record<string, string[]> = {
  AIRTABLE_API_KEY: ["NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN"],
  AIRTABLE_BASE_ID: ["NEXT_PUBLIC_AIRTABLE_BASE_ID"],
  AIRTABLE_TABLE_NAME: ["NEXT_PUBLIC_AIRTABLE_TABLE_NAME"],
  AIRTABLE_TABLE_ID: ["NEXT_PUBLIC_AIRTABLE_TABLE_NAME"],
};

function requireEnv(name: string): string {
  let val = process.env[name]?.trim();
  if (!val && ENV_FALLBACKS[name]) {
    for (const fallback of ENV_FALLBACKS[name]) {
      val = process.env[fallback]?.trim();
      if (val) break;
    }
  }
  if (!val) {
    const fallbacks = ENV_FALLBACKS[name]?.join(", ");
    throw new Error(
      `Missing required env var: ${name}${fallbacks ? ` (or ${fallbacks})` : ""}. Set it in .env or export it before running.`
    );
  }
  return val;
}

function findCandidateFields(
  fieldNames: string[],
  pattern: string
): string[] {
  const lower = pattern.toLowerCase();
  return fieldNames.filter((f) => f.toLowerCase().includes(lower));
}

function getFieldValue(record: AirtableRecord, fieldName: string): unknown {
  return record.fields[fieldName];
}

async function main() {
  const apiKey = requireEnv("AIRTABLE_API_KEY");
  const baseId = requireEnv("AIRTABLE_BASE_ID");
  const table =
    process.env.AIRTABLE_TABLE_NAME?.trim() ??
    process.env.AIRTABLE_TABLE_ID?.trim() ??
    process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME?.trim();
  if (!table) {
    throw new Error(
      "Missing AIRTABLE_TABLE_NAME, AIRTABLE_TABLE_ID, or NEXT_PUBLIC_AIRTABLE_TABLE_NAME. Set one in .env."
    );
  }
  const view =
    process.env.AIRTABLE_VIEW?.trim() ||
    process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID?.trim() ||
    "viwYDUY0xStG108Lv";

  console.log("=== Airtable Schema Discovery (READ ONLY) ===\n");
  console.log(`Base ID: ${baseId}`);
  console.log(`Table: ${table}`);
  if (view) console.log(`View: ${view}`);
  console.log("");

  const records = await fetchAirtableRecords({
    apiKey,
    baseId,
    table: table.trim(),
    view,
    maxRecords: 10,
  });

  const fieldNames = Array.from(
    new Set(records.flatMap((r) => Object.keys(r.fields)))
  ).sort();

  console.log("1) Table / identifiers");
  console.log(`   Table name/id: ${table}`);
  console.log(`   Records fetched: ${records.length}`);
  console.log("");

  console.log("2) All discovered field names");
  for (const name of fieldNames) {
    console.log(`   - ${name}`);
  }
  console.log("");

  const emailCandidates = findCandidateFields(fieldNames, "email");
  const payingCandidates = findCandidateFields(fieldNames, "paying");
  const equityCandidates = findCandidateFields(fieldNames, "equity");

  console.log("3) Heuristic field candidates");
  console.log(`   Email candidates: ${emailCandidates.length ? emailCandidates.join(", ") : "(none)"}`);
  console.log(`   Paying candidates: ${payingCandidates.length ? payingCandidates.join(", ") : "(none)"}`);
  console.log(`   Equity candidates: ${equityCandidates.length ? equityCandidates.join(", ") : "(none)"}`);
  console.log("");

  const emailField = emailCandidates[0];
  const payingField = payingCandidates[0];
  const equityField = equityCandidates[0];

  console.log("4) Sample rows (first 5 records)");
  const sample = records.slice(0, 5);
  for (const rec of sample) {
    const emailVal = emailField ? getFieldValue(rec, emailField) : undefined;
    const payingVal = payingField ? getFieldValue(rec, payingField) : undefined;
    const equityVal = equityField ? getFieldValue(rec, equityField) : undefined;
    console.log(`   { id: ${rec.id}, email: ${JSON.stringify(emailVal)}, paying: ${JSON.stringify(payingVal)}, equity: ${JSON.stringify(equityVal)} }`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
