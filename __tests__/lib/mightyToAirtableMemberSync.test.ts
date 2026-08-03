import {
  classifyMightyToAirtableError,
  filterRowsNeedingMightySync,
  normalizeAirtableSelectOption,
  selectDeltaSyncCandidates,
  startOfUtcDayMs,
} from "@/lib/domain/sync/mightyToAirtableSyncHelpers";

describe("mightyToAirtableMemberSync", () => {
  it("removes accidental wrapping quotes from Render select values", () => {
    expect(normalizeAirtableSelectOption('"Mighty Not Found"')).toBe("Mighty Not Found");
    expect(normalizeAirtableSelectOption('""Mighty Not Found""')).toBe("Mighty Not Found");
  });

  it("classifies rate limit errors", () => {
    expect(classifyMightyToAirtableError(new Error("Mighty Admin API member fetch failed (429): Rate limit"))).toBe(
      "rate_limit"
    );
  });

  it("classifies not found errors", () => {
    expect(
      classifyMightyToAirtableError(new Error("Mighty Admin API member fetch failed (404): Couldn't find User"))
    ).toBe("not_found");
  });

  it("filters rows not synced since start of UTC day", () => {
    const rows = [
      {
        recordId: "rec1",
        email: "a@b.com",
        firstName: null,
        lastName: null,
        mightyId: 1,
        isPaidActive: null,
        planNames: [],
        planIds: [],
        subscriptionStatuses: [],
        paidSubscriptionStatus: null,
        lastSyncDate: "2026-05-06T15:51:32.123Z",
      },
      {
        recordId: "rec2",
        email: "b@b.com",
        firstName: null,
        lastName: null,
        mightyId: 2,
        isPaidActive: null,
        planNames: [],
        planIds: [],
        subscriptionStatuses: [],
        paidSubscriptionStatus: null,
        lastSyncDate: "2026-06-03T22:00:00.000Z",
      },
    ];
    const stale = filterRowsNeedingMightySync(rows, startOfUtcDayMs(new Date("2026-06-03T12:00:00.000Z")));
    expect(stale.map((r) => r.mightyId)).toEqual([1]);
  });

  it("selects changed, new, missing sync date, and oldest safety rows", () => {
    const { candidates, stats } = selectDeltaSyncCandidates({
      safetyBatchSize: 1,
      mightyMembers: [
        { mightyId: 1, email: "changed@example.com", updatedAt: "2026-08-03T12:00:00.000Z" },
        { mightyId: 2, email: "fresh@example.com", updatedAt: "2026-08-01T12:00:00.000Z" },
        { mightyId: 3, email: "new@example.com", updatedAt: "2026-08-03T10:00:00.000Z" },
        { mightyId: 4, email: "nosync@example.com", updatedAt: "2026-08-02T10:00:00.000Z" },
      ],
      airtableRows: [
        {
          recordId: "rec1",
          email: "changed@example.com",
          firstName: null,
          lastName: null,
          mightyId: 1,
          isPaidActive: null,
          planNames: [],
          planIds: [],
          subscriptionStatuses: [],
          paidSubscriptionStatus: null,
          lastSyncDate: "2026-08-02T12:00:00.000Z",
        },
        {
          recordId: "rec2",
          email: "fresh@example.com",
          firstName: null,
          lastName: null,
          mightyId: 2,
          isPaidActive: null,
          planNames: [],
          planIds: [],
          subscriptionStatuses: [],
          paidSubscriptionStatus: null,
          lastSyncDate: "2026-08-02T18:00:00.000Z",
        },
        {
          recordId: "rec4",
          email: "nosync@example.com",
          firstName: null,
          lastName: null,
          mightyId: 4,
          isPaidActive: null,
          planNames: [],
          planIds: [],
          subscriptionStatuses: [],
          paidSubscriptionStatus: null,
          lastSyncDate: null,
        },
        {
          recordId: "rec5",
          email: "old@example.com",
          firstName: null,
          lastName: null,
          mightyId: 5,
          isPaidActive: null,
          planNames: [],
          planIds: [],
          subscriptionStatuses: [],
          paidSubscriptionStatus: null,
          lastSyncDate: "2026-07-01T00:00:00.000Z",
        },
      ],
    });

    expect(stats).toMatchObject({
      mightyDiscovered: 4,
      airtableWithId: 4,
      changed: 1,
      newMembers: 1,
      missingSyncDate: 1,
      safety: 1,
      selected: 4,
    });
    expect(candidates.map((c) => ({ id: c.mightyId, reason: c.reason }))).toEqual([
      { id: 1, reason: "changed" },
      { id: 3, reason: "new" },
      { id: 4, reason: "missing_sync_date" },
      { id: 5, reason: "safety" },
    ]);
  });
});
