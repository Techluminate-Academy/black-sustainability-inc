/**
 * Ensure Mighty Members Airtable sync columns for profile mirror (bio + photo URL).
 *
 * Creates missing columns via Airtable Metadata API:
 *   - Short Bio (multilineText) — mirrored from Mighty custom field / backfill
 *   - Profile Photo URL (url) — mirrored from Mighty avatar
 *
 * Requires PAT scopes: schema.bases:read, schema.bases:write
 *
 * Usage:
 *   npx tsx scripts/airtable-create-mighty-profile-fields.ts
 *   npx tsx scripts/airtable-create-mighty-profile-fields.ts --apply
 *   npx tsx scripts/airtable-create-mighty-profile-fields.ts --apply --bio-only
 */
import "dotenv/config";

import { getMightySyncTableConfig } from "../lib/airtableMightyMembers";
import { ensureAirtableTableFields, type CreateAirtableFieldSpec } from "../lib/airtableMeta";

function parseArgs() {
  return {
    apply: process.argv.includes("--apply"),
    bioOnly: process.argv.includes("--bio-only"),
    photoOnly: process.argv.includes("--photo-only"),
  };
}

export function getAirtableShortBioFieldName(): string {
  return (process.env.AIRTABLE_MIGHTY_BIO_FIELD || "Short Bio").trim() || "Short Bio";
}

export function getAirtableProfilePhotoUrlFieldName(): string {
  return (process.env.AIRTABLE_MIGHTY_PROFILE_PHOTO_FIELD || "Profile Photo URL").trim() || "Profile Photo URL";
}

function buildFieldSpecs(opts: { bioOnly: boolean; photoOnly: boolean }): CreateAirtableFieldSpec[] {
  const includeBio = !opts.photoOnly;
  const includePhoto = !opts.bioOnly;
  const specs: CreateAirtableFieldSpec[] = [];

  if (includeBio) {
    specs.push({
      name: getAirtableShortBioFieldName(),
      type: "multilineText",
      description: "Member short bio mirrored from Mighty Networks (Short Bio custom field).",
    });
  }

  if (includePhoto) {
    specs.push({
      name: getAirtableProfilePhotoUrlFieldName(),
      type: "url",
      description: "Profile photo URL mirrored from Mighty Networks member avatar.",
    });
  }

  return specs;
}

async function main() {
  const args = parseArgs();
  if (args.bioOnly && args.photoOnly) {
    console.error("Use only one of --bio-only or --photo-only.");
    process.exit(1);
  }

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

  const specs = buildFieldSpecs(args);
  console.error(
    JSON.stringify({
      msg: "create_mighty_profile_fields_start",
      dryRun: !args.apply,
      baseId: cfg.baseId,
      table: cfg.table,
      fields: specs.map((s) => ({ name: s.name, type: s.type })),
      hint: args.apply
        ? undefined
        : "Re-run with --apply to create missing columns.",
    })
  );

  const results = await ensureAirtableTableFields({
    baseId: cfg.baseId,
    tableIdOrName: cfg.table,
    specs,
    dryRun: !args.apply,
    sleepMs: 300,
  });

  for (const r of results) {
    console.log(JSON.stringify(r));
  }

  const failed = results.filter((r) => r.action === "error");
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
