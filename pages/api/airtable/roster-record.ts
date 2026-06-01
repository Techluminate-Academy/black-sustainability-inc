import type { NextApiRequest, NextApiResponse } from "next";
import {
  upsertMainRosterByEmail,
  updateMainRosterRecord,
  createMainRosterRecord,
} from "@/lib/server/airtableMainRosterServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (req.method === "PATCH") {
      const recordId =
        typeof req.body?.recordId === "string" ? req.body.recordId.trim() : "";
      const fields = req.body?.fields;
      if (!recordId || !fields || typeof fields !== "object") {
        return res.status(400).json({ error: "recordId and fields are required" });
      }
      const record = await updateMainRosterRecord(recordId, fields);
      return res.status(200).json({ success: true, record });
    }

    const fields = req.body?.fields;
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : typeof fields?.["EMAIL ADDRESS"] === "string"
          ? String(fields["EMAIL ADDRESS"]).trim().toLowerCase()
          : "";

    if (!fields || typeof fields !== "object" || Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "fields are required" });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const result = await upsertMainRosterByEmail(email, fields);
    return res.status(200).json({ success: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[roster-record]", msg);
    return res.status(500).json({ error: "Failed to save record" });
  }
}
