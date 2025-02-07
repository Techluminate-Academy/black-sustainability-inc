// pages/api/member-records.js

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
const DATABASE_NAME = 'members';         // Name of the database that stores member records.
const COLLECTION_NAME = 'airtableRecords'; // Name of the collection with member data.

export default async function handler(req, res) {
  // Verify that an Authorization header is provided.
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ success: false, error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];

  // Verify the token by checking the user's record in the "users" collection.
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const userDb = client.db(); // Uses the default database in your connection string.
    const user = await userDb.collection('users').findOne({ apiToken: token });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid API token' });
    }
  } catch (error) {
    console.error("Error verifying API token:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }

  // Parse pagination parameters (defaults: page 1, 50 records per page)
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Connect to the members database to retrieve the records.
  let dataClient;
  try {
    dataClient = new MongoClient(MONGODB_URI);
    await dataClient.connect();
    const db = dataClient.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Retrieve paginated documents.
    const data = await collection.find({}).skip(skip).limit(limit).toArray();
    const totalCount = await collection.countDocuments();

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      data,
    });
  } catch (error) {
    console.error("Error retrieving data from MongoDB:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (dataClient) {
      await dataClient.close();
    }
  }
}
