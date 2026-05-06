import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";

const COLLECTION_NAME = "mightyMembers";
import CACHE_EXPIRY from '../../constants/CacheExpiry'

async function getExcludeViewerMighty() {
  // Fail-open gating for production stability.
  // If/when gating is restored, this should exclude viewer based on session + subscription status.
  return { excludeMongoId: null, excludeMightyId: null };
}

function buildIndustryQuery(industryHouse) {
  // Expand agriculture selection to cover legacy + current variants in Mongo.
  const agricultureGroup = new Set([
    "🌾 Agriculture/Sustainable Food Production / Land Management",
    "🌾 Reparative Agriculture",
  ]);
  if (agricultureGroup.has(industryHouse)) {
    return {
      $in: [
        // Current Mongo variants observed in production
        "Sustainable Agriculture+Land Management",
        "Sustainable Agriculture Land Management",
        "Agriculture",
        // Legacy / UI values
        "🌾 Agriculture/Sustainable Food Production / Land Management",
        "🌾 Reparative Agriculture",
      ],
    };
  }
  return industryHouse;
}

function toAirtableishDoc(d) {
  const id = d?._id ? String(d._id) : d?.mightyId != null ? String(d.mightyId) : "";
  const first = d?.firstName || "";
  const last = d?.lastName || "";
  const fullName = `${first} ${last}`.trim();
  const photoUrl = d?.avatarUrl || "";
  return {
    id,
    fields: {
      "FIRST NAME": d?.firstName || "",
      "LAST NAME": d?.lastName || "",
      "FULL NAME": fullName,
      "EMAIL ADDRESS": d?.email || "",
      "PRIMARY INDUSTRY HOUSE": d?.industry || "",
      "Location (Nearest City)": d?.location || "",
      "BIO": d?.bio || "",
      "WEBSITE": "",
      "ORGANIZATION NAME": "",
      "MEMBER LEVEL": "",
      "PHOTO": photoUrl ? [{ url: photoUrl }] : [],
      "LATITUDE (NEW)": d?.latitude ?? null,
      "LONGITUDE (NEW)": d?.longitude ?? null,
      // keep compatibility for marker icon renderer
      userphoto: photoUrl || null,
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

    const cacheKey = `getData:v3:${COLLECTION_NAME}:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;
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
      query["industry"] = buildIndustryQuery(industryHouse);
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
