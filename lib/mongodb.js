import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;
const DATABASE_NAME = "members";

if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");

let cachedClient = global.mongoClient || null;
let cachedDb = global.mongoDb || null;

export async function connectToDatabase() {
  try {
    if (cachedClient && cachedDb) {
      return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      connectTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true
    });
    await client.connect();
    const db = client.db(DATABASE_NAME);

    cachedClient = client;
    cachedDb = db;
    
    if (global) {
      global.mongoClient = client;
      global.mongoDb = db;
    }

    return { client, db };
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw new Error("Could not connect to database");
  }
}
