// pages/api/getData.js
import { MongoClient } from 'mongodb';



const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;

const DATABASE_NAME = 'members';
const COLLECTION_NAME = 'airtableRecords';

export default async function handler(req, res) {
  if (!MONGODB_URI) {
    res.status(500).json({ success: false, error: 'MONGODB_URI is not defined' });
    return;
  }

  // Parse pagination query parameters; default to page 1 with 50 records per page
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Retrieve paginated documents
    const data = await collection.find({}).skip(skip).limit(limit).toArray();

    // Optionally, you can return metadata for pagination
    const totalCount = await collection.countDocuments();

    res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      data,
    });
  } catch (error) {
    console.error("Error retrieving data from MongoDB:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await client.close();
  }
}
// // pages/api/getData.js
// import { getData } from '../../lib/getData';

// export default async function handler(req, res) {
//   try {
//     const result = await getData(req.query);
//     res.status(200).json({ success: true, ...result });
//   } catch (error) {
//     console.error("Error retrieving data from MongoDB:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// }
