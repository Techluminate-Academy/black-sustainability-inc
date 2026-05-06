import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";

// Old setup: Airtable records mirrored into Mongo
const COLLECTION_NAME = "airtableRecords";
import CACHE_EXPIRY from '../../constants/CacheExpiry'

async function getExcludeViewerMighty() {
  // Fail-open gating for production stability.
  // If/when gating is restored, this should exclude viewer based on session + subscription status.
  return { excludeMongoId: null, excludeMightyId: null };
}

function buildIndustryQuery(industryHouse) {
  // For airtableRecords, the filter value should match `fields["PRIMARY INDUSTRY HOUSE"]`.
  return industryHouse;
}

function normalizePhotoUrl(fields) {
  // Airtable attachment arrays: [{ url, thumbnails?... }]
  const photo = fields?.PHOTO;
  if (Array.isArray(photo) && photo.length) {
    const p0 = photo[0] || {};
    return (
      p0.thumbnails?.large?.url ||
      p0.thumbnails?.full?.url ||
      p0.thumbnails?.small?.url ||
      p0.url ||
      null
    );
  }
  // Back-compat: some records might already have userphoto
  if (typeof fields?.userphoto === "string" && fields.userphoto.trim()) return fields.userphoto.trim();
  return null;
}

function toAirtableishDoc(d) {
  const id = d?.id ? String(d.id) : d?._id ? String(d._id) : "";
  const fields = d?.fields || {};
  const photoUrl = normalizePhotoUrl(fields);
  return {
    id,
    fields: {
      ...fields,
      // ensure expected map/list fields exist
      userphoto: photoUrl || fields.userphoto || null,
      "PHOTO": Array.isArray(fields.PHOTO) ? fields.PHOTO : photoUrl ? [{ url: photoUrl }] : [],
      "LATITUDE (NEW)": fields["LATITUDE (NEW)"] ?? null,
      "LONGITUDE (NEW)": fields["LONGITUDE (NEW)"] ?? null,
    },
  };
}

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

    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;
    const useCache = !excludeViewer;

    const cacheKey = `getData:v4:${COLLECTION_NAME}:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;
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
      query["fields.PRIMARY INDUSTRY HOUSE"] = buildIndustryQuery(industryHouse);
    }
    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) query.$nor = nor;
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
