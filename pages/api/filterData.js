import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import CACHE_EXPIRY from '../../constants/CacheExpiry'
// Old setup: Airtable records mirrored into Mongo
const COLLECTION_NAME = "airtableRecords";

async function getExcludeViewerMighty() {
  // Fail-open gating for production stability.
  return { excludeMongoId: null, excludeMightyId: null };
}

function buildIndustryQuery(industryHouse) {
  return industryHouse;
}

function toAirtableishDoc(d) {
  const id = d?.id ? String(d.id) : d?._id ? String(d._id) : "";
  const fields = d?.fields || {};
  const photo = fields?.PHOTO;
  const photoUrl =
    (Array.isArray(photo) && photo[0] && (photo[0].thumbnails?.large?.url || photo[0].url)) ||
    (typeof fields?.userphoto === "string" ? fields.userphoto : null) ||
    null;
  return {
    id,
    fields: {
      ...fields,
      userphoto: photoUrl || fields.userphoto || null,
      "PHOTO": Array.isArray(fields.PHOTO) ? fields.PHOTO : photoUrl ? [{ url: photoUrl }] : [],
      "LATITUDE (NEW)": fields["LATITUDE (NEW)"] ?? null,
      "LONGITUDE (NEW)": fields["LONGITUDE (NEW)"] ?? null,
    },
  };
}

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

    const cacheKey = `filterData:v4:${COLLECTION_NAME}:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;
    if (useCache) {
      const cacheStart = Date.now();
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
    }

    let query = {};
    if (industryHouse && industryHouse !== "") {
      query["fields.PRIMARY INDUSTRY HOUSE"] = buildIndustryQuery(industryHouse);
    }
    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) query.$nor = nor;
    }

    const totalCount = await collection.countDocuments(query);
    const data = await collection.find(query).skip(skip).limit(recordsPerPage).sort({ _id: 1 }).toArray();

    const response = {
      success: true,
      meta: {
        collection: COLLECTION_NAME,
        buildCommit: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
      },
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
