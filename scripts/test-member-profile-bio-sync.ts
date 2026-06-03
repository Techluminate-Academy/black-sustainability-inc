/**
 * End-to-end: updateMemberProfileFromSession → Mighty + Mongo + Airtable.
 *
 * Usage:
 *   AIRTABLE_MIGHTY_BIO_FIELD="Extended Bio" npx tsx scripts/test-member-profile-bio-sync.ts
 */
import "dotenv/config";

import { connectToDatabase } from "../lib/mongodb";
import {
  findAirtableMightyMemberByEmail,
  getAirtableMightyBioFieldName,
} from "../lib/airtableMightyMembers";
import {
  MemberProfileUpdateError,
  updateMemberProfileFromSession,
} from "../lib/domain/members/memberProfileUpdate.service";

const EMAIL = process.env.VERIFY_AIRTABLE_BIO_EMAIL?.trim() || "jerry@techluminateacademy.com";

async function main() {
  const before = await findAirtableMightyMemberByEmail(EMAIL);
  if (!before?.mightyId) {
    console.error(JSON.stringify({ error: "airtable_row_not_found", email: EMAIL }));
    process.exit(1);
  }

  const stamp = `map-profile-test-${new Date().toISOString()}`;
  const session = {
    email: EMAIL,
    mightyId: before.mightyId,
    firstName: before.firstName ?? "Jerry",
    lastName: before.lastName ?? "Bony",
  };

  console.log(
    JSON.stringify({
      msg: "start",
      email: EMAIL,
      mightyId: before.mightyId,
      airtableBioField: getAirtableMightyBioFieldName(),
      mightyBioFieldId: process.env.MIGHTY_BIO_CUSTOM_FIELD_ID ?? null,
      beforeBio: before.bio,
      stamp,
    })
  );

  const { db } = await connectToDatabase();
  try {
    const result = await updateMemberProfileFromSession(db, session, {
      firstName: session.firstName!,
      lastName: session.lastName!,
      bio: stamp,
      organizationName: null,
    });
    const after = await findAirtableMightyMemberByEmail(EMAIL);
    const ok = after?.bio === stamp;
    console.log(
      JSON.stringify({
        msg: ok ? "pass" : "fail",
        profileBio: result.profile.bio,
        afterAirtableBio: after?.bio,
        recordId: after?.recordId ?? before.recordId,
        expected: stamp,
      })
    );
    if (!ok) process.exit(1);
  } catch (e) {
    if (e instanceof MemberProfileUpdateError) {
      console.error(JSON.stringify({ error: "profile_update", message: e.message, status: e.statusCode }));
    } else {
      console.error(e instanceof Error ? e.message : String(e));
    }
    process.exit(1);
  }
}

main();
