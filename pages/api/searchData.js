import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { getExcludeViewerMighty } from "../../lib/mapViewerGating";
import { toAirtableishDoc } from "../../lib/mightyMemberAirtableShape";
import CACHE_EXPIRY from "../../constants/CacheExpiry";

const COLLECTION_NAME = "mightyMembers";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;
    const useCache = !excludeViewer;

    const queryParams = req.query;
    const cacheKey = `search:v3:${COLLECTION_NAME}:${JSON.stringify(queryParams)}`;

    if (useCache) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
    }

    let query = {};

    if (queryParams.q) {
      const searchRegex = new RegExp(queryParams.q, "i");
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { industry: searchRegex },
        { location: searchRegex },
        { bio: searchRegex },
      ];
    }

    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) query.$nor = nor;
    }

    const data = await collection.find(query).sort({ _id: 1 }).toArray();
    const totalCount = data.length;

    const responseData = {
      success: true,
      totalCount,
      data: data.map(toAirtableishDoc),
    };

    if (useCache) {
      await redis.set(cacheKey, JSON.stringify(responseData), "EX", CACHE_EXPIRY);
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error retrieving search data from MongoDB:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
