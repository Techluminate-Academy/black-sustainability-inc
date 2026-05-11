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
  cacheHit?: string | null;
  excludeMongoId?: any;
  excludeMightyId?: any;
}) => {
  const { connectToDatabase } = require("../../lib/mongodb");
  const redis = require("../../lib/redis").default;
  const { getExcludeViewerMighty } = require("../../lib/mapViewerGating");

  const collection = makeFakeCollection({
    findResult: { docs: opts.findDocs ?? [] },
    capture,
  });
  (connectToDatabase as jest.Mock).mockResolvedValue({
    db: { collection: () => collection },
  });

  const fakeRedis = makeFakeRedis({ capture, getResult: opts.cacheHit ?? null });
  redis.get.mockImplementation(fakeRedis.get);
  redis.set.mockImplementation(fakeRedis.set);
  redis.setex.mockImplementation(fakeRedis.setex);

  (getExcludeViewerMighty as jest.Mock).mockResolvedValue({
    excludeMongoId: opts.excludeMongoId ?? null,
    excludeMightyId: opts.excludeMightyId ?? null,
  });
};

const callHandler = async (query: Record<string, any>) => {
  const req = httpMocks.createRequest<NextApiRequest>({ method: "GET", query });
  const res = httpMocks.createResponse<NextApiResponse>();
  const handler = (await import("@/pages/api/searchData")).default;
  await handler(req as any, res as any);
  return { req, res, body: res._getJSONData() };
};

describe("/api/searchData", () => {
  beforeEach(() => {
    jest.resetModules();
    capture = emptyCapture();
  });

  it("applies a hard limit of 500 to the find cursor", async () => {
    wireMocks({ findDocs: [] });
    await callHandler({ q: "test" });
    expect(capture.findLimits).toEqual([500]);
  });

  it("builds a single $or with regexes across all searched fields for a one-word query", async () => {
    wireMocks({ findDocs: [{ _id: "a", firstName: "Jerry" }] });

    await callHandler({ q: "Jerry" });

    expect(capture.findCalls).toHaveLength(1);
    const q = capture.findCalls[0];
    expect(q.$or).toBeDefined();
    expect(q.$and).toBeUndefined();
    const fields = q.$or.map((c: any) => Object.keys(c)[0]);
    expect(fields).toEqual([
      "firstName",
      "lastName",
      "email",
      "industry",
      "location",
      "bio",
    ]);
    for (const cond of q.$or) {
      const re = Object.values(cond)[0] as RegExp;
      expect(re).toBeInstanceOf(RegExp);
      expect(re.flags).toContain("i");
      expect(re.source.toLowerCase()).toBe("jerry");
    }
  });

  it("tokenizes a multi-word query into $and of $ors so 'Jerry Bony' matches firstName=Jerry AND lastName=Bony", async () => {
    wireMocks({
      findDocs: [
        { _id: "1", firstName: "Jerry", lastName: "Bony", email: "jerry@x" },
        { _id: "2", firstName: "Jerry", lastName: "Bony", email: "jerrybony5@x" },
      ],
    });

    const { body } = await callHandler({ q: "Jerry Bony" });

    expect(body.success).toBe(true);
    expect(body.totalCount).toBe(2);

    const q = capture.findCalls[0];
    expect(q.$or).toBeUndefined();
    expect(Array.isArray(q.$and)).toBe(true);
    expect(q.$and).toHaveLength(2);
    const tokenSources = q.$and.map(
      (clause: any) => (Object.values(clause.$or[0])[0] as RegExp).source
    );
    expect(tokenSources).toEqual(["Jerry", "Bony"]);
  });

  it("escapes regex metacharacters in the query so '.' isn't treated as 'any character'", async () => {
    wireMocks({ findDocs: [] });

    await callHandler({ q: "j.bony" });

    const q = capture.findCalls[0];
    const re = Object.values(q.$or[0])[0] as RegExp;
    // Escaped form of "j.bony" -> "j\.bony"
    expect(re.source).toBe("j\\.bony");
  });

  it("caps tokens at 5 to prevent unbounded queries", async () => {
    wireMocks({ findDocs: [] });

    await callHandler({ q: "a b c d e f g" });

    const q = capture.findCalls[0];
    expect(q.$and).toHaveLength(5);
  });

  it("excludes the viewer's own record via $nor when getExcludeViewerMighty returns ids", async () => {
    wireMocks({
      findDocs: [],
      excludeMongoId: "viewer-mongo-id",
      excludeMightyId: 12345,
    });

    await callHandler({ q: "Jerry" });

    const q = capture.findCalls[0];
    expect(q.$nor).toEqual([{ _id: "viewer-mongo-id" }, { mightyId: 12345 }]);
  });

  it("does NOT add $nor when impersonating paid (gating returns nulls)", async () => {
    wireMocks({ findDocs: [] });

    await callHandler({ q: "Jerry" });

    const q = capture.findCalls[0];
    expect(q.$nor).toBeUndefined();
  });

  it("bypasses Redis cache when viewer is excluded (so unpaid users always get fresh queries)", async () => {
    wireMocks({
      findDocs: [],
      excludeMongoId: "viewer",
      cacheHit: '{"success":true,"totalCount":99,"data":[]}',
    });

    await callHandler({ q: "Jerry" });

    expect(capture.redisGetKeys).toHaveLength(0);
    expect(capture.redisSetCalls).toHaveLength(0);
  });

  it("serves from Redis cache when viewer is not excluded and a cached value exists", async () => {
    wireMocks({
      findDocs: [],
      cacheHit: '{"success":true,"totalCount":42,"data":[]}',
    });

    const { body } = await callHandler({ q: "Jerry" });

    expect(body.totalCount).toBe(42);
    expect(capture.findCalls).toHaveLength(0); // mongo never called on cache hit
    expect(capture.redisGetKeys).toHaveLength(1);
  });
});
