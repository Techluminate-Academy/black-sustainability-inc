import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import * as mapViewerGating from "../../lib/mapViewerGating";
import CACHE_EXPIRY from "../../constants/CacheExpiry";

function getExcludeViewerMightySafe() {
  return (
    mapViewerGating.getExcludeViewerMighty ||
    mapViewerGating.default?.getExcludeViewerMighty ||
    null
  );
}

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("mightyMembers");
    const getExcludeViewerMighty = getExcludeViewerMightySafe();
    if (typeof getExcludeViewerMighty !== "function") {
      return res.status(500).json({ success: false, error: "Server misconfig: getExcludeViewerMighty unavailable" });
    }

    const { excludeMongoId, excludeMightyId } = await getExcludeViewerMighty(req, collection);
    const excludeViewer = !!excludeMongoId || excludeMightyId != null;
    const useCache = !excludeViewer;

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
          userphoto: photoUrl || null,
        },
      };
    }

    const queryParams = req.query;
    const cacheKey = `search:v3:mightyMembers:${JSON.stringify(queryParams)}`;

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
        { firstName: re },
        { lastName: re },
        { email: re },
        { industry: re },
        { location: re },
        { bio: re },
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
