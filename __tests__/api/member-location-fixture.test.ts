import { createMocks } from "node-mocks-http";

const mockClear = jest.fn().mockResolvedValue(true);
const mockSetLocation = jest.fn().mockResolvedValue(true);
const mockSetOptOut = jest.fn().mockResolvedValue(true);
const mockInvalidate = jest.fn().mockResolvedValue({ totalDeleted: 1 });

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue({ db: {} }),
}));

jest.mock("@/lib/domain/location/memberLocationFixture.service", () => ({
  clearMemberLocationForTest: (...args: unknown[]) => mockClear(...args),
  setMemberTestLocationForTest: (...args: unknown[]) => mockSetLocation(...args),
  setMemberLocationOptOutForTest: (...args: unknown[]) => mockSetOptOut(...args),
}));

jest.mock("@/lib/mightyCacheInvalidate", () => ({
  invalidateMightyMemberCaches: () => mockInvalidate(),
}));

describe("/api/test/member-location-fixture", () => {
  const prevEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...prevEnv,
      NODE_ENV: "test",
      E2E_TEST_ENABLED: "1",
      E2E_TEST_SECRET: "test-secret",
      E2E_TEST_EMAIL_ALLOWLIST: "jerry@techluminateacademy.com",
    };
  });

  afterAll(() => {
    process.env = prevEnv;
  });

  it("rejects wrong secret", async () => {
    const handler = (await import("@/pages/api/test/member-location-fixture")).default;
    const { req, res } = createMocks({
      method: "POST",
      body: {
        secret: "wrong",
        email: "jerry@techluminateacademy.com",
        action: "clearLocation",
      },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it("clears location for allowlisted email", async () => {
    const handler = (await import("@/pages/api/test/member-location-fixture")).default;
    const { req, res } = createMocks({
      method: "POST",
      body: {
        secret: "test-secret",
        email: "jerry@techluminateacademy.com",
        action: "clearLocation",
      },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(mockClear).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalled();
  });
});
