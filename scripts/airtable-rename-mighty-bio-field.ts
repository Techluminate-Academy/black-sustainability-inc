/**
 * Rename the Mighty Members Airtable bio column (default: Short Bio → Extended Bio).
 *
 * Uses Airtable Metadata API PATCH (requires schema.bases:read + schema.bases:write).
 * Does not change field IDs — only the column title shown in Airtable.
 *
 * After a successful rename, set on Render/local:
 *   AIRTABLE_MIGHTY_BIO_FIELD=Extended Bio
 * (or remove the env var once getAirtableMightyBioFieldName default is updated in code.)
 *
 * Usage:
 *   npx tsx scripts/airtable-rename-mighty-bio-field.ts
 *   npx tsx scripts/airtable-rename-mighty-bio-field.ts --apply
 *   AIRTABLE_MIGHTY_BIO_RENAME_FROM="Short Bio" AIRTABLE_MIGHTY_BIO_FIELD="Extended Bio" npx tsx scripts/airtable-rename-mighty-bio-field.ts --apply
 */
import "dotenv/config";

import { getMightySyncTableConfig } from "../lib/airtableMightyMembers";
import { renameAirtableTableFieldByName } from "../lib/airtableMeta";

function getFromName(): string {
  return (process.env.AIRTABLE_MIGHTY_BIO_RENAME_FROM || "Short Bio").trim() || "Short Bio";
}

function getToName(): string {
  return (
    process.env.AIRTABLE_MIGHTY_BIO_FIELD ||
    process.env.MIGHTY_BIO_FIELD_TITLE ||
    "Extended Bio"
  ).trim() || "Extended Bio";
}

async function main() {
  const apply = process.argv.includes("--apply");
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

  const fromName = getFromName();
  const toName = getToName();

  console.error(
    JSON.stringify({
      msg: "rename_mighty_bio_field_start",
      dryRun: !apply,
      baseId: cfg.baseId,
      table: cfg.table,
      fromName,
      toName,
      hint: apply ? undefined : "Re-run with --apply to rename the column.",
    })
  );

  const result = await renameAirtableTableFieldByName({
    baseId: cfg.baseId,
    tableIdOrName: cfg.table,
    fromName,
    toName,
    dryRun: !apply,
  });

  console.log(JSON.stringify(result));

  if (result.action === "conflict") {
    console.error(
      JSON.stringify({
        error: "target_column_exists",
        hint: `Column "${toName}" already exists. Remove or merge duplicates, or pick another AIRTABLE_MIGHTY_BIO_FIELD name.`,
      })
    );
    process.exit(1);
  }

  if (result.action === "not_found") {
    console.error(
      JSON.stringify({
        error: "source_column_not_found",
        hint: `No column named "${fromName}". List fields in Airtable or adjust AIRTABLE_MIGHTY_BIO_RENAME_FROM.`,
      })
    );
    process.exit(1);
  }

  if (result.action === "renamed" || result.action === "already_named") {
    console.error(
      JSON.stringify({
        msg: "next_step",
        hint: `Set AIRTABLE_MIGHTY_BIO_FIELD=${JSON.stringify(toName)} in Render so upserts target the renamed column.`,
      })
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
