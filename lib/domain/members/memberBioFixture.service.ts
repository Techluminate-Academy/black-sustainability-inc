import type { Db } from "mongodb";

function emailRegex(email: string): RegExp {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

export async function setMemberBioForTest(
  db: Db,
  email: string,
  bio: string
): Promise<boolean> {
  const now = new Date();
  const result = await db.collection("mightyMembers").updateOne(
    { email: emailRegex(email) },
    {
      $set: {
        bio: bio.trim(),
        updatedAt: now,
        source: "test:bio-fixture",
      },
      $unset: { "fields.BIO": "", "fields.Extended Bio": "", "fields.Short Bio": "" },
    }
  );
  return result.matchedCount > 0;
}

/** Simulates Airtable-sync shape where bio lived only under fields.BIO. */
export async function setMemberLegacyFieldsBioForTest(
  db: Db,
  email: string,
  bio: string
): Promise<boolean> {
  const now = new Date();
  const result = await db.collection("mightyMembers").updateOne(
    { email: emailRegex(email) },
    {
      $set: {
        "fields.BIO": bio.trim(),
        updatedAt: now,
        source: "test:bio-fixture-legacy",
      },
      $unset: { bio: "" },
    }
  );
  return result.matchedCount > 0;
}

export async function clearMemberBioForTest(db: Db, email: string): Promise<boolean> {
  const now = new Date();
  const result = await db.collection("mightyMembers").updateOne(
    { email: emailRegex(email) },
    {
      $unset: {
        bio: "",
        "fields.BIO": "",
        "fields.Extended Bio": "",
        "fields.Short Bio": "",
        "fields.Bio": "",
      },
      $set: { updatedAt: now },
    }
  );
  return result.matchedCount > 0;
}
