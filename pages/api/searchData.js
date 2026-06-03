import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { getExcludeViewerMighty } from "../../lib/mapViewerGating";
import { toAirtableishDoc } from "../../lib/mightyMemberAirtableShape";
import CACHE_EXPIRY from "../../constants/CacheExpiry";

const COLLECTION_NAME = "mightyMembers";
/** Hard cap on rows returned (avoids unbounded memory on broad queries). */
const SEARCH_RESULT_LIMIT = 500;

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

    if (queryParams.q && typeof queryParams.q === "string") {
      // Tokenize on whitespace so multi-word queries like "Jerry Bony" match
      // records where each token appears in at least one field (firstName=Jerry
      // AND lastName=Bony). Also escape regex metacharacters so "." or "*" in
      // user input don't behave as regex operators.
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tokens = queryParams.q
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5); // safety cap on token count

      if (tokens.length > 0) {
        const buildOr = (token) => {
          const re = new RegExp(escapeRegex(token), "i");
          return {
            $or: [
              { firstName: re },
              { lastName: re },
              { email: re },
              { industry: re },
              { location: re },
              { bio: re },
              { "fields.BIO": re },
              { "fields.Extended Bio": re },
              { "fields.Short Bio": re },
            ],
          };
        };

        if (tokens.length === 1) {
          Object.assign(query, buildOr(tokens[0]));
        } else {
          query.$and = tokens.map(buildOr);
        }
      }
    }

    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) query.$nor = nor;
    }

    const data = await collection
      .find(query)
      .sort({ _id: 1 })
      .limit(SEARCH_RESULT_LIMIT)
      .toArray();
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
