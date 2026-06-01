/**
 * Sync Wix-authorized (paying) members → MongoDB mightyMembers + Airtable Mighty Members.
 * Wix is transitional billing authority; map access uses Mongo subscription.isPaidActive.
 *
 * Usage:
 *   npx tsx scripts/wix-sync-paid-status.ts
 *   npx tsx scripts/wix-sync-paid-status.ts --apply
 *   npx tsx scripts/wix-sync-paid-status.ts --apply --csv ./wix-export.csv
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config();

import { aggregateAuthorizations } from "../lib/billing/aggregateAuthorization";
import { syncWixAuthorizationToMightySystems } from "../lib/domain/billing/wixPaidSync";
import { loadWixSubscriptionsFromSource } from "../lib/reconciliation/wixAuthority";

function parseArgs() {
  const argv = process.argv.slice(2);
  const csvIdx = argv.indexOf("--csv");
  return {
    apply: argv.includes("--apply"),
    csvPath: csvIdx >= 0 && argv[csvIdx + 1] ? path.resolve(process.cwd(), argv[csvIdx + 1]!) : undefined,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs();

  const { subscriptions, source } = await loadWixSubscriptionsFromSource({
    csvPath: args.csvPath,
    preferApi: true,
  });
  const authorizations = aggregateAuthorizations(subscriptions);
  const wixAuthorized = authorizations.filter((a) => a.authorized);

  console.error(
    JSON.stringify({
      msg: "wix_paid_sync_start",
      mode: args.apply ? "apply" : "dry-run",
      wixSource: source,
      wixSubscriptions: subscriptions.length,
      wixUniqueEmails: authorizations.length,
      wixAuthorized: wixAuthorized.length,
    })
  );

  let applied = 0;
  let wouldApply = 0;
  let skipped = 0;
  let errors = 0;
  const missingAirtable: string[] = [];

  for (const auth of wixAuthorized) {
    const result = await syncWixAuthorizationToMightySystems({ auth, apply: args.apply });
    console.log(JSON.stringify(result));

    if (result.action === "applied") {
      applied++;
      if (result.reason === "no_airtable_mighty_members_row") missingAirtable.push(result.email);
    } else if (result.action === "would_apply") wouldApply++;
    else if (result.action === "skipped") skipped++;
    else if (result.action === "error") errors++;

    await sleep(100);
  }

  console.error(
    JSON.stringify({
      msg: "wix_paid_sync_done",
      dryRun: !args.apply,
      wixAuthorized: wixAuthorized.length,
      applied,
      wouldApply,
      skipped,
      errors,
      missingAirtableMightyMembersRow: missingAirtable.length,
      missingAirtableEmails: missingAirtable,
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
