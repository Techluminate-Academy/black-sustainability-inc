import type { NextApiRequest, NextApiResponse } from "next";
import { fetchFreeSignupTableFieldMetadata } from "@/lib/server/airtableFreeSignupServer";
import {
  envPositiveInt,
  respondIfRateLimited,
} from "@/lib/server/fixedWindowRateLimit";
import { FALLBACK_INDUSTRY_FIELD_METADATA } from "@/constants/industry-house-options";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const windowSec = envPositiveInt("FREE_SIGNUP_RL_WINDOW_SEC", 900);
  if (
    await respondIfRateLimited(req, res, {
      scope: "free-signup-metadata-ip",
      max: envPositiveInt("FREE_SIGNUP_RL_METADATA_MAX", 120),
      windowSec,
    })
  ) {
    return;
  }

  try {
    const metadata = await fetchFreeSignupTableFieldMetadata();
    // The legacy roster is the source of truth for official Industry House names.
    // Do not expose choices from the newer Airtable field, which may contain duplicates.
    const withoutIndustry = metadata.filter(
      (field) => field.fieldName !== "PRIMARY INDUSTRY HOUSE"
    );
    res.setHeader("X-BSN-Metadata-Source", "canonical-industry");
    return res.status(200).json([FALLBACK_INDUSTRY_FIELD_METADATA, ...withoutIndustry]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[free-signup-metadata]", msg);
    // Record creation and Airtable schema access use different permissions.
    // A schema outage must not empty the required Join Map dropdown.
    res.setHeader("X-BSN-Metadata-Source", "fallback");
    return res.status(200).json([FALLBACK_INDUSTRY_FIELD_METADATA]);
  }
}
