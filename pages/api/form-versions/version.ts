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

      // Validate request body
      if (!fields || !Array.isArray(fields)) {
        return res.status(400).json({ error: "Fields must be an array" });
      }

      if (status !== "draft" && status !== "published") {
        return res.status(400).json({ error: "Status must be either 'draft' or 'published'" });
      }

      const now = new Date().toISOString();

      // If updating an existing version (draft or publishing)
      if (typeof bodyVersion === "number") {
        try {
          // Check if version exists
          const existingVersion = await coll.findOne({ version: bodyVersion });
          if (!existingVersion) {
            return res.status(404).json({ error: "Version not found" });
          }

          // If publishing, handle existing published version
          if (status === "published") {
            const currentPublished = await coll.findOne({ status: "published" });
            if (currentPublished && currentPublished.version !== bodyVersion) {
              await coll.updateOne(
                { version: currentPublished.version },
                { $set: { status: "draft", updatedAt: now } }
              );
              await redis.del(`${cachePrefix}:${currentPublished.version}`);
              await redis.del(`${cachePrefix}:published`);
            }
          }

          // Update the version
          const result = await coll.updateOne(
            { version: bodyVersion },
            { 
              $set: { 
                status,
                fields,
                updatedAt: now
              }
            }
          );

          if (result.modifiedCount === 0) {
            throw new Error("Failed to update version");
          }

          // Update cache
          const updated = await coll.findOne({ version: bodyVersion });
          await redis.del(`${cachePrefix}:${bodyVersion}`);
          if (status === "published") {
            await redis.set(
              `${cachePrefix}:published`,
              JSON.stringify(updated),
              "EX",
              CACHE_EXPIRY
            );
          }

          return res.status(200).json({
            version: bodyVersion,
            status,
            updatedAt: now
          });
        } catch (error) {
          console.error("Error updating version:", error);
          return res.status(500).json({ error: "Failed to update version" });
        }
      }

      // Creating a new version
      try {
        const last = await coll.find().sort({ version: -1 }).limit(1).next();
        const nextVersion = last ? last.version + 1 : 1;
        const newDoc: FormVersion = {
          version: nextVersion,
          status,
          fields,
          updatedAt: now,
        };

        // If publishing new version, handle existing published version
        if (status === "published") {
          const currentPublished = await coll.findOne({ status: "published" });
          if (currentPublished) {
            await coll.updateOne(
              { version: currentPublished.version },
              { $set: { status: "draft", updatedAt: now } }
            );
            await redis.del(`${cachePrefix}:${currentPublished.version}`);
            await redis.del(`${cachePrefix}:published`);
          }
        }

        const result = await coll.insertOne(newDoc);
        if (!result.acknowledged) {
          throw new Error("Failed to create new version");
        }

        // Update cache
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

        return res.status(201).json({
          version: nextVersion,
          status,
          updatedAt: now
        });
      } catch (error) {
        console.error("Error creating new version:", error);
        return res.status(500).json({ error: "Failed to create new version" });
      }
    }

    // ── GET ALL VERSIONS ─────────────────────────────────────────────
    if (req.method === "GET" && all === "true") {
      try {
        const listKey = `${cachePrefix}:all`;
        const cachedList = await redis.get(listKey);
        if (cachedList) {
          return res.status(200).json(JSON.parse(cachedList));
        }
        const allDocs = await coll.find({}).sort({ version: -1 }).toArray();
        await redis.set(listKey, JSON.stringify(allDocs), "EX", CACHE_EXPIRY);
        return res.status(200).json(allDocs);
      } catch (error) {
        console.error("Error fetching all versions:", error);
        return res.status(500).json({ error: "Failed to fetch versions" });
      }
    }

    // ── GET SPECIFIC VERSION ────────────────────────────────────────
    if (req.method === "GET" && queryVersion) {
      try {
        const vNum = parseInt(queryVersion as string, 10);
        if (isNaN(vNum)) {
          return res.status(400).json({ error: "Invalid version number" });
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
      } catch (error) {
        console.error("Error fetching version:", error);
        return res.status(500).json({ error: "Failed to fetch version" });
      }
    }

    // ── GET PUBLISHED VERSION ───────────────────────────────────────
    if (req.method === "GET" && !queryVersion) {
      try {
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
      } catch (error) {
        console.error("Error fetching published version:", error);
        return res.status(500).json({ error: "Failed to fetch published version" });
      }
    }

    // ── METHOD NOT ALLOWED ──────────────────────────────────────────
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    console.error("❌ form-versions error:", err);
    return res.status(500).json({ error: err.message });
  }
}
