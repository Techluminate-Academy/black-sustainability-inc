import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import { buildSessionMemberProfile } from "@/lib/domain/members/memberSessionProfile.service";

function sessionUserFromProfile(profile: Awaited<ReturnType<typeof buildSessionMemberProfile>>) {
  return {
    email: profile.email,
    mightyId: profile.mightyId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    profile: {
      profilePhoto: { url: profile.avatarUrl || "" },
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ authenticated: false });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) {
    return res.status(200).json({ authenticated: false, user: null });
  }

  try {
    const { db } = await connectToDatabase();
    const profile = await buildSessionMemberProfile(db, session);
    return res.status(200).json({
      authenticated: true,
      user: sessionUserFromProfile(profile),
    });
  } catch (e) {
    console.warn("[auth/session] profile load failed:", (e as Error)?.message);
    return res.status(200).json({
      authenticated: true,
      user: {
        email: session.email,
        mightyId: session.mightyId,
        firstName: session.firstName ?? null,
        lastName: session.lastName ?? null,
        profile: { profilePhoto: { url: "" } },
      },
    });
  }
}
