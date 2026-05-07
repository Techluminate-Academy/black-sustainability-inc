import type { NextApiRequest, NextApiResponse } from "next";
import { mightyGetMemberByEmail } from "../../../lib/mightyAdmin";
import { findAirtableMightyMemberByEmail } from "../../../lib/airtableMightyMembers";
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
    // Fallback: allow sign-in if they exist in the Airtable Mighty Members table.
    // This supports cases where Mighty membership is still syncing or the email lookup is limited.
    try {
      const airtableMember = await findAirtableMightyMemberByEmail(email);
      if (!airtableMember) {
        return res.status(401).json({
          ok: false,
          error:
            "We couldn't find your email in Mighty or our directory records. If you believe you should have access, email jerry@techluminateacademy.com.",
        });
      }
      if (typeof airtableMember.mightyId !== "number") {
        return res.status(401).json({
          ok: false,
          error:
            "Your directory record is missing a Mighty Member ID. Please email jerry@techluminateacademy.com for help.",
        });
      }

      const token = createBsnSessionToken({
        email: airtableMember.email || email,
        mightyId: airtableMember.mightyId,
        firstName: airtableMember.firstName ?? null,
        lastName: airtableMember.lastName ?? null,
      });
      setSessionCookie(res, token);

      return res.status(200).json({
        ok: true,
        user: {
          email: airtableMember.email || email,
          mightyId: airtableMember.mightyId,
          firstName: airtableMember.firstName,
          lastName: airtableMember.lastName,
        },
        source: "airtable",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[auth/login] Airtable fallback lookup failed:", msg);
      return res.status(502).json({ ok: false, error: "Member lookup failed" });
    }
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
