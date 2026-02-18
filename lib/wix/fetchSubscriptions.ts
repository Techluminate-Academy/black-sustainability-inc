/**
 * Fetch Wix pricing plan orders (subscriptions) via API and map to WixSubscription format.
 * Resolves member emails via Members API.
 */
import type { WixSubscription } from "../reconciliation/wixAuthority";
import { createWixClient } from "./client";

/** Wix API returns enum-style values; map to formats expected by aggregateAuthorization. */
function mapStatus(value: string | undefined): string {
  if (!value) return "";
  const upper = value.toUpperCase();
  const statusMap: Record<string, string> = {
    ACTIVE: "Active",
    PAUSED: "Paused",
    ENDED: "Ended",
    CANCELED: "Canceled",
    PENDING: "Pending",
    DRAFT: "Draft",
  };
  return statusMap[upper] ?? value;
}

function mapPaymentStatus(value: string | undefined): string {
  if (!value) return "";
  const upper = value.toUpperCase();
  const paymentMap: Record<string, string> = {
    PAID: "Paid",
    UNPAID: "Unpaid",
    FAILED: "Failed",
    PENDING: "Pending",
    REFUNDED: "Refunded",
    NOT_APPLICABLE: "Not applicable",
  };
  return paymentMap[upper] ?? value;
}

/** Cache memberId -> { email, customerName } to avoid redundant API calls. */
const memberCache = new Map<
  string,
  { email: string | null; customerName?: string }
>();

async function getMemberDetails(
  client: ReturnType<typeof createWixClient>,
  memberId: string
): Promise<{ email: string | null; customerName?: string }> {
  const cached = memberCache.get(memberId);
  if (cached !== undefined) return cached;

  try {
    const member = await client.members.getMember(memberId);
    const email = member.loginEmail?.trim().toLowerCase() ?? null;
    const contact = member.contact as { firstName?: string; lastName?: string } | undefined;
    const parts: string[] = [];
    if (contact?.firstName) parts.push(contact.firstName);
    if (contact?.lastName) parts.push(contact.lastName);
    const customerName = parts.length > 0 ? parts.join(" ").trim() : undefined;
    const result = { email, customerName };
    memberCache.set(memberId, result);
    return result;
  } catch {
    memberCache.set(memberId, { email: null });
    return { email: null };
  }
}

/**
 * Fetch all pricing plan orders from Wix and convert to WixSubscription[].
 * Paginates through results (API returns max 50 per request).
 */
export async function fetchWixSubscriptionsFromApi(): Promise<WixSubscription[]> {
  const client = createWixClient();
  const result: WixSubscription[] = [];
  let offset = 0;
  const limit = 50;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await client.orders.managementListOrders({
      limit,
      offset,
      orderStatuses: [
        "ACTIVE",
        "PAUSED",
        "ENDED",
        "CANCELED",
        "PENDING",
        "DRAFT",
      ],
    });

    const orders = response.orders ?? [];
    if (orders.length === 0) break;

    for (const order of orders) {
      const memberId = order.buyer?.memberId;
      if (!memberId) continue;

      const { email, customerName } = await getMemberDetails(client, memberId);
      if (!email || !email.includes("@")) continue;

      result.push({
        email,
        subscriptionStatus: mapStatus(order.status),
        lastPaymentStatus: mapPaymentStatus(order.lastPaymentStatus),
        customerName: customerName || undefined,
        plan: order.planName ?? undefined,
      });
    }

    if (orders.length < limit) break;
    offset += limit;
  }

  return result;
}
