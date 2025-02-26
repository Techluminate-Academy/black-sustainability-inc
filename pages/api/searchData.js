// pages/api/searchData.js
import { MongoClient } from "mongodb";
import NodeCache from "node-cache";

// Create a cache instance with a TTL of 60 seconds.
const myCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
const DATABASE_NAME = "members";
const COLLECTION_NAME = "airtableRecords";

export default async function handler(req, res) {
  if (!MONGODB_URI) {
    return res
      .status(500)
      .json({ success: false, error: "MONGODB_URI is not defined" });
  }

  // Create a cache key based on the request query parameters.
  const cacheKey = `searchData:${JSON.stringify(req.query)}`;
  const cachedResult = myCache.get(cacheKey);
  if (cachedResult) {
    // Set HTTP caching headers for CDN/proxy caching as well.
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(200).json(cachedResult);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Read query parameters for search and filtering
    const {
      q,
      timeZone,
      stateProvince,
      nameFromLocation,
      state,
      nearestCity,
      firstName,
      lastName,
      fullName,
      country,
      bio,
    } = req.query;

    // Build the search query object
    let query = {};

    if (q) {
      query.$text = { $search: q };
    }
    if (timeZone) {
      query["fields['Time zone']"] = timeZone;
    }
    if (stateProvince) {
      query["fields['State/Province']"] = stateProvince;
    }
    if (nameFromLocation) {
      query["fields['Name (from Location)']"] = nameFromLocation;
    }
    if (state) {
      query["fields.State"] = state;
    }
    if (nearestCity) {
      query["fields['Location (Nearest City)']"] = nearestCity;
    }
    if (firstName) {
      query["fields['FIRST NAME']"] = firstName;
    }
    if (lastName) {
      query["fields['LAST NAME']"] = lastName;
    }
    if (fullName) {
      query["fields['FULL NAME']"] = fullName;
    }
    if (country) {
      query["fields.Country"] = country;
    }
    if (bio) {
      query["fields.BIO"] = bio;
    }

    // Retrieve all matching documents without pagination.
    const data = await collection.find(query).toArray();
    const totalCount = data.length;

    const resultData = {
      success: true,
      totalCount,
      data,
    };

    // Cache the result for subsequent requests.
    myCache.set(cacheKey, resultData);
    res.setHeader("Cache-Control", "public, max-age=60");

    return res.status(200).json(resultData);
  } catch (error) {
    console.error("Error retrieving filtered data from MongoDB:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    await client.close();
  }
}
