/**
 * Backfill legacy Airtable profile photos and bios into Mighty Networks + MongoDB
 * when those fields are missing today.
 *
 * Source: Mighty Members Airtable sync table (AIRTABLE_PAT + AIRTABLE_MIGHTY_SYNC_*).
 * Reads Short Bio + Profile Photo URL when present; writes to Mighty + Mongo if missing.
 * Bios → Mighty "Short Bio" custom field (MIGHTY_BIO_CUSTOM_FIELD_ID).
 * Photos → Mighty asset upload + member avatar assignment.
 *
 * Default is dry-run. Use --apply to write.
 *
 * Usage:
 *   npx tsx scripts/mighty-backfill-legacy-profile.ts
 *   npx tsx scripts/mighty-backfill-legacy-profile.ts --summary
 *   npx tsx scripts/mighty-backfill-legacy-profile.ts --apply --limit 10 --sleep-ms 500
 *   npx tsx scripts/mighty-backfill-legacy-profile.ts --email you@example.com --apply
 *   npx tsx scripts/mighty-backfill-legacy-profile.ts --bios-only --apply
 *   npx tsx scripts/mighty-backfill-legacy-profile.ts --photos-only --apply --sync-airtable
 */
import "dotenv/config";

import { connectToDatabase } from "../lib/mongodb";
import { airtableEnabled } from "../lib/airtableMightyMembers";
import {
  applyLegacyProfileBackfill,
  fetchAllLegacyRosterRecords,
  getMightyMembersSourceConfig,
  invalidateCachesAfterBackfill,
  loadMemberBackfillState,
  summarizeBackfillCandidates,
  type BackfillMemberState,
} from "../lib/domain/members/legacyProfileBackfill";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const emailIdx = argv.indexOf("--email");
  const limitIdx = argv.indexOf("--limit");
  const offsetIdx = argv.indexOf("--offset");
  const sleepIdx = argv.indexOf("--sleep-ms");

  return {
    apply: argv.includes("--apply"),
    dryRun: !argv.includes("--apply"),
    summary: argv.includes("--summary"),
    biosOnly: argv.includes("--bios-only"),
    photosOnly: argv.includes("--photos-only"),
    syncAirtable: argv.includes("--sync-airtable"),
    skipCacheInvalidate: argv.includes("--no-cache-invalidate"),
    emailFilter:
      emailIdx >= 0 && argv[emailIdx + 1]?.includes("@")
        ? argv[emailIdx + 1]!.trim().toLowerCase()
        : null,
    limit:
      limitIdx >= 0 && argv[limitIdx + 1] ? Math.max(1, parseInt(argv[limitIdx + 1]!, 10) || 0) : 0,
    offset:
      offsetIdx >= 0 && argv[offsetIdx + 1] ? Math.max(0, parseInt(argv[offsetIdx + 1]!, 10) || 0) : 0,
    sleepMs:
      sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : 400,
  };
}

function isPlaceholderEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  if (e === "test@example.com" || e === "john.doe@example.com") return true;
  const domain = e.split("@")[1];
  return domain === "example.com" || domain === "example.org";
}

function hasWork(state: BackfillMemberState): boolean {
  const t = state.targets;
  return t.mightyBio || t.mightyPhoto || t.mongoBio || t.mongoPhoto;
}

