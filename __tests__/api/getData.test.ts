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
  const handler = (await import("@/pages/api/getData")).default;
  await handler(req as any, res as any);
  return { req, res, body: res._getJSONData() };
};

describe("/api/getData", () => {
  beforeEach(() => {
    jest.resetModules();
    capture = emptyCapture();
  });

  it("paginates correctly and reports totalPages based on totalCount", async () => {
    wireMocks({ findDocs: [], count: 137 });

    const { body } = await callHandler({ page: "2", limit: "50" });

    expect(body.page).toBe(2);
    expect(body.limit).toBe(50);
    expect(body.totalCount).toBe(137);
    expect(body.totalPages).toBe(3);
  });

  it("falls back to page=1 limit=50 when query params are missing or invalid", async () => {
    wireMocks({ findDocs: [], count: 0 });

    const { body } = await callHandler({});

    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
  });

  it("applies industry-house filter via $or when industryHouse is supplied", async () => {
    wireMocks({ findDocs: [], count: 0 });

    await callHandler({ industryHouse: "☀️ Alternative Energy" });

    expect(capture.findCalls).toHaveLength(1);
    const q = capture.findCalls[0];
    expect(Array.isArray(q.$or)).toBe(true);
    // Should query both `industry` and the legacy field
    const fields = new Set(q.$or.map((c: any) => Object.keys(c)[0]));
    expect(fields).toContain("industry");
    expect(fields).toContain("fields.PRIMARY INDUSTRY HOUSE");
  });

  it("adds $nor when viewer must be excluded", async () => {
    wireMocks({
      findDocs: [],
      count: 0,
      excludeMongoId: "viewer",
      excludeMightyId: 99,
    });

    await callHandler({ page: "1" });

    const q = capture.findCalls[0];
    expect(q.$nor).toEqual([{ _id: "viewer" }, { mightyId: 99 }]);
  });

  it("uses an industry- and pagination-aware Redis cache key", async () => {
    wireMocks({ findDocs: [], count: 0 });

    await callHandler({ page: "3", limit: "25", industryHouse: "💧Water" });

    expect(capture.redisGetKeys).toHaveLength(1);
    const key = capture.redisGetKeys[0];
    expect(key).toBe(
      "getData:v8:primary-backfill:mightyMembers:💧Water:page=3:limit=25"
    );
  });

  it("serves cached data when present and skips Mongo entirely", async () => {
    wireMocks({
      findDocs: [{ _id: "x" }],
      cacheHit: '{"success":true,"page":1,"limit":50,"totalPages":1,"totalCount":1,"data":[]}',
    });

    await callHandler({ page: "1", limit: "50" });

    expect(capture.findCalls).toHaveLength(0);
    expect(capture.countCalls).toHaveLength(0);
  });

  it("bypasses cache entirely when viewer is excluded", async () => {
    wireMocks({
      findDocs: [],
      count: 0,
      excludeMongoId: "viewer",
    });

    await callHandler({ page: "1" });

    expect(capture.redisGetKeys).toHaveLength(0);
    expect(capture.redisSetexCalls).toHaveLength(0);
  });
});
