/**
 * Impersonation API must be unreachable in production unless explicitly enabled.
 */
import handler from "@/pages/api/test/impersonate";
import type { NextApiRequest, NextApiResponse } from "next";

function mockReqRes(method: string, body?: object) {
  const req = {
    method,
    headers: { cookie: "" },
    body: body ?? {},
  } as unknown as NextApiRequest;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();
  const res = { status, setHeader, json } as unknown as NextApiResponse;
  return { req, res, json, status };
}

describe("pages/api/test/impersonate production guard", () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origAllow = process.env.BSN_IMPERSONATE_ALLOW_PRODUCTION;

  afterEach(() => {
    process.env.NODE_ENV = origNodeEnv;
    if (origAllow === undefined) delete process.env.BSN_IMPERSONATE_ALLOW_PRODUCTION;
    else process.env.BSN_IMPERSONATE_ALLOW_PRODUCTION = origAllow;
  });

  it("returns 404 in production when BSN_IMPERSONATE_ALLOW_PRODUCTION is not 1", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.BSN_IMPERSONATE_ALLOW_PRODUCTION;
    const { req, res, status, json } = mockReqRes("POST", { mode: "paid" });
    await handler(req, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it("allows POST past guard in development", async () => {
    process.env.NODE_ENV = "development";
    const { req, res, status } = mockReqRes("POST", { mode: "paid" });
    await handler(req, res);
    expect(status).not.toHaveBeenCalledWith(404);
  });
});
