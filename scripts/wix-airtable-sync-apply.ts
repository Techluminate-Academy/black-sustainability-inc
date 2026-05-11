/**
 * LEGACY: Apply Wix → Airtable sync updates (staff mirror only; not map billing truth).
 * Requires explicit opt-in: ALLOW_WIX_AIRTABLE_APPLY=1
 *
 * Uses diff engine; only updates when wixAuthorized !== airtablePaying.
 * Equity-protected emails are never modified.
 *
 * Run: ALLOW_WIX_AIRTABLE_APPLY=1 npm run wix-airtable-sync-apply
 *
 * With CSV fallback:
 *   ALLOW_WIX_AIRTABLE_APPLY=1 npx ts-node -r tsconfig-paths/register scripts/wix-airtable-sync-apply.ts --csv ./path/to/wix-export.csv
 */
import dotenv from "dotenv";
import path from "path";
import { loadWixSubscriptionsFromSource, loadWixSubscriptions } from "../lib/reconciliation/wixAuthority";
import { aggregateAuthorizations } from "../lib/billing/aggregateAuthorization";
import { fetchAllFromView, patchPayingMember } from "../lib/reconciliation/airtableClient";
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

const BATCH_DELAY_MS = 250; // ~4 req/sec to stay under Airtable 5 req/sec limit

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (process.env.ALLOW_WIX_AIRTABLE_APPLY !== "1") {
    console.error(
      "Refusing to run: Wix → Airtable apply is legacy and gated.\n" +
        "Map/directory paid status is driven by Mighty → MongoDB (mightyMembers), not Wix.\n" +
        "To proceed anyway, set: ALLOW_WIX_AIRTABLE_APPLY=1\n"
    );
    process.exit(2);
  }

  const { csvPath } = parseArgs();

  const apiKey = requireEnv("AIRTABLE_API_KEY");
  const baseId = requireEnv("AIRTABLE_BASE_ID");
  const tableId = requireEnv("AIRTABLE_TABLE_ID");
  const viewId = requireEnv("AIRTABLE_VIEW_ID");

  console.log("=== Wix → Airtable Sync APPLY ===\n");
  console.log("Applying diff. Equity-protected emails will be skipped.\n");

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
  console.log(`Wix authorized: ${authorizedCount}, unauthorized: ${unauthorizedCount}\n`);

  console.log(`Diff: ${diff.updatesToTrue.length} to set true, ${diff.updatesToFalse.length} to set false`);
  console.log(`${diff.noopsAligned.length} noop (aligned), ${diff.skippedEquityProtected.length} skipped (equity)\n`);

  const successfulSetTrue: string[] = [];
  const successfulSetFalse: string[] = [];
  const errorMessages: string[] = [];
  let errorsCount = 0;

  const patchOpts = { apiKey, baseId, tableId };

  for (const u of diff.updatesToTrue) {
    try {
      await patchPayingMember({
        ...patchOpts,
        recordId: u.recordId,
        paying: true,
        setNeedPaymentEmail: true,
      });
      successfulSetTrue.push(u.email);
      console.log(`  [OK] ${u.email} | ${u.recordId} | false -> true`);
    } catch (err) {
      errorsCount++;
      const msg = `${u.email}: ${err instanceof Error ? err.message : String(err)}`;
      errorMessages.push(msg);
      console.error(`  [ERR] ${u.email} | ${u.recordId}:`, err instanceof Error ? err.message : err);
    }
    await sleep(BATCH_DELAY_MS);
  }

  for (const u of diff.updatesToFalse) {
    try {
      await patchPayingMember({
        ...patchOpts,
        recordId: u.recordId,
        paying: false,
        setNeedPaymentEmail: true,
      });
      successfulSetFalse.push(u.email);
      console.log(`  [OK] ${u.email} | ${u.recordId} | true -> false`);
    } catch (err) {
      errorsCount++;
      const msg = `${u.email}: ${err instanceof Error ? err.message : String(err)}`;
      errorMessages.push(msg);
      console.error(`  [ERR] ${u.email} | ${u.recordId}:`, err instanceof Error ? err.message : err);
    }
    await sleep(BATCH_DELAY_MS);
  }

  const updatedTrueCount = successfulSetTrue.length;
  const updatedFalseCount = successfulSetFalse.length;
  const totalUpdated = updatedTrueCount + updatedFalseCount;

  console.log("\n--- Final Summary ---");
  console.log(`updatedTrueCount: ${updatedTrueCount}`);
  console.log(`updatedFalseCount: ${updatedFalseCount}`);
  console.log(`totalUpdated: ${totalUpdated}`);
  console.log(`noopAlignedCount: ${diff.noopsAligned.length}`);
  console.log(`skippedEquityProtectedCount: ${diff.skippedEquityProtected.length}`);
  console.log(`missingInAirtableCount: ${diff.missingInAirtable.length}`);
  console.log(`duplicatesCount: ${diff.duplicatesInAirtable.length}`);
  console.log(`errorsCount: ${errorsCount}\n`);

  const report: SyncReportPayload = createSyncReportPayload("apply", {
    wixSubscriptions: subscriptions.length,
    wixUniqueEmails: authorizations.length,
    wixAuthorized: authorizedCount,
    wixUnauthorized: unauthorizedCount,
    airtableMatched: matchedCount,
    airtableMissing: diff.missingInAirtable.length,
    airtableDuplicates: diff.duplicatesInAirtable.length,
    setTrueCount: updatedTrueCount,
    setFalseCount: updatedFalseCount,
    noopCount: diff.noopsAligned.length,
    skippedEquityCount: diff.skippedEquityProtected.length,
    setTrueEmails: successfulSetTrue,
    setFalseEmails: successfulSetFalse,
    missingEmails: diff.missingInAirtable.map((m) => m.email),
    duplicateEmails: diff.duplicatesInAirtable.map((d) => d.email),
    skippedEquityEmails: diff.skippedEquityProtected.map((s) => s.email),
    errorsCount,
    errors: errorMessages.length > 0 ? errorMessages : undefined,
  });

  console.log("--- Report (JSON, for cron email) ---");
  console.log(JSON.stringify(report, null, 2));

  try {
    await sendSyncReportEmail(report);
  } catch (err) {
    console.error("Email send failed:", err instanceof Error ? err.message : err);
  }

  if (errorsCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
