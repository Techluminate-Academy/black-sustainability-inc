import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";

const COLLECTION_NAME = "airtableRecords";
const CACHE_EXPIRY = 2592000; // 1 month in seconds


export default async function handler(req, res) {
  try {
    const { industryHouse, page, limit } = req.query;
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 50;
    const skip = (currentPage - 1) * recordsPerPage;

    // Build cache key
    const cacheKey = `filterData:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;

    // Check Redis cache
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    console.log(`Redis Fetch Time: ${Date.now() - cacheStart}ms`);

    if (cachedData) {
      console.log("✅ Serving from Cache");
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log("❌ Cache Miss - Fetching from MongoDB...");
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Build the query object
    let query = {};
    if (industryHouse && industryHouse !== "") {
      query["fields.PRIMARY INDUSTRY HOUSE"] = industryHouse;
    }

    // Fetch data from MongoDB
    const totalCount = await collection.countDocuments(query);
    const data = await collection.find(query).skip(skip).limit(recordsPerPage).toArray();

    const response = {
      success: true,
      page: currentPage,
      limit: recordsPerPage,
      totalPages: Math.ceil(totalCount / recordsPerPage),
      totalCount,
      data,
    };

    // Store in Redis
    await redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error filtering data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
