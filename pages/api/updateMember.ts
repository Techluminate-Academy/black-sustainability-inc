// pages/api/updateMember.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import AirtableUtils from "./submitForm";

type Data = {
  success: boolean;
  airtable?: any;
  message?: string;
};

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
    // 1) Push your update up to Airtable
    const airtableResult = await AirtableUtils.updateRecord(airtableId, fields);
    console.log("→ Airtable returned fields:", JSON.stringify(airtableResult.fields, null, 2));
    // 2) Grab the *actual* fields Airtable saved (including attachments)
    const saved = airtableResult.fields;

    // 3) Mirror that into Mongo, nesting it under `fields`
    const { db } = await connectToDatabase();
  const result=   await db.collection("airtableRecords").updateOne(
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
    console.log("→ Mongo updateOne:", JSON.stringify(result, null, 2));
    return res.status(200).json({ success: true, airtable: airtableResult });
  } catch (error: any) {
    console.error("updateMember error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
