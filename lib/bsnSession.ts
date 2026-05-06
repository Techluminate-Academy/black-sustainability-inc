import jwt from "jsonwebtoken";

export const BSN_SESSION_COOKIE = "bsn_session";

export type BsnSessionPayload = {
  email: string;
  name?: string;
  mightyId?: string;
};

function getSessionSecret(): string | undefined {
  return process.env.SESSION_SECRET;
}

export function createBsnSessionToken(payload: BsnSessionPayload): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return jwt.sign(
    {
      email: payload.email.trim(),
      ...(payload.name != null && payload.name !== "" ? { name: payload.name } : {}),
      ...(payload.mightyId != null && payload.mightyId !== ""
        ? { mightyId: payload.mightyId }
        : {}),
    },
    secret,
    { algorithm: "HS256", expiresIn: "7d" }
  );
}

export function verifyBsnSessionToken(token: string): BsnSessionPayload | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    const email = decoded.email;
    if (!email || typeof email !== "string") return null;
    return {
      email: String(email).trim(),
      name: typeof decoded.name === "string" ? decoded.name : undefined,
      mightyId: typeof decoded.mightyId === "string" ? decoded.mightyId : undefined,
    };
  } catch {
    return null;
  }
}

export function getBsnSessionFromCookieHeader(
  cookieHeader: string | undefined
): BsnSessionPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/\bbsn_session=([^;]+)/);
  if (!match) return null;
  let raw = match[1].trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return verifyBsnSessionToken(raw);
  }
  return verifyBsnSessionToken(raw);
}

export function getViewerEmailFromBsnSession(
  cookieHeader: string | undefined
): string | null {
  const session = getBsnSessionFromCookieHeader(cookieHeader);
  if (!session?.email) return null;
  return session.email.trim().toLowerCase();
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
