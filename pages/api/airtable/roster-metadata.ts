import type { NextApiRequest, NextApiResponse } from "next";
import { fetchMainRosterTableMetadata } from "@/lib/server/airtableMainRosterServer";
import { FALLBACK_INDUSTRY_FIELD_METADATA } from "@/constants/industry-house-options";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const metadata = await fetchMainRosterTableMetadata();
    const withoutIndustry = metadata.filter(
      (field) => field.fieldName !== "PRIMARY INDUSTRY HOUSE"
    );
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json([FALLBACK_INDUSTRY_FIELD_METADATA, ...withoutIndustry]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[roster-metadata]", msg);
    return res.status(500).json({ error: "Failed to load form metadata" });
  }
}
