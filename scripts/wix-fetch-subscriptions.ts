/**
 * Fetch Wix subscriptions via API or CSV.
 * Use this script to verify the Wix integration and test your API key.
 *
 * With API key (env: WIX_API_KEY, WIX_SITE_ID, WIX_ACCOUNT_ID):
 *   npm run wix-fetch
 *
 * With CSV fallback:
 *   npx ts-node -r tsconfig-paths/register scripts/wix-fetch-subscriptions.ts --csv ./path/to/wix-subscriptions.csv
 *
 * Force CSV (skip API even if credentials exist):
 *   npx ts-node -r tsconfig-paths/register scripts/wix-fetch-subscriptions.ts --csv ./path/to/file.csv --csv-only
 */
import dotenv from "dotenv";
import path from "path";
import {
  fetchWixSubscriptionsFromApi,
  aggregateWixAuthority,
  writeWixAuthorityReports,
} from "../lib/wix";
import { loadWixSubscriptions } from "../lib/reconciliation/wixAuthority";
import { hasWixApiCredentials } from "../lib/wix/client";

dotenv.config();

const REPORTS_DIR = path.join(process.cwd(), "reports");

async function main() {
  const args = process.argv.slice(2);
  const csvOnly = args.includes("--csv-only");
  const csvIdx = args.indexOf("--csv");
  const csvPath =
    csvIdx >= 0 && args[csvIdx + 1]
      ? path.resolve(args[csvIdx + 1])
      : undefined;

  console.log("Wix Subscription Fetch\n");
  console.log("Credentials configured:", hasWixApiCredentials());

  if (csvOnly || !hasWixApiCredentials()) {
    if (!csvPath) {
      console.error(
        "Error: --csv <path> required when API credentials are not set or --csv-only is used."
      );
      process.exit(1);
    }
    console.log("Source: CSV (", csvPath, ")\n");
    const subs = await loadWixSubscriptions(csvPath);
    console.log(`Loaded ${subs.length} subscriptions from CSV`);
    if (subs.length > 0) {
      console.log("Sample:", JSON.stringify(subs[0], null, 2));
    }
    return;
  }

  try {
    const { subscriptions, rawRows, unresolvedRows } =
      await fetchWixSubscriptionsFromApi();

    const { byEmail, unresolved } = aggregateWixAuthority(rawRows);

    const authorizedCount = byEmail.filter((r) => r.authorized).length;
    const unauthorizedCount = byEmail.filter((r) => !r.authorized).length;

    // --- Summary metrics ---
    console.log("Source: api");
    console.log("\n--- Summary ---");
    console.log("rawRowsCount:", rawRows.length);
    console.log("uniqueEmailsCount:", byEmail.length);
    console.log("authorizedCount:", authorizedCount);
    console.log("unauthorizedCount:", unauthorizedCount);
    console.log("unresolvedCount:", unresolved.length);

    // By subscription status (from resolved rows)
    const byStatus = new Map<string, number>();
    const byPayment = new Map<string, number>();
    for (const s of subscriptions) {
      byStatus.set(s.subscriptionStatus, (byStatus.get(s.subscriptionStatus) ?? 0) + 1);
      byPayment.set(s.lastPaymentStatus, (byPayment.get(s.lastPaymentStatus) ?? 0) + 1);
    }
    console.log("\nBy subscription status:");
    for (const [status, count] of Array.from(byStatus.entries()).sort((a, b) => b[1]! - a[1]!)) {
      console.log(`  ${status}: ${count}`);
    }
    console.log("\nBy payment status:");
    for (const [status, count] of Array.from(byPayment.entries()).sort((a, b) => b[1]! - a[1]!)) {
      console.log(`  ${status}: ${count}`);
    }

    // Top 10 unresolved as warnings
    if (unresolved.length > 0) {
      console.log("\n--- WARNINGS: Top 10 unresolved (excluded from enforcement) ---");
      for (const row of unresolved.slice(0, 10)) {
        console.warn(
          `  orderId=${row.orderId} memberId=${row.memberId} plan=${row.plan ?? "-"} status=${row.subscriptionStatus}/${row.lastPaymentStatus} notes=${row.notes}`
        );
      }
      if (unresolved.length > 10) {
        console.warn(`  ... and ${unresolved.length - 10} more`);
      }
    }

    if (subscriptions.length > 0) {
      console.log("\nSample subscriptions (resolved):");
      for (const s of subscriptions.slice(0, 5)) {
        console.log(
          `  ${s.email} | ${s.subscriptionStatus} | ${s.lastPaymentStatus} | ${s.plan ?? "-"}`
        );
      }
    }

    // Write CSV reports
    const { aggregatedPath, unresolvedPath } = await writeWixAuthorityReports(
      REPORTS_DIR,
      byEmail,
      unresolved
    );
    console.log("\n--- Reports written ---");
    console.log("  ", aggregatedPath);
    console.log("  ", unresolvedPath);
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    if (csvPath) {
      console.log("\nFalling back to CSV...");
      const subs = await loadWixSubscriptions(csvPath);
      console.log(`Loaded ${subs.length} subscriptions from CSV`);
    } else {
      process.exit(1);
    }
  }
}

main();
