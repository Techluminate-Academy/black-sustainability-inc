import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { promisify } from "util";
import zlib from "zlib";
import { getExcludeViewerMighty } from "../../lib/mapViewerGating";
import CACHE_EXPIRY from '../../constants/CacheExpiry';

const COLLECTION_NAME = "mightyMembers";

const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

const MAP_MARKERS_GATING_DEBUG = process.env.MAP_MARKERS_GATING_DEBUG === "true" || process.env.MAP_MARKERS_GATING_DEBUG === "1";

export default async function handler(req, res) {
  try {
    const cacheKey = `map-locations:v5:${COLLECTION_NAME}`;
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;

    if (MAP_MARKERS_GATING_DEBUG) {
      console.log("[getMarkers gating] excludeViewer=", excludeViewer, {
        excludeMongoId: excludeMongoId?.toString?.() ?? excludeMongoId,
        excludeMightyId,
      });
    }

    const useCache = !excludeViewer;
    if (useCache) {
      const cacheStart = Date.now();
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          const decompressedData = await inflate(Buffer.from(cachedData, "base64"));
          const parsedData = JSON.parse(decompressedData.toString());
          console.log(`✅ Served from Redis cache in ${Date.now() - cacheStart}ms`);
          return res.status(200).json(parsedData);
        }
      } catch (cacheErr) {
        console.error("⚠️ Redis cache read/decode failed; falling back to Mongo:", cacheErr?.message || cacheErr);
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
        $match: {
          latitude: { $exists: true, $ne: null },
          longitude: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          id: {
            $cond: {
              if: { $ne: [{ $ifNull: ["$mightyId", null] }, null] },
              then: { $toString: "$mightyId" },
              else: { $toString: "$_id" },
            },
          },
          fields: {
            "FIRST NAME": "$firstName",
            "LAST NAME": "$lastName",
            "EMAIL ADDRESS": "$email",
            WEBSITE: { $literal: "" },
            BIO: "$bio",
            "MEMBER LEVEL": { $literal: "" },
            "PRIMARY INDUSTRY HOUSE": "$industry",
            "Location (Nearest City)": "$location",
            "ORGANIZATION NAME": { $literal: "" },
            PHOTO: {
              $cond: {
                if: {
                  $and: [
                    { $ne: [{ $ifNull: ["$avatarUrl", ""] }, ""] },
                  ],
                },
                then: [{ url: "$avatarUrl" }],
                else: [],
              },
            },
          },
          userphoto: "$avatarUrl",
          location: {
            type: { $literal: "Point" },
            coordinates: ["$longitude", "$latitude"],
          },
          _id: 0,
        },
      }
    );

    const data = await collection.aggregate(pipeline).toArray();
    console.log(`MongoDB Fetch Time: ${Date.now() - mongoStart}ms`);

    const response = { success: true, data };

    if (useCache) {
      try {
        const compressedData = await deflate(JSON.stringify(response));
        const compressedDataBase64 = compressedData.toString("base64");
        await redis.setex(cacheKey, CACHE_EXPIRY, compressedDataBase64);
        console.log(`✅ Cached map markers in Redis`);
      } catch (cacheWriteErr) {
        console.error("⚠️ Redis cache write failed (response still returned):", cacheWriteErr?.message || cacheWriteErr);
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error retrieving data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
