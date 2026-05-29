/**
 * Resolve a member by email for profile verification — Mongo first, one Airtable call only if needed.
 */
import { connectToDatabase } from "../mongodb";
import { findMainRosterRecordByEmail } from "./airtableMainRosterServer";

export type DirectoryMemberHit = {
  recordId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  source: "mongo_airtableRecords" | "airtable";
};

function emailRegex(email: string): RegExp {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

export async function findDirectoryMemberByEmail(
  email: string
): Promise<DirectoryMemberHit | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;

  const { db } = await connectToDatabase();

  const legacy = await db.collection("airtableRecords").findOne(
    { "fields.EMAIL ADDRESS": { $regex: emailRegex(normalized) } },
    {
      projection: {
        id: 1,
        airtableId: 1,
        "fields.FIRST NAME": 1,
        "fields.LAST NAME": 1,
        "fields.EMAIL ADDRESS": 1,
      },
    }
  );

  if (legacy) {
    const recordId = (legacy.id || legacy.airtableId) as string | undefined;
    if (recordId) {
      const f = legacy.fields as Record<string, unknown> | undefined;
      return {
        recordId: String(recordId),
        firstName: typeof f?.["FIRST NAME"] === "string" ? f["FIRST NAME"] : undefined,
        lastName: typeof f?.["LAST NAME"] === "string" ? f["LAST NAME"] : undefined,
        email: normalized,
        source: "mongo_airtableRecords",
      };
    }
  }

  const airtable = await findMainRosterRecordByEmail(normalized);
  if (!airtable) return null;

  return {
    recordId: airtable.id,
    firstName: airtable.firstName,
    lastName: airtable.lastName,
    email: airtable.email,
    source: "airtable",
  };
}
