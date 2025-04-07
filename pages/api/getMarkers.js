import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import CACHE_EXPIRY from "../../constants/CacheExpiry";

const COLLECTION_NAME = "airtableRecords";

export default async function handler(req, res) {
  try {
    const { northEastLat, northEastLng, southWestLat, southWestLng, industryHouse } = req.query;

    // Validate required bounding box parameters
    if (!northEastLat || !northEastLng || !southWestLat || !southWestLng) {
      return res.status(400).json({ success: false, error: "Missing bounding box parameters." });
    }

    // Build a cache key that includes the bounding box and any optional filters
    const cacheKey = `getMarkers:${industryHouse || "all"}:neLat=${northEastLat}:neLng=${northEastLng}:swLat=${southWestLat}:swLng=${southWestLng}`;

    // Check Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Build the query to find records within the bounding box
    console.log("southWestLat:", southWestLat, "northEastLat:", northEastLat);
console.log("southWestLng:", southWestLng, "northEastLng:", northEastLng);
const query = {
    $expr: {
      $and: [
        {
          $gte: [
            { $toDouble: { $trim: { input: "$fields.LATITUDE (NEW)" } } },
            parseFloat(southWestLat)
          ]
        },
        {
          $lte: [
            { $toDouble: { $trim: { input: "$fields.LATITUDE (NEW)" } } },
            parseFloat(northEastLat)
          ]
        },
        {
          $gte: [
            { $toDouble: { $trim: { input: "$fields.LONGITUDE (NEW)" } } },
            parseFloat(southWestLng)
          ]
        },
        {
          $lte: [
            { $toDouble: { $trim: { input: "$fields.LONGITUDE (NEW)" } } },
            parseFloat(northEastLng)
          ]
        }
      ]
    }
  };
  
  
      console.log("Constructed Query:", JSON.stringify(query, null, 2));

    // Optionally filter by industry house if provided
    if (industryHouse && industryHouse !== "") {
      query["fields.PRIMARY INDUSTRY HOUSE"] = industryHouse;
    }

    // Retrieve the total count and marker data within the bounds
    const totalCount = await collection.countDocuments(query);
    const data = await collection.find(query).toArray();

    const response = {
      success: true,
      totalCount,
      data,
    };

    // Cache the response for future requests
    await redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response));

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving markers:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
