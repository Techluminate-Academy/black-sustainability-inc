import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";
import handler from "@/pages/api/auth/login";
import { mightyGetMemberByEmail } from "@/lib/mightyAdmin";
import { findAirtableMightyMemberByEmail } from "@/lib/airtableMightyMembers";

jest.mock("@/lib/mightyAdmin", () => ({ mightyGetMemberByEmail: jest.fn() }));
jest.mock("@/lib/airtableMightyMembers", () => ({ findAirtableMightyMemberByEmail: jest.fn() }));
jest.mock("@/lib/bsnSession", () => ({
  BSN_SESSION_COOKIE: "bsn_session",
  createBsnSessionToken: jest.fn(() => "session-token"),
}));

async function login(email: unknown) {
  const req = httpMocks.createRequest<NextApiRequest>({ method: "POST", body: { email } });
  const res = httpMocks.createResponse<NextApiResponse>();
  await handler(req, res);
  return res;
}

describe("email-only member login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("signs in a Mighty member using only a normalized email", async () => {
    (mightyGetMemberByEmail as jest.Mock).mockResolvedValue({ id: 123, email: "member@example.com" });
    const res = await login(" Member@Example.com ");
    expect(mightyGetMemberByEmail).toHaveBeenCalledWith("member@example.com");
    expect(res.statusCode).toBe(200);
    expect(res.getHeader("Set-Cookie")).toEqual(expect.stringContaining("bsn_session=session-token"));
    expect(res.getHeader("Set-Cookie")).toEqual(expect.stringContaining("HttpOnly"));
  });

  it("signs in through the Airtable membership fallback without a password", async () => {
    (mightyGetMemberByEmail as jest.Mock).mockResolvedValue(null);
    (findAirtableMightyMemberByEmail as jest.Mock).mockResolvedValue({ mightyId: 123, email: "member@example.com" });
    const res = await login("member@example.com");
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().source).toBe("airtable");
    expect(res.getHeader("Set-Cookie")).toBeDefined();
  });

  it("rejects an unknown member without issuing a session", async () => {
    (mightyGetMemberByEmail as jest.Mock).mockResolvedValue(null);
    (findAirtableMightyMemberByEmail as jest.Mock).mockResolvedValue(null);
    const res = await login("unknown@example.com");
    expect(res.statusCode).toBe(401);
    expect(res.getHeader("Set-Cookie")).toBeUndefined();
  });

  it("rejects an invalid email before looking up membership", async () => {
    const res = await login(123);
    expect(res.statusCode).toBe(400);
    expect(mightyGetMemberByEmail).not.toHaveBeenCalled();
  });
});
