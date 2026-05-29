import { createMocks } from "node-mocks-http";

const mockSession = {
  email: "jerry@example.com",
  mightyId: 99,
  firstName: "Jerry",
  lastName: "Bony",
};

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: jest.fn(() => mockSession),
}));

const mockGetMemberMapProfileView = jest.fn();
jest.mock("@/lib/domain/members/memberMapProfileView.service", () => ({
  getMemberMapProfileView: (...args: unknown[]) => mockGetMemberMapProfileView(...args),
}));

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue({ db: {} }),
}));

describe("/api/member/map-profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMemberMapProfileView.mockResolvedValue({
      firstName: "Jerry",
      lastName: "Bony",
      email: "jerry@example.com",
      photoUrl: "https://cdn.example/avatar.jpg",
      location: "New York, NY, USA",
      organizationName: "Tech Co",
      bio: "Builder",
      memberLevelLabel: "👓 Enthusiast -Excited to Learn",
    });
  });

  it("returns 405 for non-GET", async () => {
    const handler = (await import("@/pages/api/member/map-profile")).default;
    const { req, res } = createMocks({ method: "POST" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it("returns 401 when not authenticated", async () => {
    const { getBsnSessionFromReq } = await import("@/lib/bsnSession");
    (getBsnSessionFromReq as jest.Mock).mockReturnValueOnce(null);

    const handler = (await import("@/pages/api/member/map-profile")).default;
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it("returns profile for authenticated session", async () => {
    const handler = (await import("@/pages/api/member/map-profile")).default;
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.ok).toBe(true);
    expect(body.profile.email).toBe("jerry@example.com");
    expect(body.profile.location).toBe("New York, NY, USA");
    expect(body.profile.memberLevelLabel).toContain("Enthusiast");
    expect(mockGetMemberMapProfileView).toHaveBeenCalled();
  });
});
