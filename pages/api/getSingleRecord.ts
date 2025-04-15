import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb"; // Adjust the path as needed

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // Read airtableId from the query
  const { airtableId } = req.query;
  if (!airtableId || typeof airtableId !== "string") {
    return res.status(400).json({ success: false, message: "Missing or invalid airtableId" });
  }

  try {
    const { db } = await connectToDatabase();
    // Query where the field airtableId equals the provided value.
    const record = await db.collection("airtableRecords").findOne({ airtableId });
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (error: any) {
    console.error("Error fetching record:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
