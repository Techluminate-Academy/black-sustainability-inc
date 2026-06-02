import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import {
  createBsnSessionToken,
  getBsnSessionFromReq,
  setBsnSessionCookie,
} from "@/lib/bsnSession";
import {
  MemberProfileUpdateError,
  sessionPayloadAfterProfileUpdate,
  updateMemberProfileFromSession,
} from "@/lib/domain/members/memberProfileUpdate.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  try {
    const { db } = await connectToDatabase();
    const { profile, mightyId } = await updateMemberProfileFromSession(db, session, {
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      bio: req.body?.bio,
      organizationName: req.body?.organizationName,
    });
    const refreshedSession = sessionPayloadAfterProfileUpdate(session, profile, mightyId);
    setBsnSessionCookie(res, createBsnSessionToken(refreshedSession));
    return res.status(200).json({ ok: true, profile });
  } catch (e) {
    if (e instanceof MemberProfileUpdateError) {
      const status = e.statusCode >= 500 ? 502 : 400;
      return res.status(status).json({ ok: false, error: e.message });
    }
    console.error("[member/update-profile]", e);
    return res.status(500).json({ ok: false, error: "Failed to update profile" });
  }
}
