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
  try {
    const { method, query, body } = req;
    const { version } = query;
    const cachePrefix = "formVersions";

    // ─── GET ────────────────────────────────────────────────────────────────
    if (method === "GET") {
      if (version) {
        const vNum = parseInt(version as string, 10);
        if (isNaN(vNum)) {
          return res.status(400).json({ error: "Invalid version" });
        }

        const cacheKey = `${cachePrefix}:${vNum}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.status(200).json(JSON.parse(cached));
        }

        const { db } = await connectToDatabase();
        const coll = db.collection("formVersions") as Collection<FormVersion>;
        const doc = await coll.findOne({ version: vNum });
        if (!doc) {
          return res.status(404).json({ error: "Version not found" });
        }

        await redis.setEx(cacheKey, CACHE_EXPIRY, JSON.stringify(doc));
        return res.status(200).json(doc);
      }

      const listKey = `${cachePrefix}:all`;
      const listCached = await redis.get(listKey);
      if (listCached) {
        return res.status(200).json(JSON.parse(listCached));
      }

      const { db } = await connectToDatabase();
      const coll = db.collection("formVersions") as Collection<FormVersion>;
      const all = await coll.find({}).sort({ version: -1 }).toArray();
      await redis.setEx(listKey, CACHE_EXPIRY, JSON.stringify(all));
      return res.status(200).json(all);
    }

    // ─── POST ───────────────────────────────────────────────────────────────
    if (method === "POST") {
      // Log incoming payload
      console.log("📥 [form-versions] POST body:", JSON.stringify(body));

      const { fields, status } = body as {
        fields: FormVersion["fields"];
        status?: FormVersion["status"];
      };

      if (!Array.isArray(fields)) {
        return res.status(400).json({ error: "fields array is required" });
      }

      // default to draft unless client explicitly asks for "published"
      const theStatus: FormVersion["status"] =
        status === "published" ? "published" : "draft";

      const { db } = await connectToDatabase();
      const coll = db.collection("formVersions") as Collection<FormVersion>;

      // figure out next version #
      const latestArr = await coll
        .find({})
        .sort({ version: -1 })
        .limit(1)
        .toArray();
      const nextVersion = latestArr.length ? latestArr[0].version + 1 : 1;

      // now include `status` in the document
      const newDoc: FormVersion = {
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        fields,
        status: theStatus,
      };
      console.dir(newDoc, { depth: null })
      await coll.insertOne(newDoc);

      // Log what we just stored
      console.log("✅ [form-versions] Inserted:", newDoc);

      // invalidate caches
      await redis.del(`${cachePrefix}:all`);
      await redis.del(`${cachePrefix}:${nextVersion}`);

      return res.status(201).json(newDoc);
    }

    // ─── FALLBACK ────────────────────────────────────────────────────────────
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (err: any) {
    console.error("❌ form-versions error:", err);
    return res.status(500).json({ error: err.message });
  }
}
