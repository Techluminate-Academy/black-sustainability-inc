import type { NextApiRequest, NextApiResponse } from "next";
import { runNonPayingBackfill } from "@/lib/backfills/nonPayingBackfill";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let dryRun = true;
  let createIfMissing = false;
  if (typeof req.body?.dryRun === "boolean") dryRun = req.body.dryRun;
  if (typeof req.body?.createIfMissing === "boolean") createIfMissing = req.body.createIfMissing;

  const report = await runNonPayingBackfill({ dryRun, createIfMissing });
  return res.status(200).json(report);
}
