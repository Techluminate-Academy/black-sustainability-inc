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
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { recordId, airtableId, updatedData, mappedAirtableFields } = req.body;
  if (!recordId || !airtableId || !updatedData || !mappedAirtableFields) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required parameters" });
  }

  try {
    // 1) Update Airtable
    const airtableResult = await AirtableUtils.updateRecord(recordId, updatedData);

    // 2) Update MongoDB
    const { db } = await connectToDatabase();
    await db.collection("users").updateOne(
      { airtableId },
      { $set: mappedAirtableFields },
      { upsert: true }
    );

    return res.status(200).json({ success: true, airtable: airtableResult });
  } catch (error: any) {
    console.error("updateMember error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
}
