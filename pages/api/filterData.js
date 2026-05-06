import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { getExcludeViewerMighty } from "../../lib/mapViewerGating";
import { buildPrimaryIndustryHouseFilter } from "../../lib/buildIndustryHouseQuery";
import { toAirtableishDoc } from "../../lib/mightyMemberAirtableShape";
import CACHE_EXPIRY from '../../constants/CacheExpiry'

const COLLECTION_NAME = "mightyMembers";

export default async function handler(req, res) {
  try {
    const { industryHouse, page, limit } = req.query;
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 50;
    const skip = (currentPage - 1) * recordsPerPage;

    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;
    const useCache = !excludeViewer;

    const cacheKey = `filterData:v4:reparative-fix:${COLLECTION_NAME}:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;
    if (useCache) {
      const cacheStart = Date.now();
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
    }

    let query = {};
    if (industryHouse && industryHouse !== "") {
      const industryClause = buildPrimaryIndustryHouseFilter(industryHouse);
      if (industryClause != null) {
        query.industry = industryClause;
      }
    }
    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) query.$nor = nor;
    }

    const totalCount = await collection.countDocuments(query);
    const data = await collection
      .find(query)
      .skip(skip)
      .limit(recordsPerPage)
      .sort({ _id: 1 })
      .toArray();

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

    res.status(200).json(response);
  } catch (error) {
    console.error("Error filtering data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
