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

    // Read query parameters for search and pagination
    const {
      q,
      page,
      limit,
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

    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 50;
    const skip = (currentPage - 1) * recordsPerPage;

    // Build the search query object
    let query = {};

    // If a general search term is provided, search across multiple fields
    if (q) {
      const searchRegex = new RegExp(q, "i"); // case-insensitive
      query.$or = [
        { "fields['Time zone']": searchRegex },
        { "fields['State/Province']": searchRegex },
        { "fields['Name (from Location)']": searchRegex },
        { "fields.State": searchRegex },
        { "fields['Location (Nearest City)']": searchRegex },
        { "fields['FIRST NAME']": searchRegex },
        { "fields['LAST NAME']": searchRegex },
        { "fields['FULL NAME']": searchRegex },
        { "fields.Country": searchRegex },
        { "fields.BIO": searchRegex },
      ];
    }

    // Additionally, if individual filter parameters are provided, add them as conditions.
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

    // Retrieve matching documents with pagination
    const totalCount = await collection.countDocuments(query);
    const data = await collection.find(query).skip(skip).limit(recordsPerPage).toArray();

    res.status(200).json({
      success: true,
      page: currentPage,
      limit: recordsPerPage,
      totalPages: Math.ceil(totalCount / recordsPerPage),
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
