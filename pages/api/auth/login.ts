import type { NextApiRequest, NextApiResponse } from "next";
import { mightyGetMemberByEmail } from "../../../lib/mightyAdmin";
import {
  BSN_SESSION_COOKIE,
  createBsnSessionToken,
} from "../../../lib/bsnSession";

function setSessionCookie(res: NextApiResponse, token: string) {
  const maxAge = 60 * 60 * 24 * 30;
  const parts = [
    `${BSN_SESSION_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const raw =
    typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const email = raw.toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: "Valid email required" });
  }

  let member;
  try {
    member = await mightyGetMemberByEmail(email);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[auth/login] Mighty lookup failed:", msg);
    return res.status(502).json({ ok: false, error: "Member lookup failed" });
  }

  if (!member) {
    return res.status(401).json({
      ok: false,
      error: "No member found for that email in this Mighty network.",
    });
  }

  try {
    const token = createBsnSessionToken({
      email: member.email,
      mightyId: member.id,
      firstName: member.first_name ?? null,
      lastName: member.last_name ?? null,
    });
    setSessionCookie(res, token);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[auth/login] Session error:", msg);
    return res.status(500).json({ ok: false, error: "Session could not be created" });
  }

  return res.status(200).json({
    ok: true,
    user: {
      email: member.email,
      mightyId: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
    },
  });
}
