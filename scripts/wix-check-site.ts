/**
 * Check which Wix site the API credentials point to.
 * Lists plans and raw order count to verify site identity.
 */
import dotenv from "dotenv";
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { orders, plans } from "@wix/pricing-plans";

dotenv.config();

async function main() {
  const apiKey = process.env.WIX_API_KEY?.trim();
  const siteId = process.env.WIX_SITE_ID?.trim();
  const accountId = process.env.WIX_ACCOUNT_ID?.trim();

  if (!apiKey || !siteId || !accountId) {
    console.error("Missing WIX_API_KEY, WIX_SITE_ID, or WIX_ACCOUNT_ID");
    process.exit(1);
  }

  const client = createClient({
    auth: ApiKeyStrategy({ apiKey, siteId, accountId }),
    modules: { orders, plans },
  });

  console.log("Configured credentials:");
  console.log("  Site ID:", siteId);
  console.log("  Account ID:", accountId);
  console.log("");

  try {
    // List plans (names like "EXPERT", "ENTITY" would match Black Sustainability)
    const plansRes = await client.plans.listPlans({});
    const planList = plansRes.plans ?? [];
    console.log("Plans found:", planList.length);
    for (const p of planList.slice(0, 10)) {
      console.log("  -", p.name ?? p._id);
    }
    if (planList.length > 10) console.log("  ... and", planList.length - 10, "more");

    // Raw orders (first page)
    const ordersRes = await client.orders.managementListOrders({ limit: 50, offset: 0 });
    const orderList = ordersRes.orders ?? [];
    console.log("\nOrders (first page):", orderList.length);
    if (orderList.length > 0) {
      const sample = orderList[0];
      console.log("  Sample order:", {
        planName: sample?.planName,
        status: sample?.status,
        hasBuyerMemberId: !!sample?.buyer?.memberId,
      });
    }
  } catch (err: unknown) {
    console.error("API error:", err instanceof Error ? err.message : err);
    if (err && typeof err === "object" && "details" in err) {
      console.error("Details:", JSON.stringify((err as { details?: unknown }).details, null, 2));
    }
  }
}

main();
