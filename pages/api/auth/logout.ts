import type { NextApiRequest, NextApiResponse } from "next";
import { BSN_SESSION_COOKIE } from "../../../lib/bsnSession";

function appendClearCookie(res: NextApiResponse, name: string) {
  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.appendHeader("Set-Cookie", parts.join("; "));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ ok: false });
  }

  appendClearCookie(res, BSN_SESSION_COOKIE);
  return res.status(200).json({ ok: true });
}
