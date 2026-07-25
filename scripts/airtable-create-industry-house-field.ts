/**
 * Create the "Industry House" singleSelect field on the Mighty Members Airtable
 * sync table, with the same choices as the legacy Join Map "PRIMARY INDUSTRY
 * HOUSE" dropdown (constants/industry-house-options.ts).
 *
 * The existing "Industry / Sector" free-text column is left untouched — new
 * Join Map signups already write to both columns (see mapJoinMapFieldsToMightyMembers
 * in lib/server/airtableFreeSignupServer.ts). Run
 * scripts/backfill-mighty-members-industry-house.ts afterward to populate this
 * field for existing rows from their "Industry / Sector" value.
 *
 * Requires PAT scopes: schema.bases:read, schema.bases:write
 *
 * Usage:
 *   npx tsx scripts/airtable-create-industry-house-field.ts
 *   npx tsx scripts/airtable-create-industry-house-field.ts --apply
 *
 * Optional env override: AIRTABLE_MIGHTY_INDUSTRY_HOUSE_FIELD (default: "Industry House")
 */
import "dotenv/config";

import { INDUSTRY_HOUSE_NAMES } from "../constants/industry-house-options";
import {
  getAirtableMightyIndustryHouseFieldName,
  getMightySyncTableConfig,
} from "../lib/airtableMightyMembers";
import { ensureAirtableTableFields, type CreateAirtableFieldSpec } from "../lib/airtableMeta";

function parseArgs() {
  return { apply: process.argv.includes("--apply") };
}

async function main() {
  const args = parseArgs();

  const cfg = getMightySyncTableConfig();
  if (!cfg) {
    console.error(
      JSON.stringify({
        error: "airtable_not_configured",
        hint: "Set AIRTABLE_PAT and AIRTABLE_MIGHTY_SYNC_BASE_ID + AIRTABLE_MIGHTY_SYNC_TABLE_ID (or NAME).",
      })
    );
    process.exit(1);
  }

  const fieldName = getAirtableMightyIndustryHouseFieldName();
  const spec: CreateAirtableFieldSpec = {
    name: fieldName,
    type: "singleSelect",
    description:
      "Primary Industry House — mirrors the Join Map dropdown. See constants/industry-house-options.ts.",
    options: { choices: INDUSTRY_HOUSE_NAMES.map((name) => ({ name })) },
  };

  console.error(
    JSON.stringify({
      msg: "create_industry_house_field_start",
      dryRun: !args.apply,
      baseId: cfg.baseId,
      table: cfg.table,
      field: fieldName,
      choiceCount: INDUSTRY_HOUSE_NAMES.length,
      hint: args.apply ? undefined : "Re-run with --apply to create the field.",
    })
  );

  const results = await ensureAirtableTableFields({
    baseId: cfg.baseId,
    tableIdOrName: cfg.table,
    specs: [spec],
    dryRun: !args.apply,
  });

  for (const r of results) {
    console.log(JSON.stringify(r));
  }

  if (results.some((r) => r.action === "exists")) {
    console.error(
      JSON.stringify({
        note: `A field named "${fieldName}" already exists. This script does not verify its type or choices — confirm manually in Airtable that it is a singleSelect with the expected choices before running the backfill.`,
      })
    );
  }

  if (results.some((r) => r.action === "error")) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
