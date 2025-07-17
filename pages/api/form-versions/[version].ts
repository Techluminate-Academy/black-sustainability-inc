// pages/api/form-versions/version.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import type { FormVersion } from "@/models/formVersion";
import type { Collection } from "mongodb";
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check admin access from JWT token
  const authHeader = req.headers.authorization;
  let isAdmin = false;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      isAdmin = true;
    } catch (error) {
      console.error('JWT verification failed:', error);
    }
  }

  // If not admin, return access denied
  if (!isAdmin) {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.',
      code: 'ADMIN_REQUIRED'
    });
  }

  const { version: queryVersion } = req.query;

  try {
    const { db } = await connectToDatabase();
    const coll = db.collection("formVersions") as Collection<FormVersion>;

    // ── CREATE OR PUBLISH VERSION ───────────────────────────────────────
    if (req.method === "POST") {
      console.log("📝 Processing form version update...");
      console.log("Request body:", req.body);

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

      // If updating an existing version
      if (typeof bodyVersion === "number") {
        try {
          // Check if version exists
          const existingVersion = await coll.findOne({ version: bodyVersion });
          if (!existingVersion) {
            return res.status(404).json({ error: "Version not found" });
          }

          console.log("Found existing version:", {
            version: existingVersion.version,
            name: existingVersion.name,
            status: existingVersion.status,
            master: existingVersion.master
          });

          // Prevent updates to master configurations
          if (existingVersion.master) {
            return res.status(403).json({ 
              error: "Cannot modify master configurations. Create a new version instead.",
              code: "MASTER_PROTECTED"
            });
          }

          // If the version is published, create a new draft version instead of modifying it
          if (existingVersion.status === "published") {
            console.log(`🔄 Creating new draft version based on published version ${bodyVersion}`);
            
            // Get the next version number
            const last = await coll.find({ master: { $ne: true } }).sort({ version: -1 }).limit(1).next();
            const nextVersion = last ? last.version + 1 : 2000;

            // Create new version based on the existing one
            const newVersion: FormVersion = {
              ...existingVersion,
              _id: undefined, // MongoDB will create a new _id
              version: nextVersion,
              fields: fields,
              status: "draft",
              master: false,
              updatedAt: now
            };

            const insertResult = await coll.insertOne(newVersion);
            if (!insertResult.acknowledged) {
              throw new Error("Failed to create new version");
            }

            console.log(`✅ Created new version ${nextVersion} based on ${bodyVersion}`);
            
            // Return both the new draft version and the current published version
            return res.status(200).json({
              message: "Created new draft version. Original version remains published.",
              currentPublished: bodyVersion,
              newDraft: nextVersion,
              status: "draft",
              updatedAt: now,
              data: newVersion
            });
          }

          // If it's already a draft version, we can update it
          if (status === "published") {
            console.log(`🔄 Publishing version ${bodyVersion}. Checking version state...`);
            
            // First verify this version can be published
            if (!existingVersion.name) {
              return res.status(400).json({ error: "Cannot publish a version without a name" });
            }

            // Find ALL currently published versions of this form
            const currentPublished = await coll.find({ 
              name: existingVersion.name,
              status: "published",
              master: { $ne: true }, // Only look at non-master versions
              version: { $ne: bodyVersion } // Don't include the version we're trying to publish
            }).toArray();

            console.log("Currently published non-master versions:", currentPublished.map(v => ({
              version: v.version,
              name: v.name,
              status: v.status,
              master: v.master
            })));

            // Set all non-master published versions to draft
            if (currentPublished.length > 0) {
              console.log(`📝 Setting ${currentPublished.length} published version(s) to draft`);
              
              const updateResult = await coll.updateMany(
                { 
                  version: { $in: currentPublished.map(v => v.version) }
                },
                { 
                  $set: { 
                    status: "draft",
                    updatedAt: now
                  }
                }
              );

              console.log(`✅ Updated ${updateResult.modifiedCount} version(s) to draft`);
            }
          }

          // Update the draft version
          console.log(`📝 Updating draft version ${bodyVersion}`);
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

          // Get fresh data for response and verification
          const freshData = await coll.findOne({ version: bodyVersion });
          console.log(`✅ Final state of version ${bodyVersion}:`, {
            version: freshData?.version,
            name: freshData?.name,
            status: freshData?.status,
            master: freshData?.master
          });

          // Get all versions of this form to verify the overall state
          const allVersions = await coll.find({ 
            name: existingVersion.name,
            $or: [
              { status: "published" },
              { version: bodyVersion }
            ]
          }).toArray();

          console.log("Final state of all versions:", allVersions.map(v => ({
            version: v.version,
            name: v.name,
            status: v.status,
            master: v.master
          })));

          return res.status(200).json({
            version: bodyVersion,
            status,
            updatedAt: now,
            data: freshData,
            allVersions: allVersions.map(v => ({
              version: v.version,
              name: v.name,
              status: v.status,
              master: v.master
            }))
          });
        } catch (error) {
          console.error("❌ Error updating version:", error);
          return res.status(500).json({ error: "Failed to update version" });
        }
      }

      // Creating a new version from master
      try {
        console.log("📝 Creating new form version...");
        
        // Get the master version if specified
        const masterVersion = req.body.masterVersion;
        let baseConfig: FormVersion | null = null;

        if (masterVersion) {
          baseConfig = await coll.findOne({ version: masterVersion, master: true });
          if (!baseConfig) {
            return res.status(404).json({ error: "Master configuration not found" });
          }
          console.log(`Found master version ${masterVersion}:`, {
            version: baseConfig.version,
            name: baseConfig.name,
            status: baseConfig.status,
            master: baseConfig.master
          });
        }

        // Get the next version number
        const last = await coll.find({ master: { $ne: true } }).sort({ version: -1 }).limit(1).next();
        const nextVersion = last ? last.version + 1 : 2000;

        console.log(`Generated next version number: ${nextVersion}`);

        // Create new version data
        const newVersion: FormVersion = {
          version: nextVersion,
          name: baseConfig?.name || "",
          master: false,
          fields,
          isMultiStep: baseConfig?.isMultiStep || false,
          status: "draft",
          updatedAt: now
        };

        // Insert the new version
        const result = await coll.insertOne(newVersion);
        if (!result.acknowledged) {
          throw new Error("Failed to create new version");
        }

        console.log("✅ Successfully created new version");
        return res.status(200).json({
          version: nextVersion,
          status: "draft",
          updatedAt: now,
          data: newVersion,
          message: baseConfig ? `Created new version based on master version ${masterVersion}` : "Created new version"
        });
      } catch (error) {
        console.error("❌ Error creating new version:", error);
        return res.status(500).json({ error: "Failed to create new version" });
      }
    }

    // ── GET VERSION ───────────────────────────────────────────────────
    if (req.method === "GET") {
      if (!queryVersion) {
        return res.status(400).json({ error: "Version parameter is required" });
      }

      const version = await coll.findOne({ version: Number(queryVersion) });
      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      return res.status(200).json(version);
    }

    // ── DELETE VERSION ───────────────────────────────────────────────────
    if (req.method === "DELETE") {
      if (!queryVersion) {
        return res.status(400).json({ error: "Version parameter is required" });
      }

      const version = await coll.findOne({ version: Number(queryVersion) });
      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      // Prevent deletion of master versions
      if (version.master) {
        return res.status(403).json({ 
          error: "Cannot delete master configurations",
          code: "MASTER_PROTECTED"
        });
      }

      // Prevent deletion of published versions
      if (version.status === "published") {
        return res.status(403).json({ 
          error: "Cannot delete published versions. Unpublish the version first.",
          code: "PUBLISHED_PROTECTED"
        });
      }

      // Delete the version
      const result = await coll.deleteOne({ version: Number(queryVersion) });
      if (result.deletedCount === 0) {
        throw new Error("Failed to delete version");
      }

      return res.status(200).json({ 
        message: `Successfully deleted version ${queryVersion}`,
        deletedVersion: version
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("❌ Error in form version handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
