// lib/getData.js
import clientPromise from './mongodb';

const DATABASE_NAME = 'members';
const COLLECTION_NAME = 'airtableRecords';

export async function getData({ page = 1, limit = 50 }) {
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 50;
  const skip = (parsedPage - 1) * parsedLimit;

  const client = await clientPromise;
  const db = client.db(DATABASE_NAME);
  const collection = db.collection(COLLECTION_NAME);

  // Retrieve paginated documents
  const data = await collection.find({}).skip(skip).limit(parsedLimit).toArray();
  const totalCount = await collection.countDocuments();

  return {
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(totalCount / parsedLimit),
    totalCount,
    data,
  };
}
