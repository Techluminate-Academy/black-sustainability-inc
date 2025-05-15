// pages/api/wix-user.ts (Next.js API route)
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id, email } = req.body;

  if (!email || !id) {
    return res.status(400).json({ message: "Missing email or id" });
  }

  // Optionally store in session or cookies
  // Example: set a cookie (with Next.js and `cookies` package or custom header)
  res.setHeader("Set-Cookie", [
    `bsn_user=${encodeURIComponent(email)}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    `user_id=${encodeURIComponent(id)}; Path=/; HttpOnly; Secure; SameSite=Strict`
  ]);

  return res.status(200).json({ success: true });
}
