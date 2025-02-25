// pages/api/searchData.js
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
const DATABASE_NAME = "members";
const COLLECTION_NAME = "airtableRecords";

export default async function handler(req, res) {
  if (!MONGODB_URI) {
    return res
      .status(500)
      .json({ success: false, error: "MONGODB_URI is not defined" });
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

    // Use text search if a general search term is provided.
    // This leverages the text index (created separately) for optimized search.
    if (q) {
      query.$text = { $search: q };
    }

    // Additionally, add individual filters as exact matches.
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

    res.status(200).json({
      success: true,
      totalCount,
      data,
    });
  } catch (error) {
    console.error("Error retrieving filtered data from MongoDB:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await client.close();
  }
}
