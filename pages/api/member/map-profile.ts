import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import { getMemberMapProfileView } from "@/lib/domain/members/memberMapProfileView.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  try {
    const { db } = await connectToDatabase();
    const profile = await getMemberMapProfileView(db, session);
    return res.status(200).json({ ok: true, profile });
  } catch (e) {
    console.warn("[member/map-profile]", (e as Error)?.message);
    return res.status(500).json({ ok: false, error: "Failed to load profile" });
  }
}
