import type { NextApiRequest, NextApiResponse } from "next";
import { createFreeSignupRecord, updateFreeSignupRecord } from "@/lib/server/airtableFreeSignupServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const fields = req.body?.fields;
    if (!fields || typeof fields !== "object") {
      return res.status(400).json({ error: "Missing fields object" });
    }
    try {
      const data = await createFreeSignupRecord(fields as Record<string, unknown>);
      return res.status(200).json(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[free-signup-record POST]", msg);
      return res.status(500).json({ error: "Failed to create Airtable record" });
    }
  }

  if (req.method === "PATCH") {
    const recordId = typeof req.body?.recordId === "string" ? req.body.recordId : "";
    const fields = req.body?.fields;
    if (!recordId || !fields || typeof fields !== "object") {
      return res.status(400).json({ error: "Missing recordId or fields" });
    }
    try {
      const data = await updateFreeSignupRecord(recordId, fields as Record<string, unknown>);
      return res.status(200).json(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[free-signup-record PATCH]", msg);
      return res.status(500).json({ error: "Failed to update Airtable record" });
    }
  }

  res.setHeader("Allow", "POST, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
