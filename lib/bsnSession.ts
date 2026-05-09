import jwt from "jsonwebtoken";
import type { NextApiRequest } from "next";

export const BSN_SESSION_COOKIE = "bsn_session";

export type BsnSessionPayload = {
  email: string;
  mightyId: number;
  firstName?: string | null;
  lastName?: string | null;
};

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not configured");
  return s;
}

export function createBsnSessionToken(payload: BsnSessionPayload): string {
  const email = String(payload.email).trim().toLowerCase();
  return jwt.sign(
    {
      email,
      mightyId: payload.mightyId,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
    },
    getSecret(),
    { expiresIn: "30d", algorithm: "HS256" }
  );
}

export function verifyBsnSessionToken(token: string): BsnSessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload & Partial<BsnSessionPayload>;
    if (
      typeof decoded.email !== "string" ||
      typeof decoded.mightyId !== "number"
    ) {
      return null;
    }
    return {
      email: decoded.email.trim().toLowerCase(),
      mightyId: decoded.mightyId,
      firstName: decoded.firstName ?? null,
      lastName: decoded.lastName ?? null,
    };
  } catch {
    return null;
  }
}

export function parseCookieHeader(
  cookieHeader: string | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

/** Read and verify `bsn_session` from a Pages API request (or any request with Cookie header). */
export function getBsnSessionFromReq(
  req: NextApiRequest | { headers?: { cookie?: string } }
): BsnSessionPayload | null {
  const raw = req.headers?.cookie;
  const cookies = parseCookieHeader(raw);
  const token = cookies[BSN_SESSION_COOKIE];
  if (!token) return null;
  return verifyBsnSessionToken(token);
}
