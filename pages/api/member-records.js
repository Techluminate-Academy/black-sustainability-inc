// pages/api/member-records.js
// Uses shared Mongo connection (do not close the cached client).

import { connectToDatabase } from "../../lib/mongodb";

const COLLECTION_NAME = "mightyMembers";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Missing or invalid Authorization header",
    });
  }
  const token = authHeader.split(" ")[1];

  try {
    const { client, db } = await connectToDatabase();
    const userDb = client.db();
    const user = await userDb.collection("users").findOne({ apiToken: token });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid API token" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const collection = db.collection(COLLECTION_NAME);
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
    console.error("Error in member-records:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
