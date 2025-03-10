import redis from "../../lib/redis";
import { MongoClient } from "mongodb";
const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
const DATABASE_NAME = "members";
const COLLECTION_NAME = "airtableRecords";
import CACHE_EXPIRY from '../../constants/CacheExpiry'

export default async function handler(req, res) {
  if (!MONGODB_URI) {
    return res.status(500).json({ success: false, error: "MONGODB_URI is not defined" });
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Read query parameters for search and filtering
    const queryParams = req.query;

    // Generate a cache key based on the search query
    const cacheKey = `search:${JSON.stringify(queryParams)}`;
    
    // Check Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    let query = {};

    if (queryParams.q) {
      const searchRegex = new RegExp(queryParams.q, "i");
      query.$or = [
        { ["fields.FIRST NAME"]: searchRegex },
        { ["fields.LAST NAME"]: searchRegex },
        { ["fields.FULL NAME"]: searchRegex },
        { ["fields.ORGANIZATION NAME"]: searchRegex },
        { ["fields.PRIMARY INDUSTRY HOUSE"]: searchRegex },
      ];
    }
    
    
    if (queryParams.timeZone) query["fields['Time zone']"] = queryParams.timeZone;
    if (queryParams.stateProvince) query["fields['State/Province']"] = queryParams.stateProvince;
    if (queryParams.nameFromLocation) query["fields['Name (from Location)']"] = queryParams.nameFromLocation;
    if (queryParams.state) query["fields.State"] = queryParams.state;
    if (queryParams.nearestCity) query["fields['Location (Nearest City)']"] = queryParams.nearestCity;
    if (queryParams.firstName) query["fields['FIRST NAME']"] = queryParams.firstName;
    if (queryParams.lastName) query["fields['LAST NAME']"] = queryParams.lastName;
    if (queryParams.fullName) query["fields['FULL NAME']"] = queryParams.fullName;
    if (queryParams.country) query["fields.Country"] = queryParams.country;
    if (queryParams.bio) query["fields.BIO"] = queryParams.bio;
    if (queryParams.organizationName) query["fields['ORGANIZATION NAME']"] = queryParams.organizationName;
    
    // Retrieve matching documents
    const data = await collection.find(query).toArray();
    const totalCount = data.length;

    const responseData = { success: true, totalCount, data };

    // Cache the search result for 5 minutes
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", CACHE_EXPIRY);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error retrieving filtered data from MongoDB:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    await client.close();
  }
}
