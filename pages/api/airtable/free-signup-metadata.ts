import type { NextApiRequest, NextApiResponse } from "next";
import { fetchFreeSignupTableFieldMetadata } from "@/lib/server/airtableFreeSignupServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const metadata = await fetchFreeSignupTableFieldMetadata();
    return res.status(200).json(metadata);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[free-signup-metadata]", msg);
    return res.status(500).json({ error: "Failed to load Airtable metadata" });
  }
}
