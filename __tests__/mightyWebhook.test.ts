import { buildMightyWebhookDedupeKey, getBearerToken } from "../lib/mightyWebhook";

const mockedMongoCollection = {
  findOne: jest.fn(async () => null),
  updateOne: jest.fn(async () => ({})),
};

const mockedWebhookEventsCollection = {
  updateOne: jest.fn(async () => ({ upsertedCount: 1, matchedCount: 0 })),
};

jest.mock("../lib/mongodb", () => ({
  connectToDatabase: async () => ({
    db: {
      collection: (name: string) =>
        name === "mightyWebhookEvents" ? mockedWebhookEventsCollection : mockedMongoCollection,
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

describe("buildMightyWebhookDedupeKey", () => {
  it("differs by event type for the same upstream id", () => {
    const base = { event_id: "up_1", member: { id: 1, email: "a@b.co" } };
    const k1 = buildMightyWebhookDedupeKey({ ...base, type: "MemberUpdated" } as any);
    const k2 = buildMightyWebhookDedupeKey({
      ...base,
      type: "MemberSubscriptionRenewed",
    } as any);
    expect(k1).not.toBe(k2);
    expect(k1).toContain("MemberUpdated");
    expect(k2).toContain("MemberSubscriptionRenewed");
  });

  it("includes member and space scope when present", () => {
    const k = buildMightyWebhookDedupeKey({
      type: "MemberJoined",
      event_id: "e1",
      member_id: 42,
      space: { id: "space_9" },
    } as any);
    expect(k).toContain("m:42");
    expect(k).toContain("s:space_9");
  });
});

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
  beforeEach(() => {
    mockedWebhookEventsCollection.updateOne.mockReset();
    mockedWebhookEventsCollection.updateOne.mockResolvedValue({
      upsertedCount: 1,
      matchedCount: 0,
    });
    mockedMongoCollection.findOne.mockReset();
    mockedMongoCollection.findOne.mockResolvedValue(null);
    mockedMongoCollection.updateOne.mockClear();
  });

  it("handles partial payload by fetching member", async () => {
    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");
    const { fetchMightyMemberById } = await import("../lib/mightyAdmin");

    let claimN = 0;
    mockedWebhookEventsCollection.updateOne.mockImplementation(async () => {
      claimN += 1;
      return claimN === 1
        ? { upsertedCount: 1, matchedCount: 0 }
        : { upsertedCount: 0, matchedCount: 1 };
    });

    const payload = {
      type: "MemberUpdated",
      event_id: "evt_1",
      created_at: "2026-01-01T00:00:00Z",
      member_id: 123,
    };

    const r1 = await upsertMightyMemberFromWebhook(payload);
    const r2 = await upsertMightyMemberFromWebhook(payload);

    expect(r1.matchedBy).toBe("mightyId");
    expect(r1.member.email).toBe("test@example.com");
    expect(r2.deduped).toBe(true);
    expect((fetchMightyMemberById as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not dedupe different event types that share the same event id", async () => {
    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");

    mockedWebhookEventsCollection.updateOne.mockResolvedValue({
      upsertedCount: 1,
      matchedCount: 0,
    });

    const base = {
      event_id: "shared_upstream_1",
      created_at: "2026-01-01T00:00:00Z",
      member: {
        id: 123,
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
      },
    };

    const r1 = await upsertMightyMemberFromWebhook({ ...base, type: "MemberUpdated" } as any);
    const r2 = await upsertMightyMemberFromWebhook({
      ...base,
      type: "MemberSubscriptionRenewed",
    } as any);

    expect(r1.deduped).toBeUndefined();
    expect(r2.deduped).toBeUndefined();
    expect(mockedWebhookEventsCollection.updateOne).toHaveBeenCalledTimes(2);
    expect(mockedWebhookEventsCollection.updateOne.mock.calls[0][0].dedupeKey).not.toBe(
      mockedWebhookEventsCollection.updateOne.mock.calls[1][0].dedupeKey
    );
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

  it("unwraps Mighty envelope (event_type + payload as member)", async () => {
    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");
    const { fetchMightyMemberById } = await import("../lib/mightyAdmin");

    (fetchMightyMemberById as any).mockClear();

    const body = {
      event_id: "evt_mighty_1",
      event_type: "MemberUpdated",
      event_timestamp: "2026-01-15T12:00:00.000Z",
      payload: {
        id: 999,
        email: "envelope@example.com",
        first_name: "Env",
        last_name: "Lope",
      },
    };

    const r = await upsertMightyMemberFromWebhook(body);
    expect((fetchMightyMemberById as any).mock.calls.length).toBe(0);
    expect(r.matchedBy).toBe("mightyId");
    expect(r.member.email).toBe("envelope@example.com");
  });

  it("does not overwrite member:self-update location/coords", async () => {
    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");
    mockedMongoCollection.findOne.mockResolvedValueOnce({
      source: "member:self-update",
      memberLocationUpdatedAt: new Date("2026-05-07T00:00:10Z"),
      updatedAt: new Date(),
    });
    mockedMongoCollection.updateOne.mockClear();

    const payload = {
      type: "MemberUpdated",
      id: "evt_2",
      created_at: "2026-01-01T00:00:00Z",
      member: {
        id: 123,
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        location: "Rio de Janeiro, Brazil",
        latitude: -22.9,
        longitude: -43.2,
      },
    };

    await upsertMightyMemberFromWebhook(payload as any);

    const update = mockedMongoCollection.updateOne.mock.calls[0][1];
    expect(update?.$set?.location).toBeUndefined();
    expect(update?.$set?.latitude).toBeUndefined();
    expect(update?.$set?.longitude).toBeUndefined();
    expect(update?.$set?.geo).toBeUndefined();
  });

  it("does not overwrite location when self-update timestamp is newer than webhook event", async () => {
    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");
    mockedMongoCollection.findOne.mockResolvedValueOnce({
      source: "mighty:webhook",
      memberLocationUpdatedAt: new Date("2026-05-07T00:00:10Z"),
    });
    mockedMongoCollection.updateOne.mockClear();

    const payload = {
      type: "MemberUpdated",
      id: "evt_3",
      created_at: "2026-05-07T00:00:00Z",
      member: {
        id: 123,
        email: "test@example.com",
        location: "Old Place",
        latitude: 1,
        longitude: 2,
      },
    };

    await upsertMightyMemberFromWebhook(payload as any);

    const update = mockedMongoCollection.updateOne.mock.calls[0][1];
    expect(update?.$set?.location).toBeUndefined();
    expect(update?.$set?.latitude).toBeUndefined();
    expect(update?.$set?.longitude).toBeUndefined();
    expect(update?.$set?.geo).toBeUndefined();
  });

  it("uses Map Location custom field text to update location (even if event is newer)", async () => {
    process.env.MIGHTY_MAP_LOCATION_CUSTOM_FIELD_ID = "1626958";

    const { upsertMightyMemberFromWebhook } = await import("../lib/mightyWebhook");
    mockedMongoCollection.findOne.mockResolvedValueOnce({
      source: "mighty:webhook",
      memberLocationUpdatedAt: new Date("2026-05-07T00:00:00Z"),
    });
    mockedMongoCollection.updateOne.mockClear();

    const payload = {
      type: "CustomFieldResponseUpdatedHook",
      id: "evt_cf_1",
      created_at: "2026-05-07T00:00:10Z",
      member: {
        id: 123,
        email: "test@example.com",
        location: "Rio de Janeiro, Brazil",
      },
      custom_field_id: 1626958,
      text: "Canada",
    };

    await upsertMightyMemberFromWebhook(payload as any);
    const update = mockedMongoCollection.updateOne.mock.calls[0][1];
    expect(update?.$set?.location).toBe("Canada");
  });
});

