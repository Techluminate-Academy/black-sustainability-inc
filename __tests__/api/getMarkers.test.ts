import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";
import zlib from "zlib";
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

const wireMocks = (opts: {
  aggregateResult?: any[];
  cacheHit?: string | null;
  excludeMongoId?: any;
  excludeMightyId?: any;
}) => {
  const { connectToDatabase } = require("../../lib/mongodb");
  const redis = require("../../lib/redis").default;
  const { getExcludeViewerMighty } = require("../../lib/mapViewerGating");

  const collection = makeFakeCollection({
    aggregateResult: opts.aggregateResult ?? [],
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

const callHandler = async () => {
  const req = httpMocks.createRequest<NextApiRequest>({ method: "GET" });
  const res = httpMocks.createResponse<NextApiResponse>();
  const handler = (await import("@/pages/api/getMarkers")).default;
  await handler(req as any, res as any);
  return { req, res, body: res._getJSONData() };
};

describe("/api/getMarkers", () => {
  beforeEach(() => {
    jest.resetModules();
    capture = emptyCapture();
  });

  it("returns marker data fresh from Mongo and caches the compressed response on cache miss", async () => {
    const docs = [
      { id: "1", location: { type: "Point", coordinates: [-51.92, -14.23] } },
    ];
    wireMocks({ aggregateResult: docs });

    const { body } = await callHandler();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);

    expect(capture.redisGetKeys).toEqual(["map-locations:v9:mightyMembers"]);
    expect(capture.redisSetexCalls).toHaveLength(1);
    const cached = capture.redisSetexCalls[0];
    expect(cached.key).toBe("map-locations:v9:mightyMembers");
    expect(cached.ttl).toBeGreaterThan(0);

    // Cached value is base64(deflate(JSON.stringify(response)))
    const inflated = zlib
      .inflateSync(Buffer.from(cached.value, "base64"))
      .toString();
    expect(JSON.parse(inflated)).toEqual({ success: true, data: docs });
  });

  it("returns cached data verbatim on cache hit and never hits Mongo", async () => {
    const original = { success: true, data: [{ id: "cached" }] };
    const compressed = zlib.deflateSync(JSON.stringify(original)).toString("base64");
    wireMocks({ cacheHit: compressed });

    const { body } = await callHandler();

    expect(body).toEqual(original);
    expect(capture.aggregateCalls).toHaveLength(0);
  });

  it("includes a $match $nor stage in the aggregation when the viewer must be excluded", async () => {
    wireMocks({
      excludeMongoId: "viewer-id",
      excludeMightyId: 7,
      aggregateResult: [],
    });

    await callHandler();

    expect(capture.aggregateCalls).toHaveLength(1);
    const pipeline = capture.aggregateCalls[0];
    expect(pipeline[0]).toEqual({
      $match: { $nor: [{ _id: "viewer-id" }, { mightyId: 7 }] },
    });
  });

  it("coalesces legacy Airtable photo proxy into marker PHOTO when avatarUrl is empty", async () => {
    wireMocks({ aggregateResult: [] });

    await callHandler();

    const pipeline = capture.aggregateCalls[0];
    const addFields = pipeline.find((s: any) => s.$addFields?._mapPhotoUrl);
    expect(addFields).toBeDefined();
    const project = pipeline.find((s: any) => s.$project?.userphoto === "$_mapPhotoUrl");
    expect(project).toBeDefined();
    expect(project.$project.fields.PHOTO).toBeDefined();
    expect(project.$project.fields["Profile Photo URL"]).toBe("$_mapPhotoUrl");
  });

  it("projects FULL NAME, ORGANIZATION NAME, and LOGO for viewport-synced cards", async () => {
    wireMocks({ aggregateResult: [] });

    await callHandler();

    const pipeline = capture.aggregateCalls[0];
    const project = pipeline.find((s: any) => s.$project?.fields);
    expect(project).toBeDefined();
    expect(project.$project.fields["FULL NAME"]).toEqual({
      $trim: {
        input: {
          $concat: [
            { $ifNull: ["$firstName", ""] },
            " ",
            { $ifNull: ["$lastName", ""] },
          ],
        },
      },
    });
    expect(project.$project.fields["ORGANIZATION NAME"]).toEqual({
      $ifNull: ["$organizationName", ""],
    });
    expect(project.$project.fields.LOGO).toEqual({
      $cond: {
        if: {
          $isArray: {
            $getField: {
              field: "LOGO",
              input: { $ifNull: ["$fields", {}] },
            },
          },
        },
        then: {
          $getField: {
            field: "LOGO",
            input: { $ifNull: ["$fields", {}] },
          },
        },
        else: [],
      },
    });
  });

  it("always filters out documents missing latitude/longitude before projecting", async () => {
    wireMocks({ aggregateResult: [] });

    await callHandler();

    const pipeline = capture.aggregateCalls[0];
    const coordsMatch = pipeline.find(
      (s: any) =>
        s.$match &&
        s.$match.latitude &&
        s.$match.longitude &&
        s.$match.latitude.$ne === null
    );
    expect(coordsMatch).toBeDefined();
  });

  it("skips Redis when viewer is excluded (no cache reads or writes)", async () => {
    wireMocks({
      excludeMongoId: "viewer-id",
      aggregateResult: [],
    });

    await callHandler();

    expect(capture.redisGetKeys).toHaveLength(0);
    expect(capture.redisSetexCalls).toHaveLength(0);
  });

  it("adds a viewport bounds match stage and returns totalCount when bbox params are provided", async () => {
    wireMocks({ aggregateResult: [{ id: "1" }] });

    const req = httpMocks.createRequest<NextApiRequest>({
      method: "GET",
      query: {
        northEastLat: "40.0",
        northEastLng: "-70.0",
        southWestLat: "30.0",
        southWestLng: "-80.0",
      },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/getMarkers")).default;
    await handler(req as any, res as any);
    const body = res._getJSONData();

    expect(body.success).toBe(true);
    expect(body.totalCount).toBeDefined();
    expect(capture.redisGetKeys).toHaveLength(0);

    const pipeline = capture.aggregateCalls[0];
    const boundsMatch = pipeline.find(
      (s: any) =>
        s.$match &&
        s.$match.latitude?.$gte === 30 &&
        s.$match.latitude?.$lte === 40 &&
        s.$match.longitude?.$gte === -80 &&
        s.$match.longitude?.$lte === -70
    );
    expect(boundsMatch).toBeDefined();
  });
});
