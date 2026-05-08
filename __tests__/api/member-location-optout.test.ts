import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const mockUpdateOne = jest.fn(async () => ({ matchedCount: 1 }));

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: async () => ({
    db: {
      collection: () => ({
        updateOne: mockUpdateOne,
      }),
    },
  }),
}));

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: jest.fn(() => ({
    mightyId: 39285348,
    email: "jerry@techluminateacademy.com",
  })),
}));

const mockInvalidateMightyMemberCaches = jest.fn(async () => {});
jest.mock("@/lib/mightyCacheInvalidate", () => ({
  invalidateMightyMemberCaches: () => mockInvalidateMightyMemberCaches(),
}));

describe("/api/member/location-prompt-optout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401 when not authenticated", async () => {
    const { getBsnSessionFromReq } = await import("@/lib/bsnSession");
    (getBsnSessionFromReq as any).mockReturnValueOnce(null);

    const req = httpMocks.createRequest<NextApiRequest>({ method: "POST" });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member/location-prompt-optout")).default;

    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("sets opt-out flags in Mongo and busts cache", async () => {
    const req = httpMocks.createRequest<NextApiRequest>({ method: "POST" });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member/location-prompt-optout")).default;

    await handler(req, res);
    expect(res.statusCode).toBe(200);

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { mightyId: 39285348 },
      expect.objectContaining({
        $set: expect.objectContaining({
          locationPromptOptOut: true,
        }),
      }),
      { upsert: true }
    );

    await flushPromises();
    expect(mockInvalidateMightyMemberCaches).toHaveBeenCalled();
  });
});

