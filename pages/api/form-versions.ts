// pages/api/form-versions.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import type { FormVersion } from "@/models/formVersion";
import redis from "@/lib/redis";
import CACHE_EXPIRY from "@/constants/CacheExpiry";
import { Collection } from "mongodb";

const cachePrefix = "form-version";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { db } = await connectToDatabase();
  const collection = db.collection("formVersions") as Collection<FormVersion>;

  if (req.method === "GET") {
    // If all=true is specified, return all versions
    if (req.query.all === "true") {
      // Clear all caches to ensure fresh data
      await redis.del(`${cachePrefix}:all`);
      await redis.del(`${cachePrefix}:published`);
      
      const versions = await collection.find({}).toArray();
      // Ensure all required fields are present
      const validVersions = versions.map(v => ({
        ...v,
        status: v.status || "draft", // Default to draft if status is missing
        fields: v.fields || [],      // Default to empty array if fields is missing
        updatedAt: v.updatedAt || new Date().toISOString() // Default to now if updatedAt is missing
      })) as FormVersion[];
      return res.status(200).json(validVersions);
    }

    const versions = await collection
      .find({})
      .toArray();
    // Ensure all required fields are present
    const validVersions = versions.map(v => ({
      ...v,
      status: v.status || "draft", // Default to draft if status is missing
      fields: v.fields || [],      // Default to empty array if fields is missing
      updatedAt: v.updatedAt || new Date().toISOString() // Default to now if updatedAt is missing
    })) as FormVersion[];
    return res.status(200).json(validVersions);
  }

  if (req.method === "POST") {
    const { fields } = req.body as { fields: FormVersion["fields"] };

    // Figure out the next version number
    const latest = await collection
      .find({})
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    const nextVersion = latest.length ? latest[0].version + 1 : 1;

    const newDoc: FormVersion = {
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      fields
    };

    await collection.insertOne(newDoc);
    return res.status(201).json(newDoc);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
