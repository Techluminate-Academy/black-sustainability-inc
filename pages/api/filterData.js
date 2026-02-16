import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { getExcludeViewerId } from "../../lib/mapViewerGating";
import CACHE_EXPIRY from '../../constants/CacheExpiry'
const COLLECTION_NAME = "airtableRecords";

export default async function handler(req, res) {
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
        return res.status(200).json(JSON.parse(cachedData));
      }
    }

    let query = {};
    if (industryHouse && industryHouse !== "") {
      query["fields.PRIMARY INDUSTRY HOUSE"] = industryHouse;
    }
    if (excludeViewerId) {
      query.$nor = [{ id: excludeViewerId }, { airtableId: excludeViewerId }];
    }

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

    if (useCache) {
      await redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response));
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error filtering data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
