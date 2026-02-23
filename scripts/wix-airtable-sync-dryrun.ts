/**
 * READ-ONLY dry run: Compare Wix subscription status (source of truth) vs Airtable.
 * Uses deterministic diff engine. No writes. Idempotent: no-op when already aligned.
 *
 * Run: npm run wix-airtable-sync-dryrun
 *
 * With CSV fallback (when API unavailable):
 *   npx ts-node -r tsconfig-paths/register scripts/wix-airtable-sync-dryrun.ts --csv ./path/to/wix-export.csv
 */
import dotenv from "dotenv";
import path from "path";
import { loadWixSubscriptionsFromSource, loadWixSubscriptions } from "../lib/reconciliation/wixAuthority";
import { aggregateAuthorizations } from "../lib/billing/aggregateAuthorization";
import { fetchAllFromView } from "../lib/reconciliation/airtableClient";
import { computeWixAirtableDiff } from "../lib/reconciliation/computeWixAirtableDiff";
import {
  createSyncReportPayload,
  type SyncReportPayload,
} from "../lib/reconciliation/syncReportPayload";
import { sendSyncReportEmail } from "../lib/notifications/sendSyncReportEmail";

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
    throw new Error(`Missing env: ${name}${fallbacks ? ` (or ${fallbacks})` : ""}`);
  }
  return val;
}

function parseArgs(): { csvPath?: string } {
  const args = process.argv.slice(2);
  const csvIdx = args.indexOf("--csv");
  if (csvIdx >= 0 && args[csvIdx + 1]) {
    return { csvPath: path.resolve(process.cwd(), args[csvIdx + 1]!) };
  }
  return {};
}

async function main() {
  const { csvPath } = parseArgs();

  const apiKey = requireEnv("AIRTABLE_API_KEY");
  const baseId = requireEnv("AIRTABLE_BASE_ID");
  const tableId = requireEnv("AIRTABLE_TABLE_ID");
  const viewId = requireEnv("AIRTABLE_VIEW_ID");

  console.log("=== Wix → Airtable Sync Dry Run (READ ONLY) ===\n");
  console.log("Wix is source of truth. Idempotent: no update when already aligned.\n");

  let subscriptions;
  let source: string;

  try {
    const result = await loadWixSubscriptionsFromSource({
      csvPath: csvPath ?? undefined,
      preferApi: true,
    });
    subscriptions = result.subscriptions;
    source = result.source;
  } catch (err) {
    if (csvPath) {
      subscriptions = await loadWixSubscriptions(csvPath);
      source = "csv";
    } else {
      throw new Error(
        "Wix API failed and no --csv path. Set WIX_* env vars or pass --csv <path>.\n" +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  const authorizations = aggregateAuthorizations(subscriptions);
  const authorizedCount = authorizations.filter((a) => a.authorized).length;
  const unauthorizedCount = authorizations.filter((a) => !a.authorized).length;

  const airtableMembers = await fetchAllFromView({ apiKey, baseId, tableId, viewId });
  const diff = computeWixAirtableDiff(authorizations, airtableMembers);

  const matchedCount =
    diff.noopsAligned.length + diff.updatesToTrue.length + diff.updatesToFalse.length;

  console.log(`Wix source: ${source}`);
  console.log(`Wix subscriptions: ${subscriptions.length}`);
  console.log(`Wix unique emails: ${authorizations.length}`);
  console.log(`Wix authorized (paying): ${authorizedCount}`);
  console.log(`Wix unauthorized: ${unauthorizedCount}\n`);

  console.log(`Airtable records: ${airtableMembers.length}`);
  console.log(`Airtable base: ${baseId}, table: ${tableId}\n`);

  console.log("--- Summary ---");
  console.log(`Matched in Airtable: ${matchedCount}`);
  console.log(`Would UPDATE paying=true:  ${diff.updatesToTrue.length}`);
  console.log(`Would UPDATE paying=false: ${diff.updatesToFalse.length}`);
  console.log(`Noop aligned (no change needed): ${diff.noopsAligned.length}`);
  console.log(`Missing in Airtable: ${diff.missingInAirtable.length}`);
  console.log(`Equity-protected skipped: ${diff.skippedEquityProtected.length}`);
  console.log(`Duplicate emails in Airtable: ${diff.duplicatesInAirtable.length}\n`);

  if (diff.updatesToTrue.length > 0) {
    console.log("--- Would set paying=TRUE (Wix authorized) ---");
    for (const u of diff.updatesToTrue) {
      console.log(`  ${u.email}`);
      console.log(`    recordId: ${u.recordId} | ${u.wixEvidence}`);
    }
    console.log("");
  }

  if (diff.updatesToFalse.length > 0) {
    console.log("--- Would set paying=FALSE (Wix NOT authorized) ---");
    for (const u of diff.updatesToFalse) {
      console.log(`  ${u.email}`);
      console.log(`    recordId: ${u.recordId} | ${u.wixEvidence}`);
    }
    console.log("");
  }

  if (diff.missingInAirtable.length > 0) {
    const show = diff.missingInAirtable.slice(0, 20);
    console.log(
      `--- Missing in Airtable (first ${show.length} of ${diff.missingInAirtable.length}) ---`
    );
    for (const m of show) {
      console.log(`  ${m.email}`);
    }
    console.log("");
  }

  if (diff.skippedEquityProtected.length > 0) {
    console.log("--- Equity-protected skipped ---");
    for (const s of diff.skippedEquityProtected) {
      console.log(`  ${s.email}${s.recordId ? ` (recordId: ${s.recordId})` : ""}`);
    }
    console.log("");
  }

  if (diff.duplicatesInAirtable.length > 0) {
    console.log("--- Duplicate emails in Airtable ---");
    for (const d of diff.duplicatesInAirtable) {
      console.log(`  ${d.email}: ${d.recordIds.join(", ")}`);
    }
    console.log("");
  }

  console.log("[Dry run complete. No changes made. Use wix-airtable-sync-apply to update Airtable.]\n");

  const report: SyncReportPayload = createSyncReportPayload("dryrun", {
    wixSubscriptions: subscriptions.length,
    wixUniqueEmails: authorizations.length,
    wixAuthorized: authorizedCount,
    wixUnauthorized: unauthorizedCount,
    airtableMatched: matchedCount,
    airtableMissing: diff.missingInAirtable.length,
    airtableDuplicates: diff.duplicatesInAirtable.length,
    setTrueCount: diff.updatesToTrue.length,
    setFalseCount: diff.updatesToFalse.length,
    noopCount: diff.noopsAligned.length,
    skippedEquityCount: diff.skippedEquityProtected.length,
    setTrueEmails: diff.updatesToTrue.map((u) => u.email),
    setFalseEmails: diff.updatesToFalse.map((u) => u.email),
    missingEmails: diff.missingInAirtable.map((m) => m.email),
    duplicateEmails: diff.duplicatesInAirtable.map((d) => d.email),
    skippedEquityEmails: diff.skippedEquityProtected.map((s) => s.email),
  });

  console.log("--- Report (JSON, for cron email) ---");
  console.log(JSON.stringify(report, null, 2));

  try {
    await sendSyncReportEmail(report);
  } catch (err) {
    console.error("Email send failed:", err instanceof Error ? err.message : err);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
