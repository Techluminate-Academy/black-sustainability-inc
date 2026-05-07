import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { getExcludeViewerMighty } from "../../lib/mapViewerGating";
import {
  applyIndustryHouseToMongoQuery,
  normalizeIndustryHouseQueryParam,
} from "../../lib/buildIndustryHouseQuery";
import { toAirtableishDoc } from "../../lib/mightyMemberAirtableShape";

const COLLECTION_NAME = "mightyMembers";
import CACHE_EXPIRY from '../../constants/CacheExpiry'

export default async function handler(req, res) {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ success: false, error: 'Request timeout - server took too long to respond' });
    }
  }, 10000);

  try {
    const { page, limit } = req.query;
    const industryHouse = normalizeIndustryHouseQueryParam(req.query.industryHouse);
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 50;
    const skip = (currentPage - 1) * recordsPerPage;

    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;
    const useCache = !excludeViewer;

    const cacheKey = `getData:v8:primary-backfill:${COLLECTION_NAME}:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;
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

    let query = {};
    applyIndustryHouseToMongoQuery(query, industryHouse);
    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) query.$nor = nor;
    }

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
      data: data.map(toAirtableishDoc),
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
