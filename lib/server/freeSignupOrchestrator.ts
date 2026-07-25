import {
  createFreeSignupRecord,
  deleteFreeSignupRecord,
} from "@/lib/server/airtableFreeSignupServer";
import { upsertJoinMapMongoMember } from "@/lib/server/joinMapSignupServer";
import { createMightyMember } from "@/lib/mightyAdmin";

function requiredText(fields: Record<string, unknown>, key: string): string {
  return String(fields[key] ?? "").trim();
}

export type FreeSignupAcrossPlatformsResult = {
  airtableRecordId: string;
  mightyId: number;
};

/**
 * A Join Map signup cannot safely reuse an existing Mighty member: Mongo is
 * keyed by email, so continuing would overwrite that member's map profile.
 */
export class FreeSignupDuplicateEmailError extends Error {
  constructor() {
    super("A member already exists with this email address.");
    this.name = "FreeSignupDuplicateEmailError";
  }
}

/**
 * Provision a free signup across the three member-profile destinations.
 *
 * Mighty is created first. An already-existing Mighty member is rejected so a
 * public signup can never overwrite its Mongo profile (which is keyed by email).
 * Airtable is rolled back if Mongo fails, allowing a safe retry without
 * duplicating the roster entry. Free signups remain explicitly unpaid.
 */
export async function createFreeSignupAcrossPlatforms(
  fields: Record<string, unknown>
): Promise<FreeSignupAcrossPlatformsResult> {
  const email = requiredText(fields, "EMAIL ADDRESS").toLowerCase();
  const firstName = requiredText(fields, "FIRST NAME");
  const lastName = requiredText(fields, "LAST NAME");
  if (!email || !firstName || !lastName) {
    throw new Error("Free signup requires first name, last name, and email.");
  }

  const mighty = await createMightyMember({
    email,
    first_name: firstName,
    last_name: lastName,
    send_welcome_email: true,
  });
  if (!mighty.ok) {
    throw new Error(`Mighty member provisioning failed (${mighty.status}).`);
  }
  if (mighty.alreadyExisted) {
    throw new FreeSignupDuplicateEmailError();
  }

  const airtable = await createFreeSignupRecord(fields, mighty.id);
  if (!airtable.id) {
    throw new Error("Airtable did not return a record id.");
  }

  try {
    await upsertJoinMapMongoMember(fields, airtable.id, mighty.id);
  } catch (error) {
    await deleteFreeSignupRecord(airtable.id).catch((rollbackError) => {
      console.error(
        "[free-signup] Airtable rollback failed",
        rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
      );
    });
    throw error;
  }

  return {
    airtableRecordId: airtable.id,
    mightyId: mighty.id,
  };
}
