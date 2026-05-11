import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";
import { persistLocationPromptOptOut } from "@/lib/domain/location/locationPromptOptout.service";

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
  await persistLocationPromptOptOut(db, session);

  // Best-effort cache invalidation.
  Promise.resolve()
    .then(() => invalidateMightyMemberCaches())
    .catch(() => {});

  return res.status(200).json({ ok: true });
}

