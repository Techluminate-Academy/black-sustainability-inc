import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";
import {
  emptyCapture,
  makeFakeCollection,
  makeFakeRedis,
  type Capture,
} from "../helpers/mockDb";

let capture: Capture;

jest.mock("../../lib/redis", () => ({
  __esModule: true,
  default: { get: jest.fn(), set: jest.fn(), setex: jest.fn() },
}));

jest.mock("../../lib/mongodb", () => ({
  connectToDatabase: jest.fn(),
}));

jest.mock("../../lib/mapViewerGating", () => ({
  getExcludeViewerMighty: jest.fn(async () => ({
    excludeMongoId: null,
    excludeMightyId: null,
  })),
}));

jest.mock("../../lib/mightyMemberAirtableShape", () => ({
  toAirtableishDoc: (d: any) => ({ id: String(d._id), fields: { "FIRST NAME": d.firstName ?? "" } }),
}));

const wireMocks = (opts: {
  findDocs?: any[];
  count?: number;
  cacheHit?: string | null;
  excludeMongoId?: any;
  excludeMightyId?: any;
}) => {
  const { connectToDatabase } = require("../../lib/mongodb");
  const redis = require("../../lib/redis").default;
  const { getExcludeViewerMighty } = require("../../lib/mapViewerGating");

  const collection = makeFakeCollection({
    findResult: { docs: opts.findDocs ?? [], count: opts.count ?? (opts.findDocs?.length ?? 0) },
    capture,
  });
  (connectToDatabase as jest.Mock).mockResolvedValue({
    db: { collection: () => collection },
  });

  const fakeRedis = makeFakeRedis({ capture, getResult: opts.cacheHit ?? null });
  redis.get.mockImplementation(fakeRedis.get);
  redis.setex.mockImplementation(fakeRedis.setex);

  (getExcludeViewerMighty as jest.Mock).mockResolvedValue({
    excludeMongoId: opts.excludeMongoId ?? null,
    excludeMightyId: opts.excludeMightyId ?? null,
  });
};

const callHandler = async (query: Record<string, any>) => {
  const req = httpMocks.createRequest<NextApiRequest>({ method: "GET", query });
  const res = httpMocks.createResponse<NextApiResponse>();
  const handler = (await import("@/pages/api/filterData")).default;
  await handler(req as any, res as any);
  return { req, res, body: res._getJSONData() };
};

describe("/api/filterData", () => {
  beforeEach(() => {
    jest.resetModules();
    capture = emptyCapture();
  });

  it("applies industry filter and includes both `industry` and legacy field paths in $or", async () => {
    wireMocks({ findDocs: [], count: 0 });

    await callHandler({ industryHouse: "🌾 Reparative Agriculture" });

    const q = capture.findCalls[0];
    expect(Array.isArray(q.$or)).toBe(true);
    const fields = new Set(q.$or.map((c: any) => Object.keys(c)[0]));
    expect(fields).toContain("industry");
    expect(fields).toContain("fields.PRIMARY INDUSTRY HOUSE");
  });

  it("returns no industry filter when industryHouse is empty", async () => {
    wireMocks({ findDocs: [], count: 0 });

    await callHandler({ industryHouse: "" });

    const q = capture.findCalls[0];
    expect(q.$or).toBeUndefined();
    expect(q.industry).toBeUndefined();
  });

  it("uses an industry-aware filterData cache key", async () => {
    wireMocks({ findDocs: [], count: 0 });

    await callHandler({ page: "2", limit: "10", industryHouse: "💧Water" });

    expect(capture.redisGetKeys[0]).toBe(
      "filterData:v8:primary-backfill:mightyMembers:💧Water:page=2:limit=10"
    );
  });

  it("excludes viewer via $nor and bypasses cache when impersonating unpaid", async () => {
    wireMocks({
      findDocs: [],
      count: 0,
      excludeMongoId: "viewer",
      excludeMightyId: 5,
    });

    await callHandler({ industryHouse: "" });

    const q = capture.findCalls[0];
    expect(q.$nor).toEqual([{ _id: "viewer" }, { mightyId: 5 }]);
    expect(capture.redisGetKeys).toHaveLength(0);
    expect(capture.redisSetexCalls).toHaveLength(0);
  });
});

describe("buildIndustryHouseQuery", () => {
  it("normalizes single string and array params", () => {
    const { normalizeIndustryHouseQueryParam } = require("../../lib/buildIndustryHouseQuery");
    expect(normalizeIndustryHouseQueryParam(undefined)).toBe("");
    expect(normalizeIndustryHouseQueryParam("  Water  ")).toBe("Water");
    expect(normalizeIndustryHouseQueryParam(["A", "B"])).toBe("A");
  });

  it("expands UI label to all known DB string variants for a known industry", () => {
    const { buildPrimaryIndustryHouseFilter } = require("../../lib/buildIndustryHouseQuery");
    const filter = buildPrimaryIndustryHouseFilter("☀️ Alternative Energy");
    expect(filter).not.toBeNull();
    const values = filter.$or
      .filter((c: any) => c.industry?.$in)
      .flatMap((c: any) => c.industry.$in);
    expect(values).toEqual(
      expect.arrayContaining(["☀️ Alternative Energy", "Alternative Renewable Energy"])
    );
  });

  it("falls back to a verbatim filter for unknown UI values", () => {
    const { buildPrimaryIndustryHouseFilter } = require("../../lib/buildIndustryHouseQuery");
    const filter = buildPrimaryIndustryHouseFilter("Some Custom Industry");
    expect(filter).not.toBeNull();
    const values = filter.$or
      .filter((c: any) => c.industry?.$in)
      .flatMap((c: any) => c.industry.$in);
    expect(values).toEqual(["Some Custom Industry"]);
  });

  it("returns null for empty/undefined industry", () => {
    const { buildPrimaryIndustryHouseFilter } = require("../../lib/buildIndustryHouseQuery");
    expect(buildPrimaryIndustryHouseFilter("")).toBeNull();
    expect(buildPrimaryIndustryHouseFilter(undefined)).toBeNull();
  });
});
