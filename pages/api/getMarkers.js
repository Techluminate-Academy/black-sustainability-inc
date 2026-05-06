import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { promisify } from "util";
import zlib from "zlib";  // Compression library

// Map should read from Mongo `mightyMembers` (Mighty Members dataset)
const COLLECTION_NAME = "mightyMembers";
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

async function getExcludeViewerMighty() {
  // Fail-open gating for production stability.
  return { excludeMongoId: null, excludeMightyId: null };
}

export default async function handler(req, res) {
  try {
    // bump key to avoid mixing payload schemas across collections
    const cacheKey = `map-locations:v5:${COLLECTION_NAME}`;
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // --- Viewer-specific gating: identify viewer and paying status ---
    let viewerEmail = null;
    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;
    let viewerRecord = null;

    if (viewerEmail) {
      viewerRecord = await collection.findOne(
        { email: { $regex: new RegExp(`^${viewerEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { projection: { _id: 1, email: 1 } }
      );
      if (MAP_MARKERS_GATING_DEBUG) {
        console.log("[getMarkers gating] viewerEmail=" + (viewerEmail || "") + " excludeSelf=" + excludeViewer);
      }
    }

    // Temporary debug (Step 2 — acceptance test; remove in Step 7)
    if (process.env.NODE_ENV === "development") {
      console.log({
        viewerEmail: viewerEmail ?? null,
        markerEmail: viewerRecord?.email ?? null,
        isSelf: excludeViewer,
      });
    }

    const useCache = !excludeViewer;
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

    console.log(excludeViewer ? "❌ Cache bypass (viewer-specific). Querying MongoDB…" : "❌ Cache miss. Querying MongoDB…");

    const mongoStart = Date.now();
    const pipeline = [];

    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) pipeline.push({ $match: { $nor: nor } });
    }

    pipeline.push(
      {
        $project: {
          id: { $toString: "$_id" },
          fields: {
            "FIRST NAME": "$firstName",
            "LAST NAME": "$lastName",
            "EMAIL ADDRESS": "$email",
            "WEBSITE": { $literal: "" },
            "BIO": "$bio",
            "MEMBER LEVEL": { $literal: "" },
            "PRIMARY INDUSTRY HOUSE": "$industry",
            "Location (Nearest City)": "$location",
            "ORGANIZATION NAME": { $literal: "" },
            // Keep frontend expectations: PHOTO is an array of { url }, and also expose userphoto for marker icon.
            "PHOTO": {
              $cond: {
                if: { $and: [{ $ne: ["$avatarUrl", null] }, { $ne: ["$avatarUrl", ""] }] },
                then: [{ url: "$avatarUrl" }],
                else: [],
              },
            },
            "userphoto": "$avatarUrl",
            "LATITUDE (NEW)": "$latitude",
            "LONGITUDE (NEW)": "$longitude",
          },
          // MapboxMap expects `location.coordinates` = [lng, lat]
          location: {
            type: { $literal: "Point" },
            coordinates: ["$longitude", "$latitude"],
          },
          _id: 0
        }
      },
      {
        $match: {
          "location.coordinates.0": { $ne: null },
          "location.coordinates.1": { $ne: null }
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
