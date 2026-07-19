import {
  classifyMightyToAirtableError,
  filterRowsNeedingMightySync,
  normalizeAirtableSelectOption,
  startOfUtcDayMs,
} from "@/lib/domain/sync/mightyToAirtableSyncHelpers";

describe("mightyToAirtableMemberSync", () => {
  it("removes accidental wrapping quotes from Render select values", () => {
    expect(normalizeAirtableSelectOption('"Mighty Not Found"')).toBe("Mighty Not Found");
    expect(normalizeAirtableSelectOption('\"\"Mighty Not Found\"\"')).toBe("Mighty Not Found");
  });
  it("classifies rate limit errors", () => {
    expect(classifyMightyToAirtableError(new Error("Mighty Admin API member fetch failed (429): Rate limit"))).toBe(
      "rate_limit"
    );
  });

  it("classifies not found errors", () => {
    expect(
      classifyMightyToAirtableError(new Error('Mighty Admin API member fetch failed (404): Couldn\'t find User'))
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
});
