jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn(),
}));

import {
  inferDeactivatedFromMightyMember,
  isDeactivationWebhookEvent,
  resolveAccountStatusFromWebhook,
} from "@/lib/mightyMemberAccountStatus";
import {
  ACCOUNT_STATUS_DEACTIVATED,
  ACCOUNT_STATUS_ACTIVE,
  subscriptionStatusesIndicateDeactivated,
  airtableSubscriptionStatusesForMemberStatus,
} from "@/lib/domain/member/accountStatus";

describe("subscriptionStatuses deactivation", () => {
  it("detects deactivated in subscriptionStatuses", () => {
    expect(subscriptionStatusesIndicateDeactivated(["deactivated"])).toBe(true);
    expect(subscriptionStatusesIndicateDeactivated("active, deactivated")).toBe(true);
  });

  it("maps account status to airtable subscriptionStatuses values", () => {
    expect(airtableSubscriptionStatusesForMemberStatus(ACCOUNT_STATUS_DEACTIVATED)).toEqual([
      "deactivated",
    ]);
  });
});

describe("mightyMemberAccountStatus", () => {
  it("detects deactivation webhook events", () => {
    expect(isDeactivationWebhookEvent("MemberDeactivated")).toBe(true);
    expect(isDeactivationWebhookEvent("MemberUpdated")).toBe(false);
  });

  it("reads deactivated flag on member object", () => {
    expect(inferDeactivatedFromMightyMember({ deactivated: true })).toBe(true);
    expect(inferDeactivatedFromMightyMember({ status: "active" })).toBe(false);
  });

  it("resolves from event + member", () => {
    expect(
      resolveAccountStatusFromWebhook({
        eventType: "MemberDeactivated",
        member: null,
      })
    ).toBe(ACCOUNT_STATUS_DEACTIVATED);
    expect(
      resolveAccountStatusFromWebhook({
        eventType: "MemberUpdated",
        member: { status: "suspended" },
      })
    ).toBe(ACCOUNT_STATUS_DEACTIVATED);
  });
});
