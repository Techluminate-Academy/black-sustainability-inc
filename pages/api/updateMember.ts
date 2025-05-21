import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import AirtableUtils from "./submitForm";
import redis from "../../lib/redis";
import { promisify } from "util";
import zlib from "zlib";

type Data = {
  success: boolean;
  airtable?: any;
  message?: string;
};

const inflate = promisify(zlib.inflate);
const deflate = promisify(zlib.deflate);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { airtableId, fields } = req.body;
  if (!airtableId || !fields) {
    return res.status(400).json({ success: false, message: "Missing airtableId or fields" });
  }

  try {
    // 1) Update in Airtable
    const airtableResult = await AirtableUtils.updateRecord(airtableId, fields);
    const saved = airtableResult.fields;

    // 2) Update in MongoDB
    const { db } = await connectToDatabase();
    await db.collection("airtableRecords").updateOne(
      { airtableId },
      {
        $set: {
          fields: saved,
          id: airtableResult.id,
          createdTime: airtableResult.createdTime,
        }
      },
      { upsert: true }
    );

    // 3) Delete all search:* cache keys from Redis
    const searchKeys = await redis.keys("search:*");
    for (const key of searchKeys) {
      await redis.del(key);
    }
    // 4) Respond with updated data
    return res.status(200).json({ success: true, airtable: airtableResult });

  } catch (error: any) {
    console.error("❌ updateMember error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
