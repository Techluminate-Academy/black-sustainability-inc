// pages/api/form-versions.ts
import type { NextApiRequest, NextApiResponse } from "next";
import type { Collection } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import type { FormVersion } from "@/models/formVersion";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Reuse your existing connection util
  const { db } = await connectToDatabase();

  // Cast to our typed interface
  const collection = db
    .collection("formVersions") as Collection<FormVersion>;

  if (req.method === "GET") {
    const versions = await collection
      .find({})
      .sort({ version: -1 })
      .toArray();
    return res.status(200).json(versions);
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

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end("Method Not Allowed");
}
