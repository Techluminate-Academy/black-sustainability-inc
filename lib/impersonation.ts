import jwt from "jsonwebtoken";
import type { NextApiRequest } from "next";
import { getBsnSessionFromReq, parseCookieHeader } from "@/lib/bsnSession";

export const BSN_IMPERSONATE_COOKIE = "bsn_impersonate";

export type ImpersonationMode = "paid" | "unpaid";

type ImpersonationPayload = {
  email: string;
  mode: ImpersonationMode;
};

function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not configured");
  return s;
}

export function createImpersonationToken(payload: ImpersonationPayload): string {
  return jwt.sign(
    {
      email: String(payload.email).trim().toLowerCase(),
      mode: payload.mode,
    },
    getSessionSecret(),
    { expiresIn: "2h", algorithm: "HS256" }
  );
}

export function verifyImpersonationToken(token: string): ImpersonationPayload | null {
  try {
    const decoded = jwt.verify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload & Partial<ImpersonationPayload>;
    if (typeof decoded.email !== "string") return null;
    if (decoded.mode !== "paid" && decoded.mode !== "unpaid") return null;
    return { email: decoded.email.trim().toLowerCase(), mode: decoded.mode };
  } catch {
    return null;
  }
}

function parseAllowlist(): Set<string> {
  const raw = process.env.BSN_IMPERSONATE_ALLOWLIST || "";
  return new Set(
    raw
      .split(/[,\n]/g)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isImpersonationAllowedForEmail(email: string): boolean {
  const allow = parseAllowlist();
  if (!allow.size) return false;
  return allow.has(String(email).trim().toLowerCase());
}

export function getImpersonationModeFromReq(req: NextApiRequest): ImpersonationMode | null {
  const session = getBsnSessionFromReq(req);
  if (!session?.email) return null;
  if (!isImpersonationAllowedForEmail(session.email)) return null;

  const cookies = parseCookieHeader(req.headers?.cookie);
  const token = cookies[BSN_IMPERSONATE_COOKIE];
  if (!token) return null;

  const payload = verifyImpersonationToken(token);
  if (!payload) return null;
  if (payload.email !== session.email) return null;
  return payload.mode;
}

