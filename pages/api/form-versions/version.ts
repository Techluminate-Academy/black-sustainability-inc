// pages/api/form-versions.ts

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
      // 1) Fetch a single version if ?version= is present
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
        const coll = db
          .collection("formVersions") as Collection<FormVersion>;
        const doc = await coll.findOne({ version: vNum });
        if (!doc) {
          return res.status(404).json({ error: "Version not found" });
        }

        await redis.setEx(cacheKey, CACHE_EXPIRY, JSON.stringify(doc));
        return res.status(200).json(doc);
      }

      // 2) Otherwise return the list of all versions
      const listKey = `${cachePrefix}:all`;
      const listCached = await redis.get(listKey);
      if (listCached) {
        return res.status(200).json(JSON.parse(listCached));
      }

      {
        const { db } = await connectToDatabase();
        const coll = db
          .collection("formVersions") as Collection<FormVersion>;
        const all = await coll.find({}).sort({ version: -1 }).toArray();
        await redis.setEx(listKey, CACHE_EXPIRY, JSON.stringify(all));
        return res.status(200).json(all);
      }
    }

    // ─── POST ───────────────────────────────────────────────────────────────
    if (method === "POST") {
      const { fields } = body as { fields: FormVersion["fields"] };
      if (!Array.isArray(fields)) {
        return res.status(400).json({ error: "fields array is required" });
      }

      const { db } = await connectToDatabase();
      const coll = db
        .collection("formVersions") as Collection<FormVersion>;

      // figure out next version #
      const latestArr = await coll
        .find({})
        .sort({ version: -1 })
        .limit(1)
        .toArray();
      const nextVersion = latestArr.length ? latestArr[0].version + 1 : 1;

      const newDoc: FormVersion = {
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        fields,
      };
      await coll.insertOne(newDoc);

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
