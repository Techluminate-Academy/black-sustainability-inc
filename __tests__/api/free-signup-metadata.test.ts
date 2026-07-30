import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";
import { FALLBACK_INDUSTRY_FIELD_METADATA } from "@/constants/industry-house-options";

jest.mock("@/lib/server/airtableFreeSignupServer", () => ({
  fetchFreeSignupTableFieldMetadata: jest.fn(),
}));

jest.mock("@/lib/server/fixedWindowRateLimit", () => ({
  envPositiveInt: jest.fn((_name: string, fallback: number) => fallback),
  respondIfRateLimited: jest.fn().mockResolvedValue(false),
}));

const fetchMetadata = jest.requireMock(
  "@/lib/server/airtableFreeSignupServer"
).fetchFreeSignupTableFieldMetadata as jest.Mock;

async function callHandler() {
  const req = httpMocks.createRequest<NextApiRequest>({ method: "GET" });
  const res = httpMocks.createResponse<NextApiResponse>();
  const handler = (await import("@/pages/api/airtable/free-signup-metadata")).default;
  await handler(req, res);
  return res;
}

describe("/api/airtable/free-signup-metadata", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("replaces newer Airtable Industry House choices with the official list", async () => {
    const metadata = [
      {
        fieldName: "PRIMARY INDUSTRY HOUSE",
        fieldType: "singleSelect",
        options: [{ id: "1", name: "☀️ Alternative Energy", icon: null }],
      },
    ];
    fetchMetadata.mockResolvedValueOnce(metadata);

    const res = await callHandler();

    expect(res.statusCode).toBe(200);
    expect(res.getHeader("X-BSN-Metadata-Source")).toBe("canonical-industry");
    expect(res._getJSONData()).toEqual([FALLBACK_INDUSTRY_FIELD_METADATA]);
    const names = FALLBACK_INDUSTRY_FIELD_METADATA.options.map((option) => option.name);
    expect(names.filter((name) => name === "🌾 Reparative Agriculture")).toHaveLength(1);
    expect(names).not.toContain(
      "🌾 Agriculture/Sustainable Food Production / Land Management"
    );
  });

  it("injects fallback Industry House options when Airtable returns none", async () => {
    const metadata = [
      { fieldName: "PRIMARY INDUSTRY HOUSE", fieldType: "singleSelect", options: [] },
      { fieldName: "GENDER", fieldType: "singleSelect", options: [{ id: "g", name: "Female", icon: null }] },
    ];
    fetchMetadata.mockResolvedValueOnce(metadata);

    const res = await callHandler();

    expect(res.statusCode).toBe(200);
    expect(res.getHeader("X-BSN-Metadata-Source")).toBe("canonical-industry");
    const body = res._getJSONData();
    expect(body[0]).toEqual(FALLBACK_INDUSTRY_FIELD_METADATA);
    expect(body[0].options.length).toBeGreaterThan(0);
    expect(body).toContainEqual(metadata[1]);
  });

  it("returns usable Industry House options when Airtable metadata fails", async () => {
    fetchMetadata.mockRejectedValueOnce(new Error("schema access denied"));

    const res = await callHandler();

    expect(res.statusCode).toBe(200);
    expect(res.getHeader("X-BSN-Metadata-Source")).toBe("fallback");
    expect(res._getJSONData()).toEqual([FALLBACK_INDUSTRY_FIELD_METADATA]);
    expect(FALLBACK_INDUSTRY_FIELD_METADATA.options.length).toBeGreaterThan(0);
  });
});
