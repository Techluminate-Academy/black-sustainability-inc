import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { promisify } from "util";
import zlib from "zlib";  // Compression library
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const COLLECTION_NAME = "airtableRecords";
import CACHE_EXPIRY from '../../constants/CacheExpiry';

const deflate = promisify(zlib.deflate);  // Promisified zlib deflate method
const inflate = promisify(zlib.inflate);  // Promisified zlib inflate method

const MAP_MARKERS_GATING_DEBUG = process.env.MAP_MARKERS_GATING_DEBUG === "true" || process.env.MAP_MARKERS_GATING_DEBUG === "1";

/** Normalize paying flag from Airtable/Mongo: true only if explicitly true-like. */
function isPaying(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string" && (value === "true" || value === "True")) return true;
  return false;
}

/** Get viewer email from NextAuth session or bsn_user_data cookie (trusted server-side). */
async function getViewerEmail(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/\bbsn_user_data=([^;]+)/);
  if (match && process.env.NODE_ENV === "development") {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1].trim()));
      const email = parsed?.loginEmail ?? parsed?.email;
      if (email) {
        const normalized = String(email).trim().toLowerCase();
        console.log("[getMarkers] viewer from cookie (login-as):", normalized);
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
      console.log("[getMarkers] viewer from NextAuth session:", fromSession);
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

export default async function handler(req, res) {
  try {
    const cacheKey = `map-locations1`;
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // --- Viewer-specific gating: identify viewer and paying status ---
    let viewerEmail = await getViewerEmail(req);
    let viewerPaying = true;
    let excludeViewerId = null;
    let viewerRecord = null;

    if (viewerEmail) {
      viewerRecord = await collection.findOne(
        { "fields.EMAIL ADDRESS": { $regex: new RegExp(`^${viewerEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { projection: { id: 1, airtableId: 1, "fields.EMAIL ADDRESS": 1, "fields.Paying Member (keep current)": 1 } }
      );
      if (viewerRecord) {
        viewerPaying = isPaying(viewerRecord.fields?.["Paying Member (keep current)"]);
        if (!viewerPaying) excludeViewerId = viewerRecord.id || viewerRecord.airtableId;
        if (MAP_MARKERS_GATING_DEBUG) {
          console.log("[getMarkers gating] viewerId=" + (excludeViewerId || "").slice(0, 12) + "… paying=" + viewerPaying + " excludeSelf=" + !!excludeViewerId);
        }
      }
    }

    // Temporary debug (Step 2 — acceptance test; remove in Step 7)
    if (process.env.NODE_ENV === "development") {
      console.log({
        viewerEmail: viewerEmail ?? null,
        markerEmail: viewerRecord?.fields?.["EMAIL ADDRESS"] ?? null,
        payingFlag: viewerPaying,
        isSelf: !!excludeViewerId,
      });
    }

    const useCache = !excludeViewerId;
    if (useCache) {
      const cacheStart = Date.now();
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const decompressedData = await inflate(Buffer.from(cachedData, 'base64'));
        const parsedData = JSON.parse(decompressedData.toString());
        console.log(`✅ Served from Redis cache in ${Date.now() - cacheStart}ms`);
        return res.status(200).json(parsedData);
      }
    }

    console.log(excludeViewerId ? "❌ Cache bypass (viewer-specific). Querying MongoDB…" : "❌ Cache miss. Querying MongoDB…");

    const mongoStart = Date.now();
    const pipeline = [];

    if (excludeViewerId) {
      pipeline.push({ $match: { $nor: [{ id: excludeViewerId }, { airtableId: excludeViewerId }] } });
    }

    pipeline.push(
      {
        $project: {
          id: '$id',
          fields: {
            'FIRST NAME': '$fields.FIRST NAME',
            'LAST NAME': '$fields.LAST NAME',
            'EMAIL ADDRESS': '$fields.EMAIL ADDRESS',
            'WEBSITE': '$fields.WEBSITE',
            'BIO': '$fields.BIO',
            'MEMBER LEVEL': '$fields.MEMBER LEVEL',
            'PRIMARY INDUSTRY HOUSE': '$fields.PRIMARY INDUSTRY HOUSE',
            'Location (Nearest City)': '$fields.Location (Nearest City)',
            'ORGANIZATION NAME': '$fields.ORGANIZATION NAME',
            'PHOTO': {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ["$fields.PHOTO", []] } }, 0] },
                then: { $arrayElemAt: ["$fields.PHOTO.url", 0] },
                else: null
              }
            }
          },
          location: {
            type: { $literal: 'Point' },
            coordinates: [
              { $convert: { input: '$fields.LONGITUDE (NEW)', to: 'double', onError: null, onNull: null } },
              { $convert: { input: '$fields.LATITUDE (NEW)', to: 'double', onError: null, onNull: null } }
            ]
          },
          _id: 0
        }
      },
      {
        $match: {
          'location.coordinates.0': { $ne: null },
          'location.coordinates.1': { $ne: null }
        }
      }
    );

    const data = await collection.aggregate(pipeline).toArray();
    console.log(`MongoDB Fetch Time: ${Date.now() - mongoStart}ms`);

    const response = { success: true, data };

    if (useCache) {
      const compressedData = await deflate(JSON.stringify(response));
      const compressedDataBase64 = compressedData.toString('base64');
      await redis.setex(cacheKey, CACHE_EXPIRY, compressedDataBase64);
      console.log(`✅ Cached data for all records in Redis`);
    }

    res.status(200).json(response);

  } catch (error) {
    console.error("❌ Error retrieving data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
