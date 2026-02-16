/**
 * Shared viewer gating for map/list: non-paying viewers must not see their own record.
 * Used by getMarkers, getData, filterData, searchData.
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

const COLLECTION_NAME = "airtableRecords";

function isPaying(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string" && (value === "true" || value === "True")) return true;
  return false;
}

/** Get viewer email from NextAuth session or bsn_user_data cookie. */
export async function getViewerEmail(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/\bbsn_user_data=([^;]+)/);
  // In development, prefer dev login-as cookie so "Sign in as NP1" is used for gating
  if (match && process.env.NODE_ENV === "development") {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1].trim()));
      const email = parsed?.loginEmail ?? parsed?.email;
      if (email) {
        const normalized = String(email).trim().toLowerCase();
        console.log("[mapViewerGating] viewer from cookie (login-as):", normalized);
        return normalized;
      }
    } catch {
      // fall through to session
    }
  }

  const session = await getServerSession(req, null, authOptions);
  if (session?.user?.email) {
    const fromSession = (session.user.email || "").trim().toLowerCase();
    if (process.env.NODE_ENV === "development") {
      console.log("[mapViewerGating] viewer from NextAuth session:", fromSession);
    }
    return fromSession;
  }

  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1].trim()));
    const email = parsed?.loginEmail ?? parsed?.email;
    return email ? String(email).trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * If the viewer is authenticated and non-paying, return their Airtable record id to exclude.
 * Otherwise return null (no exclusion).
 * @param {import("next").NextApiRequest} req
 * @param {import("mongodb").Collection} collection - airtableRecords collection
 * @returns {Promise<{ excludeViewerId: string | null }>}
 */
export async function getExcludeViewerId(req, collection) {
  const viewerEmail = await getViewerEmail(req);
  if (!viewerEmail) return { excludeViewerId: null };

  const viewerRecord = await collection.findOne(
    { "fields.EMAIL ADDRESS": { $regex: new RegExp(`^${viewerEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
    { projection: { id: 1, airtableId: 1, "fields.Paying Member (keep current)": 1 } }
  );
  if (!viewerRecord) return { excludeViewerId: null };

  const paying = isPaying(viewerRecord.fields?.["Paying Member (keep current)"]);
  if (paying) return { excludeViewerId: null };

  return { excludeViewerId: viewerRecord.id || viewerRecord.airtableId };
}
