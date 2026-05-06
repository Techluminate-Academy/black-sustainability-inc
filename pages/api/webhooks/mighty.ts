import type { NextApiRequest, NextApiResponse } from "next";
import { getBearerToken, upsertMightyMemberFromWebhook } from "../../../lib/mightyWebhook";
import { upsertAirtableMightyMember } from "../../../lib/airtableMightyMembers";

function requireWebhookToken(): string {
  const v = process.env.MIGHTY_WEBHOOK_TOKEN;
  if (!v) throw new Error("MIGHTY_WEBHOOK_TOKEN is not defined");
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const token = getBearerToken(req.headers.authorization);
  if (!token || token !== requireWebhookToken()) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }

    const result = await upsertMightyMemberFromWebhook(payload as Record<string, any>);

    // Fire-and-forget Airtable upsert so webhook responds quickly.
    // Mongo is the source of truth; Airtable is best-effort near-real-time.
    Promise.resolve()
      .then(async () => {
        await upsertAirtableMightyMember({
          ...result.member,
          subscription: result.subscription,
        });
      })
      .catch((e) => {
        console.error("Airtable upsert failed (non-fatal):", { message: (e as any)?.message });
      });

    return res.status(200).json({ ok: true, result });
  } catch (err: any) {
    // Always include enough context for debugging, but do not echo secrets.
    console.error("Mighty webhook handler error:", {
      message: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}

