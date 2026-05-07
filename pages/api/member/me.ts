import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { getBsnSessionFromReq } from "@/lib/bsnSession";

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
  const coll = db.collection("mightyMembers");

  const mightyId = session.mightyId;
  const email = session.email;

  const member = await coll.findOne(
    { $or: [{ mightyId }, { email }] },
    {
      projection: {
        _id: 0,
        mightyId: 1,
        email: 1,
        location: 1,
        latitude: 1,
        longitude: 1,
        geo: 1,
        updatedAt: 1,
        createdAt: 1,
        source: 1,
      },
    }
  );

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