async function main() {
  const args = parseArgs();
  if (args.biosOnly && args.photosOnly) {
    console.error("Use only one of --bios-only or --photos-only.");
    process.exit(1);
  }

  const includeBios = !args.photosOnly;
  const includePhotos = !args.biosOnly;

  const legacyCfg = getMightyMembersSourceConfig();
  if (!legacyCfg) {
    console.error(
      "Mighty Members Airtable not configured. Set AIRTABLE_PAT, AIRTABLE_MIGHTY_SYNC_BASE_ID, and AIRTABLE_MIGHTY_SYNC_TABLE_ID (or NAME)."
    );
    process.exit(1);
  }

  if (includeBios && !process.env.MIGHTY_BIO_CUSTOM_FIELD_ID) {
    console.error(
      "MIGHTY_BIO_CUSTOM_FIELD_ID is required for bio backfill. Run: npx tsx scripts/mighty-create-bio-field.ts"
    );
    process.exit(1);
  }

  if (args.syncAirtable && !airtableEnabled()) {
    console.error("Airtable Mighty sync not configured; remove --sync-airtable or fix env.");
    process.exit(1);
  }

  if (!process.env.MIGHTY_API_KEY && !process.env.MIGHTY_NETWORK_API_KEY) {
    console.error("MIGHTY_API_KEY or MIGHTY_NETWORK_API_KEY is required.");
    process.exit(1);
  }

  console.error(
    JSON.stringify({
      msg: "legacy_profile_backfill_start",
      mode: args.dryRun ? "dry-run" : "apply",
      includeBios,
      includePhotos,
      airtableBaseId: legacyCfg.baseId,
      airtableTable: legacyCfg.table,
      emailFilter: args.emailFilter,
      offset: args.offset || null,
      limit: args.limit || null,
      syncAirtable: args.syncAirtable,
    })
  );

  const legacyRows = await fetchAllLegacyRosterRecords(legacyCfg);
  let workRows = legacyRows;
  if (args.emailFilter) {
    workRows = legacyRows.filter((r) => r.email === args.emailFilter);
    if (workRows.length === 0) {
      console.error(JSON.stringify({ error: "no_legacy_row_for_email", email: args.emailFilter }));
      process.exit(1);
    }
  }
  if (args.offset > 0) workRows = workRows.slice(args.offset);
  if (args.limit > 0) workRows = workRows.slice(0, args.limit);

  const { db } = await connectToDatabase();

  if (args.summary) {
    const filtered = workRows.filter((r) => !isPlaceholderEmail(r.email));
    const summary = await summarizeBackfillCandidates(db, filtered, {
      includeBios,
      includePhotos,
    });
    console.error(
      JSON.stringify({
        msg: "legacy_profile_backfill_summary",
        airtableCandidates: legacyRows.length,
        batchSize: workRows.length,
        rowsWithBioOrPhoto: filtered.length,
        ...summary,
        note: "Apply pass also updates Mighty when Short Bio / avatar are empty there (per-member API check).",
      })
    );
    return;
  }

  const stats = {
    legacyCandidates: legacyRows.length,
    batchSize: workRows.length,
    skippedPlaceholder: 0,
    skippedNoMighty: 0,
    skippedAlreadyComplete: 0,
    eligible: 0,
    applied: 0,
    errors: 0,
    mightyBio: 0,
    mightyPhoto: 0,
    mongoBio: 0,
    mongoPhoto: 0,
  };

  let anyApplied = false;

  for (const row of workRows) {
    if (isPlaceholderEmail(row.email)) {
      stats.skippedPlaceholder++;
      continue;
    }

    const stateOrSkip = await loadMemberBackfillState(db, {
      email: row.email,
      mightyIdHint: row.mightyIdFromAirtable,
      legacyBio: row.legacyBio,
      legacyPhotoUrl: row.legacyPhotoUrl,
      includeBios,
      includePhotos,
    });

    if ("skip" in stateOrSkip) {
      stats.skippedNoMighty++;
      console.log(
        JSON.stringify({
          action: "skipped",
          reason: stateOrSkip.skip,
          email: row.email,
          record_id: row.recordId,
        })
      );
      continue;
    }

    const state = stateOrSkip;
    if (!hasWork(state)) {
      stats.skippedAlreadyComplete++;
      console.log(
        JSON.stringify({
          action: "skipped_complete",
          email: row.email,
          mightyId: state.mightyId,
          record_id: row.recordId,
        })
      );
      continue;
    }

    stats.eligible++;

    if (args.dryRun) {
      console.log(
        JSON.stringify({
          action: "would_backfill",
          email: row.email,
          mightyId: state.mightyId,
          record_id: row.recordId,
          targets: state.targets,
          legacyBioLen: state.legacyBio.length,
          legacyPhoto: !!state.legacyPhotoUrl,
        })
      );
      continue;
    }

    const result = await applyLegacyProfileBackfill(db, state, {
      syncAirtable: args.syncAirtable,
      airtableRecordId: row.recordId,
      airtableCfg: legacyCfg,
    });

    const ok =
      result.applied.mightyBio ||
      result.applied.mightyPhoto ||
      result.applied.mongoBio ||
      result.applied.mongoPhoto;

    if (ok) {
      stats.applied++;
      anyApplied = true;
      if (result.applied.mightyBio) stats.mightyBio++;
      if (result.applied.mightyPhoto) stats.mightyPhoto++;
      if (result.applied.mongoBio) stats.mongoBio++;
      if (result.applied.mongoPhoto) stats.mongoPhoto++;
    }
    if (result.errors.length) stats.errors++;

    console.log(
      JSON.stringify({
        action: ok ? "backfilled" : "error",
        email: row.email,
        mightyId: state.mightyId,
        record_id: row.recordId,
        applied: result.applied,
        errors: result.errors.length ? result.errors : undefined,
      })
    );

    await sleep(args.sleepMs);
  }

  if (anyApplied && !args.skipCacheInvalidate) {
    await invalidateCachesAfterBackfill();
  }

  console.error(JSON.stringify({ msg: "legacy_profile_backfill_done", ...stats }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
