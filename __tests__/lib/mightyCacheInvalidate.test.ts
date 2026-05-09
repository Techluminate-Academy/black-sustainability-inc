/**
 * Tests for `lib/mightyCacheInvalidate.ts`.
 *
 * After every successful Mighty webhook upsert, this function must bust the
 * Redis caches that drive the public list/map/search APIs — otherwise users
 * see stale profiles and stale map markers until the TTL expires.
 *
 * The exact key shapes here MUST stay in sync with:
 *   pages/api/getMarkers.js  →  map-locations:v5:mightyMembers
 *   pages/api/getData.js     →  getData:v8:primary-backfill:mightyMembers:*
 *   pages/api/filterData.js  →  filterData:v8:primary-backfill:mightyMembers:*
 *   pages/api/searchData.js  →  search:v3:mightyMembers:*
 */

const mockDel = jest.fn();
const mockScan = jest.fn();

jest.mock("@/lib/redis", () => ({
  __esModule: true,
  default: {
    del: (...args: any[]) => mockDel(...args),
    scan: (...args: any[]) => mockScan(...args),
  },
}));

const importModule = async () => {
  jest.resetModules();
  return await import("@/lib/mightyCacheInvalidate");
};

beforeEach(() => {
  mockDel.mockReset();
  mockScan.mockReset();
});

describe("invalidateMightyMemberCaches — fixed keys", () => {
  it("deletes the well-known map-locations key on every invocation", async () => {
    mockDel.mockResolvedValue(1);
    mockScan.mockResolvedValue(["0", []]); // empty cursor immediately

    const { invalidateMightyMemberCaches } = await importModule();
    const result = await invalidateMightyMemberCaches();

    // First del call is the FIXED_KEYS group
    const firstCall = mockDel.mock.calls[0];
    expect(firstCall).toEqual(["map-locations:v5:mightyMembers"]);
    expect(result.totalDeleted).toBeGreaterThanOrEqual(1);
  });
});

describe("invalidateMightyMemberCaches — pattern scans", () => {
  it("scans for all three known patterns in the right shape (MATCH ... COUNT)", async () => {
    mockDel.mockResolvedValue(0);
    mockScan.mockResolvedValue(["0", []]); // every scan returns empty

    const { invalidateMightyMemberCaches } = await importModule();
    await invalidateMightyMemberCaches();

    const patterns = mockScan.mock.calls.map((c) => c[2]).sort();
    expect(patterns).toEqual([
      "filterData:v8:primary-backfill:mightyMembers:*",
      "getData:v8:primary-backfill:mightyMembers:*",
      "search:v3:mightyMembers:*",
    ]);

    // Each scan call has the form: scan(cursor, "MATCH", pattern, "COUNT", N)
    for (const call of mockScan.mock.calls) {
      expect(call[0]).toBe("0"); // initial cursor
      expect(call[1]).toBe("MATCH");
      expect(call[3]).toBe("COUNT");
      expect(typeof call[4]).toBe("number");
      expect(call[4]).toBeGreaterThan(0);
    }
  });

  it("deletes every batch of keys returned by SCAN and counts them all", async () => {
    // FIXED_KEYS del returns 1 (driver reports one key removed).
    // Pattern dels return whatever — the function counts keys.length, not the
    // del response, for SCAN-driven deletes.
    mockDel.mockResolvedValue(1);
    mockScan.mockImplementation(async (_cursor: string, _m: string, pattern: string) => {
      return ["0", [`${pattern.replace(":*", "")}:k1`, `${pattern.replace(":*", "")}:k2`]];
    });

    const { invalidateMightyMemberCaches } = await importModule();
    const result = await invalidateMightyMemberCaches();

    // 1 fixed-key del call + 3 pattern del calls = 4 total
    expect(mockDel).toHaveBeenCalledTimes(4);
    // FIXED_KEYS del response (1) + 3 patterns × 2 keys.length each = 7
    expect(result.totalDeleted).toBe(1 + 3 * 2);
  });

  it("iterates SCAN until the cursor returns to '0' (handles multi-page results)", async () => {
    mockDel.mockResolvedValue(1);

    // For the search pattern, return 2 pages then terminate. Other patterns: empty.
    const callsByPattern: Record<string, number> = {};
    mockScan.mockImplementation(async (cursor: string, _m: string, pattern: string) => {
      callsByPattern[pattern] = (callsByPattern[pattern] || 0) + 1;
      if (pattern === "search:v3:mightyMembers:*") {
        if (cursor === "0") return ["42", ["search:v3:mightyMembers:a"]];
        if (cursor === "42") return ["7", ["search:v3:mightyMembers:b"]];
        return ["0", ["search:v3:mightyMembers:c"]];
      }
      return ["0", []];
    });

    const { invalidateMightyMemberCaches } = await importModule();
    const result = await invalidateMightyMemberCaches();

    // Search pattern was scanned 3 times before cursor returned to "0"
    expect(callsByPattern["search:v3:mightyMembers:*"]).toBe(3);
    // FIXED_KEYS (1) + 3 search keys deleted = 4 total
    expect(result.totalDeleted).toBe(1 + 3);
  });

  it("does NOT call del when a SCAN page returns no keys", async () => {
    mockDel.mockResolvedValue(0);
    mockScan.mockResolvedValue(["0", []]);

    const { invalidateMightyMemberCaches } = await importModule();
    await invalidateMightyMemberCaches();

    // Only the FIXED_KEYS del call should have run; no pattern-batch deletes.
    expect(mockDel).toHaveBeenCalledTimes(1);
  });
});

