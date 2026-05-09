import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: async () => ({
    db: {
      collection: () => ({
        updateOne: jest.fn(async () => ({ matchedCount: 1 })),
      }),
    },
  }),
}));

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: jest.fn(() => ({
    mightyId: 39285348,
    email: "jerry@techluminateacademy.com",
    firstName: "Jerry",
    lastName: "Bony",
  })),
}));

const mockUpsertAirtableMightyMember = jest.fn(async () => ({ skipped: false }));
jest.mock("@/lib/airtableMightyMembers", () => ({
  upsertAirtableMightyMember: (...args: any[]) => mockUpsertAirtableMightyMember(...args),
}));

const mockUpsertMightyCustomFieldAnswer = jest.fn(async () => ({ ok: true }));
jest.mock("@/lib/mightyAdmin", () => ({
  upsertMightyCustomFieldAnswer: (...args: any[]) => mockUpsertMightyCustomFieldAnswer(...args),
}));

const mockInvalidateMightyMemberCaches = jest.fn(async () => {});
jest.mock("@/lib/mightyCacheInvalidate", () => ({
  invalidateMightyMemberCaches: () => mockInvalidateMightyMemberCaches(),
}));

describe("/api/member/update-location", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MIGHTY_MAP_LOCATION_CUSTOM_FIELD_ID = "1626958";
  });

  it("401 when not authenticated", async () => {
    const { getBsnSessionFromReq } = await import("@/lib/bsnSession");
    (getBsnSessionFromReq as any).mockReturnValueOnce(null);

    const req = httpMocks.createRequest<NextApiRequest>({
      method: "POST",
      body: { location: "Miami, FL, USA", latitude: 25.7, longitude: -80.1 },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member/update-location")).default;

    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("writes Mongo and triggers best-effort sync", async () => {
    const req = httpMocks.createRequest<NextApiRequest>({
      method: "POST",
      body: { location: "Miami, FL, USA", latitude: 25.7616, longitude: -80.1918 },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member/update-location")).default;

    await handler(req, res);
    expect(res.statusCode).toBe(200);

    await flushPromises();

    expect(mockUpsertAirtableMightyMember).toHaveBeenCalledWith(
      expect.objectContaining({
        mightyId: 39285348,
        email: "jerry@techluminateacademy.com",
        location: "Miami, FL, USA",
        latitude: 25.7616,
        longitude: -80.1918,
      })
    );

    expect(mockUpsertMightyCustomFieldAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        customFieldId: 1626958,
        mightyMemberId: 39285348,
        text: "Miami, FL, USA",
      })
    );

    expect(mockInvalidateMightyMemberCaches).toHaveBeenCalled();
  });
});

