import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { getExcludeViewerId } from "../../lib/mapViewerGating";

const COLLECTION_NAME = "airtableRecords";
import CACHE_EXPIRY from '../../constants/CacheExpiry'

export default async function handler(req, res) {
  // Set response timeout to prevent hanging
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ success: false, error: 'Request timeout - server took too long to respond' });
    }
  }, 10000); // 10 second timeout

  try {
    const { industryHouse, page, limit } = req.query;
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 50;
    const skip = (currentPage - 1) * recordsPerPage;

    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const { excludeViewerId } = await getExcludeViewerId(req, collection);
    const useCache = !excludeViewerId;

    const cacheKey = `filterData:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;
    if (useCache) {
      const cacheStart = Date.now();
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        console.log(`✅ Serving from Redis Cache - Time: ${Date.now() - cacheStart}ms`);
        clearTimeout(timeout);
        return res.status(200).json(parsedCache);
      }
    }

    // 🔹 Build MongoDB query
    let query = {};
    if (industryHouse && industryHouse !== "") {
      query["fields.PRIMARY INDUSTRY HOUSE"] = industryHouse;
    }
    if (excludeViewerId) {
      query.$nor = [{ id: excludeViewerId }, { airtableId: excludeViewerId }];
    }

    // 🔹 Fetch data from MongoDB with optimized query
    const mongoStart = Date.now();
    const [totalCount, data] = await Promise.all([
      collection.countDocuments(query),
      collection.find(query)
        .skip(skip)
        .limit(recordsPerPage)
        .sort({ _id: 1 })
        .toArray()
    ]);
    console.log(`MongoDB Fetch Time: ${Date.now() - mongoStart}ms`);

    const response = {
      success: true,
      page: currentPage,
      limit: recordsPerPage,
      totalPages: Math.ceil(totalCount / recordsPerPage),
      totalCount,
      data,
    };

    if (useCache) {
      await redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response));
    }

    clearTimeout(timeout);
    res.status(200).json(response);
  } catch (error) {
    clearTimeout(timeout);
    console.error("❌ Error retrieving data:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
