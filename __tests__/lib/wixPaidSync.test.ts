jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn(),
}));

import { resolvedSubscriptionFromWix } from "@/lib/domain/billing/wixPaidSync";

describe("wixPaidSync", () => {
  it("builds paid subscription from Wix authorization", () => {
    const sub = resolvedSubscriptionFromWix({
      email: "a@b.com",
      authorized: true,
      sourceSubscriptions: [
        {
          email: "a@b.com",
          subscriptionStatus: "Active",
          lastPaymentStatus: "Paid",
          plan: "Enthusiast",
        },
      ],
      memberLevel: "Enthusiast",
    });
    expect(sub.isPaidActive).toBe(true);
    expect(sub.authority).toBe("wix");
    expect(sub.planNames).toContain("Enthusiast");
  });
});
