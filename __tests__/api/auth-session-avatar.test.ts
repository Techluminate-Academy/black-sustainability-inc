import { createMocks } from "node-mocks-http";

const mockSession = {
  email: "tester@example.com",
  mightyId: 42,
  firstName: "Test",
  lastName: "User",
};

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: jest.fn(() => mockSession),
}));

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue({ db: {} }),
}));

const mockBuildProfile = jest.fn();
jest.mock("@/lib/domain/members/memberSessionProfile.service", () => ({
  buildSessionMemberProfile: (...args: unknown[]) => mockBuildProfile(...args),
}));

describe("/api/auth/session avatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildProfile.mockResolvedValue({
      email: mockSession.email,
      mightyId: mockSession.mightyId,
      firstName: mockSession.firstName,
      lastName: mockSession.lastName,
      avatarUrl: "https://cdn.mn.co/avatar.jpg",
    });
  });

  it("returns Mighty avatar URL in profile.profilePhoto", async () => {
    const handler = (await import("@/pages/api/auth/session")).default;
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.authenticated).toBe(true);
    expect(body.user.profile.profilePhoto.url).toBe("https://cdn.mn.co/avatar.jpg");
  });
});
