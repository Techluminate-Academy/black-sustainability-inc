// pages/api/filterData.js
import { MongoClient } from "mongodb";

const MONGODB_URI =  process.env.NEXT_PUBLIC_MONGODB_URI;
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

    // Read query parameters: the dropdown selection and pagination parameters.
    const { industryHouse, page, limit } = req.query;
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 50;
    const skip = (currentPage - 1) * recordsPerPage;

    // Build the query object.
    // If a non-empty industryHouse is provided, filter based on it.
    let query = {};
    if (industryHouse && industryHouse !== "") {
      query["fields.PRIMARY INDUSTRY HOUSE"] = industryHouse;
    }

    // Retrieve matching documents with pagination
    const totalCount = await collection.countDocuments(query);
    const data = await collection
      .find(query)
      .skip(skip)
      .limit(recordsPerPage)
      .toArray();

    res.status(200).json({
      success: true,
      page: currentPage,
      limit: recordsPerPage,
      totalPages: Math.ceil(totalCount / recordsPerPage),
      totalCount,
      data,
    });
  } catch (error) {
    console.error("Error filtering data from MongoDB:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await client.close();
  }
}
