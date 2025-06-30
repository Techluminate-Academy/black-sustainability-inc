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
      console.log("📋 Fetching all form versions...");
      const versions = await collection.find({}).toArray();
      
      // Log current state of all versions
      console.log("Current versions state:", versions.map(v => ({
        version: v.version,
        name: v.name,
        status: v.status,
        master: v.master
      })));
      
      // Ensure all required fields are present
      const validVersions = versions.map(v => ({
        ...v,
        status: v.status || "draft", // Default to draft if status is missing
        fields: v.fields || [],      // Default to empty array if fields is missing
        updatedAt: v.updatedAt || new Date().toISOString() // Default to now if updatedAt is missing
      })) as FormVersion[];
      
      return res.status(200).json(validVersions);
    }

    console.log("📋 Fetching form versions...");
    const versions = await collection.find({}).toArray();
    
    // Log current state
    console.log("Current versions state:", versions.map(v => ({
      version: v.version,
      name: v.name,
      status: v.status,
      master: v.master
    })));
    
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
    console.log("📝 Creating new form version...");
    const { fields, name, masterVersion, isMultiStep } = req.body as { 
      fields: FormVersion["fields"], 
      name?: string,
      masterVersion?: number,
      isMultiStep?: boolean
    };

    let newFields = fields;
    if (masterVersion) {
      // Always fetch master version and copy its fields
      const masterDoc = await collection.findOne({ version: masterVersion });
      if (masterDoc && masterDoc.fields) {
        newFields = masterDoc.fields.map(f => ({ ...f }));
      }
    }

    const latest = await collection
      .find({})
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    const nextVersion = latest.length ? latest[0].version + 1 : 1;

    console.log(`Generated next version number: ${nextVersion}`);

    const newDoc: FormVersion = {
      version: nextVersion,
      name: name || `Form ${nextVersion}`,
      status: "draft",
      master: false,
      masterVersion: masterVersion,
      updatedAt: new Date().toISOString(),
      fields: newFields,
      isMultiStep: isMultiStep || false
    };

    console.log("Creating new version with data:", {
      version: newDoc.version,
      name: newDoc.name,
      status: newDoc.status,
      master: newDoc.master,
      masterVersion: newDoc.masterVersion
    });

    await collection.insertOne(newDoc);
    console.log("✅ Successfully created new version");
    
    return res.status(201).json(newDoc);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
