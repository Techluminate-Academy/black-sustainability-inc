import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import CACHE_EXPIRY from "../../constants/CacheExpiry";

async function getExcludeViewerMighty() {
  // Fail-open gating for production stability.
  return { excludeMongoId: null, excludeMightyId: null };
}

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("airtableRecords");
    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;
    const useCache = !excludeViewer;

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

    const queryParams = req.query;
    const cacheKey = `search:v4:airtableRecords:${JSON.stringify(queryParams)}`;

    if (useCache) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
    }
    const qRaw = (queryParams.q || "").toString().trim();
    const query = {};
    if (qRaw) {
      const re = new RegExp(qRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { "fields.FIRST NAME": re },
        { "fields.LAST NAME": re },
        { "fields.FULL NAME": re },
        { "fields.EMAIL ADDRESS": re },
        { "fields.PRIMARY INDUSTRY HOUSE": re },
        { "fields.Location (Nearest City)": re },
        { "fields.BIO": re },
        { "fields.ORGANIZATION NAME": re },
      ];
    }
    if (excludeViewer) {
      const nor = [];
      if (excludeMongoId) nor.push({ _id: excludeMongoId });
      if (excludeMightyId != null) nor.push({ mightyId: excludeMightyId });
      if (nor.length) query.$nor = nor;
    }

    const dataDocs = await collection.find(query).sort({ _id: 1 }).toArray();
    const data = dataDocs.map(toAirtableishDoc);
    const totalCount = data.length;
    const responseData = { success: true, totalCount, data };

    if (useCache) {
      await redis.set(cacheKey, JSON.stringify(responseData), "EX", CACHE_EXPIRY);
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error retrieving filtered data from MongoDB:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
