/**
 * Shared viewer gating for map/list: non-paying viewers must not see their own record.
 * Used by getMarkers, getData, filterData, searchData.
 */
import type { NextApiRequest } from "next";
import type { Collection, ObjectId } from "mongodb";
import { getViewerEmailFromBsnSession } from "./bsnSession";

/** Get viewer email from bsn_session (app-issued). */
export async function getViewerEmail(req: NextApiRequest): Promise<string | null> {
  const cookieHeader = req.headers.cookie || "";
  const fromAppSession = getViewerEmailFromBsnSession(cookieHeader);
  if (fromAppSession) {
    if (process.env.NODE_ENV === "development") {
      console.log("[mapViewerGating] viewer from bsn_session:", fromAppSession);
    }
    return fromAppSession;
  }
  return null;
}

export type ExcludeViewerResult = {
  excludeMongoId: ObjectId | null;
  excludeMightyId: number | null;
};

/**
 * If the viewer is authenticated and NOT paid/active in Mighty, return filters to exclude their own record.
 * Otherwise return null (no exclusion).
 */
export async function getExcludeViewerMighty(
  req: NextApiRequest,
  collection: Collection
): Promise<ExcludeViewerResult> {
  const viewerEmail = await getViewerEmail(req);
  if (!viewerEmail) return { excludeMongoId: null, excludeMightyId: null };

  const viewerRecord: any = await collection.findOne(
    { email: { $regex: new RegExp(`^${viewerEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
    { projection: { _id: 1, mightyId: 1, "subscription.isPaidActive": 1 } }
  );
  if (!viewerRecord) return { excludeMongoId: null, excludeMightyId: null };

  // Fail-open until subscription sync has populated this field.
  // Only exclude when we KNOW the viewer is not paid/active.
  const paidActive = viewerRecord.subscription?.isPaidActive;
  if (paidActive !== false) return { excludeMongoId: null, excludeMightyId: null };

  const excludeMightyId =
    viewerRecord.mightyId != null && viewerRecord.mightyId !== "" && Number.isFinite(Number(viewerRecord.mightyId))
      ? Number(viewerRecord.mightyId)
      : null;
  return { excludeMongoId: viewerRecord._id || null, excludeMightyId };
}

// Provide a default export for environments that import default.
export default { getViewerEmail, getExcludeViewerMighty };

