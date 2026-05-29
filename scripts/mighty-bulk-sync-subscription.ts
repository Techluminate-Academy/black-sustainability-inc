/**
 * Sync subscription / paid map access from Airtable Mighty Members (+ Mighty plans when available)
 * into MongoDB `mightyMembers.subscription` and mirror back to Airtable.
 *
 * Authority:
 *   1. Airtable `Paid Subscription Status` / `Paid Subscription Active` / `Paid Subscription Plans`
 *   2. If blank, infer from Mighty Admin API member plans (optional MIGHTY_PAID_PLAN_IDS)
 *
 * Usage:
 *   npx tsx scripts/mighty-bulk-sync-subscription.ts
 *   npx tsx scripts/mighty-bulk-sync-subscription.ts --apply --limit 50
 *   npx tsx scripts/mighty-bulk-sync-subscription.ts --apply --offset 500 --limit 500
 *   npx tsx scripts/mighty-bulk-sync-subscription.ts --apply --email one@example.com
 *   npx tsx scripts/mighty-bulk-sync-subscription.ts --apply --no-mighty-api
 *   npx tsx scripts/mighty-bulk-sync-subscription.ts --apply --skip-cache
 */
import dotenv from "dotenv";

dotenv.config();

import {
  airtableEnabled,
  airtableSubscriptionRowIsDefinitive,
  fetchMightySyncRowsWithMemberId,
  upsertAirtableMightyMember,
} from "../lib/airtableMightyMembers";
import { listMemberPlans } from "../lib/mightyAdmin";
import {
  parseAirtableSubscriptionFields,
  resolveSubscriptionForMember,
  upsertMightyMemberSubscriptionInMongo,
} from "../lib/domain/billing/mightySubscriptionSync";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf("--limit");
  const offsetIdx = argv.indexOf("--offset");
  const emailIdx = argv.indexOf("--email");
  const sleepIdx = argv.indexOf("--sleep-ms");

  return {
    apply: argv.includes("--apply"),
    noMightyApi: argv.includes("--no-mighty-api"),
    skipCache: argv.includes("--skip-cache"),
    limit: limitIdx >= 0 && argv[limitIdx + 1] ? Math.max(1, parseInt(argv[limitIdx + 1]!, 10) || 0) : 0,
    offset: offsetIdx >= 0 && argv[offsetIdx + 1] ? Math.max(0, parseInt(argv[offsetIdx + 1]!, 10) || 0) : 0,
    email:
      emailIdx >= 0 && argv[emailIdx + 1]?.includes("@")
        ? argv[emailIdx + 1]!.trim().toLowerCase()
        : null,
    sleepMs:
      sleepIdx >= 0 && argv[sleepIdx + 1] ? Math.max(0, parseInt(argv[sleepIdx + 1]!, 10) || 0) : 50,
  };
}

async function main() {
  const args = parseArgs();

  if (!airtableEnabled()) {
    console.error("Airtable Mighty sync not configured.");
    process.exit(1);
  }

  let { rows } = await fetchMightySyncRowsWithMemberId();
  if (args.email) {
    rows = rows.filter((r) => (r.email ?? "").trim().toLowerCase() === args.email);
    if (!rows.length) {
      console.error(JSON.stringify({ error: "no_airtable_row_for_email", email: args.email }));
      process.exit(1);
    }
  }
  if (args.offset > 0) rows = rows.slice(args.offset);
  if (args.limit > 0) rows = rows.slice(0, args.limit);

  console.error(
    JSON.stringify({
      msg: "mighty_bulk_subscription_sync_start",
      mode: args.apply ? "apply" : "dry-run",
      rowCount: rows.length,
      noMightyApi: args.noMightyApi,
      limit: args.limit || null,
      offset: args.offset || null,
    })
  );

  let processed = 0;
  let paid = 0;
  let unpaid = 0;
  let mismatches = 0;
  let errors = 0;

  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email) continue;

    processed++;
    const airtable = parseAirtableSubscriptionFields({
      isPaidActive: row.isPaidActive,
      planNames: row.planNames,
      planIds: row.planIds,
      subscriptionStatuses: row.subscriptionStatuses,
    });

    let mightyPlans = null as Awaited<ReturnType<typeof listMemberPlans>> | null;
    let mightyFetched = false;
    const skipMightyForRow = args.noMightyApi || airtableSubscriptionRowIsDefinitive(row);
    if (!skipMightyForRow) {
      try {
        mightyPlans = await listMemberPlans(row.mightyId);
        mightyFetched = true;
      } catch (e) {
        console.log(
          JSON.stringify({
            action: "mighty_plans_error",
            email,
            mightyId: row.mightyId,
            error: e instanceof Error ? e.message : String(e),
          })
        );
      }
    }

    const resolved = resolveSubscriptionForMember({ airtable, mightyPlans, mightyFetched });
    if (resolved.isPaidActive) paid++;
    else unpaid++;
    if (resolved.note?.includes("differs")) mismatches++;

    const out = {
      action: args.apply ? "applied" : "would_apply",
      email,
      mightyId: row.mightyId,
      isPaidActive: resolved.isPaidActive,
      authority: resolved.authority,
      planNames: resolved.planNames,
      planIds: resolved.planIds,
      airtableIsPaidActive: row.isPaidActive,
      note: resolved.note,
      record_id: row.recordId,
    };

    if (args.apply) {
      try {
        await upsertMightyMemberSubscriptionInMongo({
          mightyId: row.mightyId,
          email,
          subscription: resolved,
        });
        await upsertAirtableMightyMember({
          mightyId: row.mightyId,
          email,
          firstName: row.firstName ?? undefined,
          lastName: row.lastName ?? undefined,
          subscription: {
            isPaidActive: resolved.isPaidActive,
            planNames: resolved.planNames,
            planIds: resolved.planIds,
            statuses: row.subscriptionStatuses,
            updatedAt: new Date().toISOString(),
          },
        });
        console.log(JSON.stringify(out));
      } catch (e) {
        errors++;
        console.log(
          JSON.stringify({
            action: "error",
            email,
            mightyId: row.mightyId,
            error: e instanceof Error ? e.message : String(e),
          })
        );
      }
    } else {
      console.log(JSON.stringify({ ...out, action: "would_apply" }));
    }

    await sleep(args.sleepMs);
  }

  if (args.apply && processed > 0 && !args.skipCache) {
    const { invalidateMightyMemberCaches } = await import("../lib/mightyCacheInvalidate");
    await invalidateMightyMemberCaches().catch(() => {});
  }

  console.error(
    JSON.stringify({
      msg: "mighty_bulk_subscription_sync_done",
      dryRun: !args.apply,
      processed,
      paid,
      unpaid,
      airtableMightyMismatches: mismatches,
      errors,
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
