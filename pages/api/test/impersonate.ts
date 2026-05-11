import type { NextApiRequest, NextApiResponse } from "next";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import {
  BSN_IMPERSONATE_COOKIE,
  createImpersonationToken,
  isImpersonationAllowedForEmail,
  type ImpersonationMode,
} from "@/lib/impersonation";

function getSecret(): string | null {
  const s = process.env.BSN_IMPERSONATE_SECRET;
  return s ? s : null;
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function setCookie(res: NextApiResponse, value: string | null) {
  const parts = [
    `${BSN_IMPERSONATE_COOKIE}=${value ? encodeURIComponent(value) : ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (value) parts.push("Max-Age=7200");
  else parts.push("Max-Age=0");
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (process.env.NODE_ENV === "production" && process.env.BSN_IMPERSONATE_ALLOW_PRODUCTION !== "1") {
    return res.status(404).json({ ok: false, error: "Not found" });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) return res.status(401).json({ ok: false, error: "Not authenticated" });
  if (!isImpersonationAllowedForEmail(session.email)) {
    return res.status(403).json({ ok: false, error: "Not allowed" });
  }

  // Two valid auth paths:
  //   1. Session-based (browser/UI): allowlisted email + valid bsn_session is sufficient.
  //      The session cookie is HttpOnly + SameSite=Lax, so cross-site fetches won't carry it.
  //   2. Secret-based (curl/scripts): pass `secret` in the body. Required when there is no session
  //      cookie OR when the caller explicitly provides a (possibly wrong) secret to validate.
  const incomingSecret = typeof req.body?.secret === "string" ? req.body.secret : "";
  if (incomingSecret) {
    const expected = getSecret();
    if (!expected || !constantTimeEquals(incomingSecret, expected)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  }

  const modeRaw = typeof req.body?.mode === "string" ? req.body.mode : "";
  const mode = modeRaw === "paid" || modeRaw === "unpaid" ? (modeRaw as ImpersonationMode) : null;
  const clear = modeRaw === "clear";

  if (!mode && !clear) {
    return res.status(400).json({ ok: false, error: "mode must be paid|unpaid|clear" });
  }

  if (clear) {
    setCookie(res, null);
    return res.status(200).json({ ok: true, mode: null });
  }

  const token = createImpersonationToken({ email: session.email, mode: mode! });
  setCookie(res, token);
  return res.status(200).json({ ok: true, mode });
}

