import type { NextApiRequest, NextApiResponse } from "next";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import {
  getImpersonationModeFromReq,
  isImpersonationAllowedForEmail,
  type ImpersonationMode,
} from "@/lib/impersonation";

type Response =
  | { ok: true; allowed: boolean; mode: ImpersonationMode | null }
  | { ok: false; error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  const session = getBsnSessionFromReq(req);
  if (!session?.email) {
    return res.status(200).json({ ok: true, allowed: false, mode: null });
  }

  const allowed = isImpersonationAllowedForEmail(session.email);
  if (!allowed) {
    return res.status(200).json({ ok: true, allowed: false, mode: null });
  }

  const mode = getImpersonationModeFromReq(req);
  return res.status(200).json({ ok: true, allowed: true, mode });
}
