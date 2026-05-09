/**
 * Fetch Wix pricing plan orders (subscriptions) via API and map to WixSubscription format.
 * Resolves member emails via Members API. Does NOT discard orders when email cannot be resolved
 * — those go to unresolvedRows for audit/safety (never used for deauthorization).
 */
import type { WixSubscription } from "../reconciliation/wixAuthority";
import type { WixSubscriptionRaw } from "./types";
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
    FREE_TRIAL: "Free trial",
    TRIAL: "Free trial",
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

/** Extract purchaser/contact email from order form submission if present. */
function extractPurchaserEmailFromOrder(order: {
  formData?: { submissionData?: Record<string, unknown> } | null;
}): string | null {
  const data = order.formData?.submissionData;
  if (!data || typeof data !== "object") return null;
  const keys = ["email", "Email", "emailAddress", "EMAIL ADDRESS", "Email Address"];
  for (const k of keys) {
    const val = (data as Record<string, unknown>)[k];
    if (typeof val === "string" && val.trim().includes("@")) {
      return val.trim();
    }
  }
  return null;
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
    const member = await client.members.getMember(memberId, { fieldsets: ["FULL"] });
    const loginEmail = member.loginEmail?.trim().toLowerCase();
    const contactEmails = (member.contact as { emails?: string[] } | undefined)?.emails;
    const contactEmail = Array.isArray(contactEmails) ? contactEmails[0] : undefined;
    const email = loginEmail || contactEmail?.trim().toLowerCase() || null;
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

export type FetchWixSubscriptionsResult = {
  /** Resolved rows with valid email — safe for Airtable enforcement. */
  subscriptions: WixSubscription[];
  /** Raw rows including unresolved (email=null) for audit/reporting. Never used for deauthorization. */
  rawRows: WixSubscriptionRaw[];
  /** Rows where email could not be resolved — excluded from enforcement. */
  unresolvedRows: WixSubscriptionRaw[];
};

/**
 * Fetch all pricing plan orders from Wix. Does NOT discard orders when email cannot be resolved.
 * Unresolved rows go to unresolvedRows for audit; they are never used to mark anyone unauthorized.
 */
export async function fetchWixSubscriptionsFromApi(): Promise<FetchWixSubscriptionsResult> {
  const client = createWixClient();
  const rawRows: WixSubscriptionRaw[] = [];
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

    const orderList = response.orders ?? [];
    if (orderList.length === 0) break;

    for (let i = 0; i < orderList.length; i++) {
      const order = orderList[i]!;
      const orderId = (order as { id?: string; _id?: string }).id ?? (order as { id?: string; _id?: string })._id ?? "";
      const memberId = order.buyer?.memberId ?? "";
      const purchaserEmailFromOrder = extractPurchaserEmailFromOrder(order);
      const subscriptionStatus = mapStatus(order.status);
      const lastPaymentStatus = mapPaymentStatus(order.lastPaymentStatus);
      const plan = order.planName ?? undefined;

      if (!memberId) {
        rawRows.push({
          orderId,
          memberId: "",
          email: null,
          subscriptionStatus,
          lastPaymentStatus,
          plan,
          purchaserEmailFromOrder: purchaserEmailFromOrder || undefined,
          notes: "no memberId",
        });
        continue;
      }

      const { email, customerName } = await getMemberDetails(client, memberId);
      const validEmail =
        email && typeof email === "string" && email.includes("@")
          ? email.trim().toLowerCase()
          : null;

      const raw: WixSubscriptionRaw = {
        orderId,
        memberId,
        email: validEmail,
        customerName: customerName || undefined,
        subscriptionStatus,
        lastPaymentStatus,
        plan,
        purchaserEmailFromOrder: purchaserEmailFromOrder || undefined,
        notes: validEmail ? undefined : "member lookup failed or no email",
      };

      rawRows.push(raw);
    }

    if (orderList.length < limit) break;
    offset += limit;
  }

  const subscriptions: WixSubscription[] = [];
  const unresolvedRows: WixSubscriptionRaw[] = [];

  for (const r of rawRows) {
    if (r.email) {
      subscriptions.push({
        email: r.email,
        subscriptionStatus: r.subscriptionStatus,
        lastPaymentStatus: r.lastPaymentStatus,
        customerName: r.customerName,
        plan: r.plan,
      });
    } else {
      unresolvedRows.push(r);
    }
  }

  return { subscriptions, rawRows, unresolvedRows };
}
