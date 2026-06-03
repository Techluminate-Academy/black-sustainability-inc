import type { NextApiRequest, NextApiResponse } from "next";
import { getBearerToken, upsertMightyMemberFromWebhook } from "../../../lib/mightyWebhook";
import { runMightyWebhookSideEffects } from "../../../lib/domain/sync/mightyWebhookSideEffects";

function requireWebhookToken(): string {
  const v = process.env.MIGHTY_WEBHOOK_TOKEN;
  if (!v) throw new Error("MIGHTY_WEBHOOK_TOKEN is not defined");
  return v;
}

const CANDIDATE_HEADERS = [
  "x-webhook-secret",
  "x-webhook-token",
  "x-mighty-webhook-secret",
  "x-mighty-webhook-token",
  "x-mighty-secret",
  "x-mighty-token",
];

function pickStringHeader(req: NextApiRequest, name: string): string | null {
  const v = req.headers[name];
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

/**
 * Return the secret token (if any) provided by the caller, trying common header styles.
 * Mighty's webhook UI varies; we accept Bearer auth, plain Authorization, and a few
 * vendor-style header names. The actual token value is never logged.
 */
function extractIncomingSecret(req: NextApiRequest): string | null {
  const auth = pickStringHeader(req, "authorization");
  if (auth) {
    const bearer = getBearerToken(auth);
    if (bearer) return bearer;
    return auth.trim();
  }
  for (const h of CANDIDATE_HEADERS) {
    const v = pickStringHeader(req, h);
    if (v) return v;
  }
  return null;
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function logAuthHeaderShape(req: NextApiRequest) {
  const headers = req.headers || {};
  const seen: Record<string, boolean> = {};
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === "authorization" || k.toLowerCase().startsWith("x-")) {
      seen[k.toLowerCase()] = true;
    }
  }
  console.warn("[mighty-webhook] 401 auth-mismatch", {
    seenAuthHeaders: Object.keys(seen),
    authStartsWithBearer: typeof headers.authorization === "string"
      ? headers.authorization.toLowerCase().startsWith("bearer ")
      : false,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const expected = requireWebhookToken();
  const incoming = extractIncomingSecret(req);
  if (!incoming || !constantTimeEquals(incoming, expected)) {
    logAuthHeaderShape(req);
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }

    const correlationId =
      (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"]) ||
      `mwh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const result = await upsertMightyMemberFromWebhook(payload as Record<string, any>);

    if (result.deduped) {
      console.log(JSON.stringify({ msg: "mighty_webhook_deduped", correlationId }));
      return res.status(200).json({ ok: true, result });
    }

    console.log(
      JSON.stringify({
        msg: "mighty_webhook_upsert_ok",
        correlationId,
        matchedBy: result.matchedBy,
        mightyId: result.mightyId,
        email: result.email,
      })
    );

    try {
      await runMightyWebhookSideEffects(result);
    } catch (e) {
      console.error(
        JSON.stringify({
          msg: "mighty_webhook_side_effects_failed",
          correlationId,
          error: (e as Error)?.message,
        })
      );
    }

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

