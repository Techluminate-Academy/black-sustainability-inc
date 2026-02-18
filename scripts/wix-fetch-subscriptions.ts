/**
 * Fetch Wix subscriptions via API or CSV.
 * Use this script to verify the Wix integration and test your API key.
 *
 * With API key (env: WIX_API_KEY, WIX_SITE_ID, WIX_ACCOUNT_ID):
 *   npx ts-node -r tsconfig-paths/register scripts/wix-fetch-subscriptions.ts
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
  loadWixSubscriptionsFromSource,
  loadWixSubscriptions,
} from "../lib/reconciliation/wixAuthority";
import { hasWixApiCredentials } from "../lib/wix/client";

dotenv.config();

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
    const { subscriptions, source } = await loadWixSubscriptionsFromSource({
      csvPath,
      preferApi: true,
    });
    console.log(`Source: ${source}`);
    console.log(`Loaded ${subscriptions.length} subscriptions`);
    if (subscriptions.length > 0) {
      console.log("Sample:", JSON.stringify(subscriptions[0], null, 2));
    }
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
