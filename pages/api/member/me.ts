import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import { getMemberMeForSession } from "@/lib/domain/members/memberMe.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  const { db } = await connectToDatabase();
  const member = await getMemberMeForSession(db, session);

  return res.status(200).json({
    ok: true,
    session: {
      mightyId: session.mightyId,
      email: session.email,
      firstName: session.firstName ?? null,
      lastName: session.lastName ?? null,
    },
    mongo: member || null,
  });
}

