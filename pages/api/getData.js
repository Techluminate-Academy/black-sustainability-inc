import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";

const COLLECTION_NAME = "airtableRecords";
const CACHE_EXPIRY = 2592000; // 1 month in seconds


export default async function handler(req, res) {
  try {
    const { industryHouse, page, limit } = req.query;
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 50;
    const skip = (currentPage - 1) * recordsPerPage;

    // 🔹 Build cache key dynamically
    const cacheKey = `filterData:${industryHouse || "all"}:page=${currentPage}:limit=${recordsPerPage}`;

    // async function deleteKeysByPattern(pattern) {
    //   let cursor = "0";
    //   do {
    //     const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    //     cursor = nextCursor;
    
    //     if (keys.length > 0) {
    //       await redis.del(...keys);
    //       console.log(`Deleted keys: ${keys}`);
    //     }
    //   } while (cursor !== "0");
    // }
  
    // deleteKeysByPattern("*")
    //   .then(() => console.log("Deletion complete"))
    //   .catch(err => console.error("Error deleting keys:", err));


    // 🔹 Check Redis cache first

    // redis.keys("*").then((keys) => {
    //   console.log("All keys:", keys);
    // }).catch((err) => {
    //   console.error("Error fetching keys:", err);
    // });
    
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    console.log(`Redis Fetch Time: ${Date.now() - cacheStart}ms`);

    if (cachedData) {
      // console.log("✅ Serving from Cache");
      return res.status(200).json(JSON.parse(cachedData));
    }

    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // 🔹 Build MongoDB query
    let query = {};
    if (industryHouse && industryHouse !== "") {
      query["fields.PRIMARY INDUSTRY HOUSE"] = industryHouse;
    }

    // 🔹 Fetch data from MongoDB
    const mongoStart = Date.now();
    const totalCount = await collection.countDocuments(query);
    const data = await collection.find(query).skip(skip).limit(recordsPerPage).toArray();
    // console.log(`MongoDB Fetch Time: ${Date.now() - mongoStart}ms`);

    const response = {
      success: true,
      page: currentPage,
      limit: recordsPerPage,
      totalPages: Math.ceil(totalCount / recordsPerPage),
      totalCount,
      data,
    };

    // 🔹 Store response in Redis cache
    await redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response));

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error retrieving data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
