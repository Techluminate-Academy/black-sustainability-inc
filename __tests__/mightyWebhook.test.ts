import { getBearerToken } from "../lib/mightyWebhook";

jest.mock("../lib/mongodb", () => ({
  connectToDatabase: async () => ({
    db: {
      collection: () => ({
        updateOne: jest.fn(async () => ({})),
      }),
    },
  }),
}));

jest.mock("../lib/mightyAdmin", () => ({
  fetchMightyMemberById: jest.fn(async () => ({
    id: 123,
    email: "Test@Example.com",
    first_name: "Test",
    last_name: "User",
    avatar_url: "https://example.com/a.png",
  })),
}));

jest.mock("../lib/airtableMightyMembers", () => ({
  upsertAirtableMightyMember: jest.fn(async () => ({ skipped: false, action: "updated", recordId: "rec1" })),
}));

describe("getBearerToken", () => {
  it("returns null when missing/invalid", () => {
    expect(getBearerToken(undefined)).toBeNull();
    expect(getBearerToken("Basic abc")).toBeNull();
  });

  it("extracts bearer token", () => {
    expect(getBearerToken("Bearer abc123")).toBe("abc123");
    expect(getBearerToken("bearer abc123")).toBe("abc123");
    expect(getBearerToken("Bearer   abc123 ")).toBe("abc123");
  });
});

describe("upsertMightyMemberFromWebhook", () => {
  it("handles partial payload by fetching member", async () => {
    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");
    const { fetchMightyMemberById } = await import("../lib/mightyAdmin");

    const payload = {
      type: "MemberUpdated",
      id: "evt_1",
      created_at: "2026-01-01T00:00:00Z",
      member_id: 123,
    };

    const r1 = await upsertMightyMemberFromWebhook(payload);
    const r2 = await upsertMightyMemberFromWebhook(payload); // idempotent: should not throw

    expect(r1.matchedBy).toBe("mightyId");
    expect(r2.matchedBy).toBe("mightyId");
    expect(r1.member.email).toBe("test@example.com");
    expect((fetchMightyMemberById as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not fetch when payload includes member object", async () => {
    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");
    const { fetchMightyMemberById } = await import("../lib/mightyAdmin");

    (fetchMightyMemberById as any).mockClear?.();

    const payload = {
      type: "MemberSubscriptionRenewed",
      member: {
        id: 456,
        email: "renewed@example.com",
        first_name: "Re",
        last_name: "Newed",
      },
      plan: { id: "plan_1", name: "Gold" },
    };

    const r = await upsertMightyMemberFromWebhook(payload);
    expect(r.matchedBy).toBe("mightyId");
    expect((fetchMightyMemberById as any).mock.calls.length).toBe(0);
    expect(r.subscription.isPaidActive).toBe(true);
  });
});

