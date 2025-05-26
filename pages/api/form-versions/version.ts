import type { NextApiRequest, NextApiResponse } from "next";
import redis from "@/lib/redis";
import { connectToDatabase } from "@/lib/mongodb";
import type { FormVersion } from "@/models/formVersion";
import type { Collection } from "mongodb";
import CACHE_EXPIRY from "@/constants/CacheExpiry";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const cachePrefix = "formVersions";
  try {
    // ─── GET ─────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const { version } = req.query;
      const { db } = await connectToDatabase();
      const coll = db.collection("formVersions") as Collection<FormVersion>;

      if (version) {
        const vNum = parseInt(version as string, 10);
        if (isNaN(vNum)) return res.status(400).json({ error: "Invalid version" });

        // Try cache first
        const cacheKey = `${cachePrefix}:${vNum}`;
        const cached = await redis.get(cacheKey);
        if (cached) return res.status(200).json(JSON.parse(cached));

        // Otherwise hit Mongo
        const doc = await coll.findOne({ version: vNum });
        if (!doc) return res.status(404).json({ error: "Version not found" });

        await redis.setEx(cacheKey, CACHE_EXPIRY, JSON.stringify(doc));
        return res.status(200).json(doc);
      }

      // List all
      const listKey = `${cachePrefix}:all`;
      const listCached = await redis.get(listKey);
      if (listCached) return res.status(200).json(JSON.parse(listCached));

      const all = await coll.find({}).sort({ version: -1 }).toArray();
      await redis.setEx(listKey, CACHE_EXPIRY, JSON.stringify(all));
      return res.status(200).json(all);
    }

    // ─── POST ────────────────────────────────────────────────────────────
    if (req.method === "POST") {
      console.log("📥 [form-versions] POST body:", req.body);

      const { fields, status } = req.body as {
        fields: FormVersion["fields"];
        status?: string;
      };
      if (!Array.isArray(fields)) {
        return res.status(400).json({ error: "fields array is required" });
      }

      // Only accept "published", otherwise default to "draft"
      const raw = typeof status === "string" ? status.toLowerCase() : "";
      const theStatus: FormVersion["status"] = raw === "published" ? "published" : "draft";

      const { db } = await connectToDatabase();
      const coll = db.collection("formVersions") as Collection<FormVersion>;

      // Compute next version
      const last = await coll.find({}).sort({ version: -1 }).limit(1).next();
      const nextVersion = last ? last.version + 1 : 1;

      // Build document WITH status
      const newDoc: Omit<FormVersion, '_id'> = {
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        fields,
        status: theStatus,
      };

      // Insert it
      const { insertedId } = await coll.insertOne(newDoc);

      // Assemble full result
      const saved = { _id: insertedId, ...newDoc };
      console.log("✅ [form-versions] Inserted:", saved);

      // Clear caches
      await redis.del(`${cachePrefix}:all`);
      await redis.del(`${cachePrefix}:${nextVersion}`);

      return res.status(201).json(saved);
    }

    // ─── OTHERWISE ────────────────────────────────────────────────────────
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    console.error("❌ form-versions error:", err);
    return res.status(500).json({ error: err.message });
  }
}
