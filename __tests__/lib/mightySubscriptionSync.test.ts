jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn(),
}));

import {
  parseAirtableSubscriptionFields,
  resolveSubscriptionForMember,
} from "@/lib/domain/billing/mightySubscriptionSync";

describe("mightySubscriptionSync", () => {
  it("uses Airtable isPaidActive when set", () => {
    const r = resolveSubscriptionForMember({
      airtable: parseAirtableSubscriptionFields({ isPaidActive: true, planNames: ["Pro"] }),
      mightyPlans: null,
      mightyFetched: false,
    });
    expect(r.isPaidActive).toBe(true);
    expect(r.authority).toBe("airtable");
    expect(r.planNames).toContain("Pro");
  });

  it("falls back to Mighty plans when Airtable isPaidActive is blank", () => {
    const r = resolveSubscriptionForMember({
      airtable: parseAirtableSubscriptionFields({}),
      mightyPlans: [{ id: 99, name: "Member Plan" }],
      mightyFetched: true,
    });
    expect(r.isPaidActive).toBe(true);
    expect(r.authority).toBe("mighty");
  });

  it("treats Paid Subscription Status free as unpaid", () => {
    const r = resolveSubscriptionForMember({
      airtable: parseAirtableSubscriptionFields({
        isPaidActive: false,
        subscriptionStatuses: ["free"],
      }),
      mightyPlans: null,
      mightyFetched: false,
    });
    expect(r.isPaidActive).toBe(false);
    expect(r.authority).toBe("airtable");
  });

  it("defaults unpaid when neither Airtable nor Mighty data", () => {
    const r = resolveSubscriptionForMember({
      airtable: parseAirtableSubscriptionFields({}),
      mightyPlans: null,
      mightyFetched: false,
    });
    expect(r.isPaidActive).toBe(false);
    expect(r.authority).toBe("default_unpaid");
  });
});
