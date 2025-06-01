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
  const cachePrefix = "formVersions";
  const { version: queryVersion, all } = req.query;

  try {
    const { db } = await connectToDatabase();
    const coll = db.collection("formVersions") as Collection<FormVersion>;

    // ── CREATE OR PUBLISH VERSION ───────────────────────────────────────
    if (req.method === "POST") {
      const {
        fields,
        status,
        version: bodyVersion,
      } = req.body as {
        fields: FormVersion["fields"];
        status: "draft" | "published";
        version?: number;
      };

      if (!Array.isArray(fields) || (status !== "draft" && status !== "published")) {
        return res.status(400).json({ error: "Missing or invalid fields/status" });
      }

      // If publishing, demote current published to draft
      if (status === "published") {
        const existing = await coll.findOne({ status: "published" });
        if (existing) {
          await coll.updateOne(
            { version: existing.version },
            { $set: { status: "draft", updatedAt: new Date().toISOString() } }
          );
          await redis.del(`${cachePrefix}:${existing.version}`);
          await redis.del(`${cachePrefix}:published`);
        }
      }

      const now = new Date().toISOString();

      // If promoting an existing draft version, update it in place
      if (status === "published" && typeof bodyVersion === "number") {
        const result = await coll.updateOne(
          { version: bodyVersion },
          { $set: { status: "published", fields, updatedAt: now } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Version not found" });
        }
        // Refresh cache
        const updated = await coll.findOne({ version: bodyVersion });
        await redis.set(
          `${cachePrefix}:published`,
          JSON.stringify(updated),
          "EX",
          CACHE_EXPIRY
        );
        await redis.del(`${cachePrefix}:${bodyVersion}`);
        return res
          .status(200)
          .json({ version: bodyVersion, status: "published", updatedAt: now });
      }

      // Otherwise create a brand-new version (draft or publish without specifying version)
      const last = await coll.find().sort({ version: -1 }).limit(1).next();
      const nextVersion = last ? last.version + 1 : 1;
      const newDoc: FormVersion = {
        version: nextVersion,
        status,
        fields,
        updatedAt: now,
      };

      await coll.insertOne(newDoc);
      await redis.del(`${cachePrefix}:all`);
      await redis.set(
        `${cachePrefix}:${nextVersion}`,
        JSON.stringify(newDoc),
        "EX",
        CACHE_EXPIRY
      );
      if (status === "published") {
        await redis.set(
          `${cachePrefix}:published`,
          JSON.stringify(newDoc),
          "EX",
          CACHE_EXPIRY
        );
      }

      return res
        .status(201)
        .json({ version: nextVersion, status, updatedAt: now });
    }

    // ── GET ALL VERSIONS ─────────────────────────────────────────────
    if (req.method === "GET" && all === "true") {
      const listKey = `${cachePrefix}:all`;
      const cachedList = await redis.get(listKey);
      if (cachedList) {
        return res.status(200).json(JSON.parse(cachedList));
      }
      const allDocs = await coll.find({}).sort({ version: -1 }).toArray();
      await redis.set(listKey, JSON.stringify(allDocs), "EX", CACHE_EXPIRY);
      return res.status(200).json(allDocs);
    }

    // ── GET SPECIFIC VERSION ────────────────────────────────────────
    if (req.method === "GET" && queryVersion) {
      const vNum = parseInt(queryVersion as string, 10);
      if (isNaN(vNum)) {
        return res.status(400).json({ error: "Invalid version" });
      }

      const cacheKey = `${cachePrefix}:${vNum}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }

      const doc = await coll.findOne({ version: vNum });
      if (!doc) {
        return res.status(404).json({ error: "Version not found" });
      }

      await redis.set(cacheKey, JSON.stringify(doc), "EX", CACHE_EXPIRY);
      return res.status(200).json(doc);
    }

    // ── GET PUBLISHED VERSION ───────────────────────────────────────
    if (req.method === "GET" && !queryVersion) {
      const publishedKey = `${cachePrefix}:published`;
      const pubCached = await redis.get(publishedKey);
      if (pubCached) {
        return res.status(200).json(JSON.parse(pubCached));
      }

      const published = await coll
        .find({ status: "published" })
        .sort({ version: -1 })
        .limit(1)
        .next();

      if (!published) {
        return res.status(404).json({ error: "No published form found" });
      }

      await redis.set(publishedKey, JSON.stringify(published), "EX", CACHE_EXPIRY);
      return res.status(200).json(published);
    }

    // ── METHOD NOT ALLOWED ──────────────────────────────────────────
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    console.error("❌ form-versions error:", err);
    return res.status(500).json({ error: err.message });
  }
}
