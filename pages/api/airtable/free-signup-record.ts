import type { NextApiRequest, NextApiResponse } from "next";
import { createHash } from "crypto";
import {
  updateFreeSignupRecord,
  fetchFreeSignupRecordById,
  pickPublicWritableFreeSignupFields,
} from "@/lib/server/airtableFreeSignupServer";
import {
  createFreeSignupAcrossPlatforms,
  FreeSignupDuplicateEmailError,
} from "@/lib/server/freeSignupOrchestrator";
import {
  envPositiveInt,
  respondIfRateLimited,
} from "@/lib/server/fixedWindowRateLimit";

function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const windowSec = envPositiveInt("FREE_SIGNUP_RL_WINDOW_SEC", 900);

  if (req.method === "POST") {
    if (
      await respondIfRateLimited(req, res, {
        scope: "free-signup-post-ip",
        max: envPositiveInt("FREE_SIGNUP_RL_POST_MAX", 10),
        windowSec,
      })
    ) {
      return;
    }

    const raw = req.body?.fields;
    if (!raw || typeof raw !== "object") {
      return res.status(400).json({ error: "Missing fields object" });
    }
    const fields = pickPublicWritableFreeSignupFields(raw as Record<string, unknown>);
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No allowed fields to write" });
    }
    try {
      const result = await createFreeSignupAcrossPlatforms(fields);
      return res.status(200).json({
        id: result.airtableRecordId,
        mightySynced: true,
        mongoSynced: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[free-signup-record POST]", msg);
      if (e instanceof FreeSignupDuplicateEmailError) {
        return res.status(409).json({ error: e.message });
      }
      return res.status(500).json({ error: "Failed to create Airtable record" });
    }
  }

  if (req.method === "PATCH") {
    if (
      await respondIfRateLimited(req, res, {
        scope: "free-signup-patch-ip",
        max: envPositiveInt("FREE_SIGNUP_RL_PATCH_MAX", 30),
        windowSec,
      })
    ) {
      return;
    }

    const recordId = typeof req.body?.recordId === "string" ? req.body.recordId.trim() : "";
    const ownerEmail =
      typeof req.body?.ownerEmail === "string" ? req.body.ownerEmail.trim() : "";
    const raw = req.body?.fields;
    if (!recordId || !ownerEmail || !raw || typeof raw !== "object") {
      return res.status(400).json({ error: "Missing recordId, ownerEmail, or fields" });
    }

    const emailIdentity = createHash("sha256")
      .update(normalizeEmail(ownerEmail))
      .digest("hex")
      .slice(0, 48);
    if (
      await respondIfRateLimited(req, res, {
        scope: "free-signup-patch-email",
        max: envPositiveInt("FREE_SIGNUP_RL_PATCH_EMAIL_MAX", 25),
        windowSec,
        identity: emailIdentity,
      })
    ) {
      return;
    }

    let existing;
    try {
      existing = await fetchFreeSignupRecordById(recordId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[free-signup-record PATCH] fetch", msg);
      return res.status(500).json({ error: "Failed to verify record" });
    }
    if (!existing) {
      return res.status(404).json({ error: "Record not found" });
    }

    const recordEmail = existing.fields["EMAIL ADDRESS"];
    if (recordEmail === undefined || recordEmail === null || String(recordEmail).trim() === "") {
      return res.status(403).json({ error: "Record cannot be verified for update" });
    }
    if (normalizeEmail(recordEmail) !== normalizeEmail(ownerEmail)) {
      return res.status(403).json({ error: "Not authorized to update this record" });
    }

    const fields = pickPublicWritableFreeSignupFields(raw as Record<string, unknown>);
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No allowed fields to write" });
    }
    if (
      "EMAIL ADDRESS" in fields &&
      normalizeEmail(fields["EMAIL ADDRESS"]) !== normalizeEmail(ownerEmail)
    ) {
      return res.status(400).json({ error: "EMAIL ADDRESS does not match verified owner" });
    }

    try {
      const data = await updateFreeSignupRecord(recordId, fields);
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
