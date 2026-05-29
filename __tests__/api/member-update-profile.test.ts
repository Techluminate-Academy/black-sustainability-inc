import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: jest.fn(() => ({
    mightyId: 39285348,
    email: "jerry@example.com",
    firstName: "Jerry",
    lastName: "Bony",
  })),
  createBsnSessionToken: jest.fn(() => "test-token"),
  setBsnSessionCookie: jest.fn(),
}));

const mockUpdate = jest.fn(async () => ({
  firstName: "Jerry",
  lastName: "Smith",
  email: "jerry@example.com",
  photoUrl: "",
  location: null,
  organizationName: null,
  bio: "Updated",
  memberLevelLabel: null,
}));

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: async () => ({ db: {} }),
}));

jest.mock("@/lib/domain/members/memberProfileUpdate.service", () => ({
  MemberProfileUpdateError: class MemberProfileUpdateError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 400) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  updateMemberProfileFromSession: (...args: unknown[]) => mockUpdate(...args),
  sessionPayloadAfterProfileUpdate: jest.fn((_session, profile) => ({
    mightyId: 39285348,
    email: "jerry@example.com",
    firstName: profile.firstName,
    lastName: profile.lastName,
  })),
}));

describe("/api/member/update-profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401 when not authenticated", async () => {
    const { getBsnSessionFromReq } = await import("@/lib/bsnSession");
    (getBsnSessionFromReq as jest.Mock).mockReturnValueOnce(null);

    const req = httpMocks.createRequest<NextApiRequest>({
      method: "POST",
      body: { firstName: "A", lastName: "B" },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member/update-profile")).default;
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns updated profile on success", async () => {
    const req = httpMocks.createRequest<NextApiRequest>({
      method: "POST",
      body: { firstName: "Jerry", lastName: "Smith", bio: "Updated" },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member/update-profile")).default;
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.ok).toBe(true);
    expect(data.profile.bio).toBe("Updated");
    expect(mockUpdate).toHaveBeenCalled();
  });
});
