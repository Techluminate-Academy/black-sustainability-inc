import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import AirtableUtils from "./submitForm";
import redis from "../../lib/redis";

type Data = {
  success: boolean;
  airtable?: any;
  message?: string;
  errorDetails?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  console.log(`[updateMember] Received ${req.method} request.`);

  if (req.method !== "POST") {
    console.warn(`[updateMember] Method ${req.method} not allowed.`);
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { airtableId, fields } = req.body;
  console.log("[updateMember] Request body:", { airtableId, fields });

  if (!airtableId) {
    console.warn("[updateMember] Missing airtableId in request body.");
    return res.status(400).json({ success: false, message: "Missing airtableId" });
  }
  if (!fields) {
    console.warn("[updateMember] Missing fields in request body.");
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  if (typeof fields !== 'object' || fields === null || Object.keys(fields).length === 0) {
    console.warn("[updateMember] Fields object is invalid or empty.", fields);
    return res.status(400).json({ success: false, message: "Fields data is invalid or empty" });
  }

  try {
    // 1) Update in Airtable
    console.log(`[updateMember] Attempting to update Airtable record ID: ${airtableId}`);
    const airtableResult = await AirtableUtils.updateRecord(airtableId, fields);
    const saved = airtableResult.fields;
    console.log("[updateMember] Airtable update successful. Result:", airtableResult);

    // 2) Update in MongoDB
    console.log(`[updateMember] Attempting to update MongoDB for airtableId: ${airtableId}`);
    const { db } = await connectToDatabase();
    const mongoUpdateResult = await db.collection("airtableRecords").updateOne(
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
    console.log("[updateMember] MongoDB update/upsert result:", mongoUpdateResult);
    if (mongoUpdateResult.matchedCount === 0 && mongoUpdateResult.upsertedCount === 0) {
        console.warn(`[updateMember] MongoDB: Document with airtableId ${airtableId} not found and not upserted.`);
    }

    // 3) Delete all search:* cache keys from Redis
    console.log("[updateMember] Clearing Redis search cache.");
    const searchKeys = await redis.keys("search:*");
    if (searchKeys && searchKeys.length > 0) {
      console.log(`[updateMember] Found Redis keys to delete: ${searchKeys.join(", ")}`);
      for (const key of searchKeys) {
        await redis.del(key);
      }
      console.log("[updateMember] Redis search cache cleared.");
    } else {
      console.log("[updateMember] No 'search:*' keys found in Redis to clear.");
    }

    // 4) Respond with updated data
    console.log("[updateMember] Profile update process successful.");
    return res.status(200).json({ success: true, airtable: airtableResult });

  } catch (error: any) {
    console.error("❌ [updateMember] Critical error during profile update:", error);
    let errorDetails: any = {
        message: error.message,
        stack: error.stack,
    };
    if (error.response?.data) {
        errorDetails.axiosResponseData = error.response.data;
    }
    console.error("❌ [updateMember] Error details:", errorDetails);
    return res.status(500).json({ success: false, message: error.message || "An unexpected error occurred.", errorDetails });
  }
}
