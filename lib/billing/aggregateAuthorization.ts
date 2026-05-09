import type { WixSubscription } from "../reconciliation/wixAuthority";

export type MemberAuthorization = {
  email: string;
  authorized: boolean;
  sourceSubscriptions: WixSubscription[];
  fullName?: string;
  memberLevel?: string;
};

function subscriptionIsAuthorized(sub: WixSubscription): boolean {
  const status = sub.subscriptionStatus;
  const payment = sub.lastPaymentStatus;

  if (status === "Free trial") {
    return true;
  }
  if (status === "Active" && (payment === "Paid" || payment === "Pending")) {
    return true;
  }
  return false;
}

export function aggregateAuthorizations(
  subscriptions: WixSubscription[]
): MemberAuthorization[] {
  const byEmail = new Map<string, WixSubscription[]>();

  for (const sub of subscriptions) {
    const email = sub.email;
    const existing = byEmail.get(email) ?? [];
    existing.push(sub);
    byEmail.set(email, existing);
  }

  const result: MemberAuthorization[] = [];

  for (const [email, subs] of Array.from(byEmail.entries())) {
    const authorized = subs.some(subscriptionIsAuthorized);
    const fullName = subs.map((s) => s.customerName).find(Boolean);
    const memberLevel = subs.map((s) => s.plan).find(Boolean);
    result.push({
      email,
      authorized,
      sourceSubscriptions: subs,
      fullName,
      memberLevel,
    });
  }

  return result;
}
