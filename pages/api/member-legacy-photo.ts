import type { NextApiRequest, NextApiResponse } from "next";
import { resolveLegacyMemberPhotoUrl } from "@/lib/domain/members/legacyMemberPhoto.service";

/**
 * Redirect to a fresh legacy profile photo URL from Airtable (attachment links expire).
 * Map markers and cards use this stable path instead of caching expiring Airtable CDN URLs.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  const recordId =
    typeof req.query.recordId === "string" ? req.query.recordId.trim() : "";

  const resolved = await resolveLegacyMemberPhotoUrl(recordId);
  if (!resolved.ok) {
    return res.status(resolved.status).json({ ok: false, error: resolved.error });
  }

  const maxAge = Math.min(
    3600,
    Number(process.env.LEGACY_PHOTO_BROWSER_CACHE_SECS) || 1800
  );
  res.setHeader("Cache-Control", `private, max-age=${maxAge}`);
  res.setHeader("Location", resolved.url);
  return res.status(302).end();
}