describe("invalidateMightyMemberCaches — error resilience", () => {
  it("continues with the remaining patterns when one pattern's SCAN throws", async () => {
    mockDel.mockResolvedValue(1);

    // getData pattern errors; the other two should still be processed.
    const seenPatterns: string[] = [];
    mockScan.mockImplementation(async (_cursor: string, _m: string, pattern: string) => {
      seenPatterns.push(pattern);
      if (pattern === "getData:v8:primary-backfill:mightyMembers:*") {
        throw new Error("redis offline");
      }
      return ["0", [`${pattern.replace(":*", "")}:hit`]];
    });

    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { invalidateMightyMemberCaches } = await importModule();
    const result = await invalidateMightyMemberCaches();

    // Three patterns were attempted (failure didn't abort the loop)
    expect(seenPatterns).toEqual(
      expect.arrayContaining([
        "filterData:v8:primary-backfill:mightyMembers:*",
        "getData:v8:primary-backfill:mightyMembers:*",
        "search:v3:mightyMembers:*",
      ])
    );
    // FIXED_KEYS (1) + 2 successful pattern hits = 3 deleted
    expect(result.totalDeleted).toBe(3);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[mighty cache invalidate] pattern failed:"),
      "getData:v8:primary-backfill:mightyMembers:*",
      expect.any(String)
    );

    warn.mockRestore();
  });

  it("returns gracefully when the FIXED_KEYS del rejects (top-level error is non-fatal)", async () => {
    mockDel.mockRejectedValue(new Error("redis exploded"));
    mockScan.mockResolvedValue(["0", []]);

    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { invalidateMightyMemberCaches } = await importModule();
    const result = await invalidateMightyMemberCaches();

    expect(result).toEqual({ totalDeleted: 0 });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[mighty cache invalidate] non-fatal error:"),
      expect.any(String)
    );

    warn.mockRestore();
  });

  it("treats a non-numeric del response as 0 deletions (defensive against driver weirdness)", async () => {
    mockDel.mockResolvedValueOnce(undefined); // FIXED_KEYS del returns undefined
    mockScan.mockResolvedValue(["0", []]);

    const { invalidateMightyMemberCaches } = await importModule();
    const result = await invalidateMightyMemberCaches();

    expect(result.totalDeleted).toBe(0);
  });
});
