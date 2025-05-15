import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import cookie from "cookie";

type Data =
  | { success: true; data: any }
  | { success: false; message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  // 1) Parse cookies
  const cookies = cookie.parse(req.headers.cookie || "");
  const raw = cookies.bsn_user_data;
  if (!raw) {
    return res
      .status(400)
      .json({ success: false, message: "Missing bsn_user_data cookie" });
  }

  // 2) decode & parse the user object
  let userObj: any;
  try {
    userObj = JSON.parse(decodeURIComponent(raw));
  } catch (err) {
    console.error("Failed to parse cookie JSON:", err);
    return res
      .status(400)
      .json({ success: false, message: "Invalid bsn_user_data cookie" });
  }
  

  const email = userObj.loginEmail;
  const firstName = userObj.contactDetails?.firstName;
  const lastName  = userObj.contactDetails?.lastName;

  if (!email && !(firstName && lastName)) {
    return res.status(400).json({
      success: false,
      message: "Cookie must contain either loginEmail or both firstName+lastName"
    });
  }

  try {
    // 3) Lookup in Mongo, first by email...
    const { db } = await connectToDatabase();
    let record = email
      ? await db
          .collection("airtableRecords")
          .findOne({ "fields.EMAIL ADDRESS": email })
      : null;

    // ...if not found by email, fallback to first+last name
    if (!record && firstName && lastName) {
      record = await db
        .collection("airtableRecords")
        .findOne({
          "fields.FIRST NAME": firstName,
          "fields.LAST NAME":  lastName
        });
    }

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    // 4) Pull off first PHOTO and first LOGO URLs
    const flds = record.fields as Record<string, any>;
    record.fields.photoUrl =
      Array.isArray(flds.PHOTO) && flds.PHOTO.length
        ? flds.PHOTO[0].url
        : "";
    record.fields.logoUrl =
      Array.isArray(flds.LOGO) && flds.LOGO.length
        ? flds.LOGO[0].url
        : "";

    return res.status(200).json({ success: true, data: record });
  } catch (error: any) {
    console.error("getRecordByEmailOrName error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
}
