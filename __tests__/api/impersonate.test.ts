import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: jest.fn(() => ({ email: "tester@example.com", mightyId: 1 })),
}));

jest.mock("@/lib/impersonation", () => ({
  BSN_IMPERSONATE_COOKIE: "bsn_impersonate",
  createImpersonationToken: () => "signed-token",
  isImpersonationAllowedForEmail: (email: string) => email === "tester@example.com",
}));

describe("/api/test/impersonate", () => {
  beforeEach(() => {
    process.env.BSN_IMPERSONATE_SECRET = "secret";
  });

  it("sets cookie when authorized", async () => {
    const req = httpMocks.createRequest<NextApiRequest>({
      method: "POST",
      body: { mode: "paid", secret: "secret" },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/test/impersonate")).default;

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.getHeader("Set-Cookie")).toEqual(expect.stringContaining("bsn_impersonate="));
  });

  it("rejects wrong secret", async () => {
    const req = httpMocks.createRequest<NextApiRequest>({
      method: "POST",
      body: { mode: "paid", secret: "nope" },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/test/impersonate")).default;

    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });
});

