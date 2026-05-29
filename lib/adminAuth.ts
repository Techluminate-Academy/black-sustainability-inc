import type { NextApiRequest } from "next";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminJwtSecret } from "@/lib/adminJwtSecret";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type AdminTokenPayload = {
  id: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
};

/**
 * Verify the `Authorization: Bearer <adminToken>` header and confirm the admin
 * still exists and is active. Returns the admin identity or null.
 */
export async function verifyAdminRequest(
  req: NextApiRequest
): Promise<AdminIdentity | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as AdminTokenPayload;
    if (decoded.exp && decoded.exp < Date.now() / 1000) return null;

    const { db } = await connectToDatabase();
    const admin = await db
      .collection("adminUsers")
      .findOne({ _id: new ObjectId(decoded.id), isActive: true });
    if (!admin) return null;

    return {
      id: String(admin._id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  } catch {
    return null;
  }
}
