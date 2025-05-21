import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
const DATABASE_NAME = "members";

if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");

let cachedClient = global.mongoClient || null;
let cachedDb = global.mongoDb || null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DATABASE_NAME);

  global.mongoClient = client;
  global.mongoDb = db;

  return { client, db };
}
