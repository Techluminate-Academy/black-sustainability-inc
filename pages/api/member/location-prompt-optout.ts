import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  const { db } = await connectToDatabase();
  const coll = db.collection("mightyMembers");
  const now = new Date();

  await coll.updateOne(
    { mightyId: session.mightyId },
    {
      $set: {
        email: session.email,
        mightyId: session.mightyId,
        locationPromptOptOut: true,
        locationPromptOptOutAt: now,
        updatedAt: now,
        source: "member:location-prompt-optout",
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // Best-effort cache invalidation.
  Promise.resolve()
    .then(() => invalidateMightyMemberCaches())
    .catch(() => {});

  return res.status(200).json({ ok: true });
}

