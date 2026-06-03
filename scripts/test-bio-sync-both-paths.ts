/**
 * Integration test: map profile update + simulated Mighty webhook → Airtable Extended Bio.
 *
 * Usage: npx tsx scripts/test-bio-sync-both-paths.ts
 */
import "dotenv/config";

import { connectToDatabase } from "../lib/mongodb";
import { findAirtableMightyMemberByEmail, getAirtableMightyBioFieldName } from "../lib/airtableMightyMembers";
import { updateMemberProfileFromSession } from "../lib/domain/members/memberProfileUpdate.service";
import { runMightyWebhookSideEffects } from "../lib/domain/sync/mightyWebhookSideEffects";
import { upsertMightyMemberFromWebhook } from "../lib/mightyWebhook";

const EMAIL = process.env.VERIFY_AIRTABLE_BIO_EMAIL?.trim() || "jerry@techluminateacademy.com";

async function assertAirtableBio(label: string, expected: string): Promise<void> {
  const row = await findAirtableMightyMemberByEmail(EMAIL);
  if (!row) throw new Error(`${label}: Airtable row not found for ${EMAIL}`);
  if (row.bio !== expected) {
    throw new Error(
      `${label}: Airtable bio mismatch.\n  expected: ${expected}\n  actual:   ${row.bio ?? "(empty)"}`
    );
  }
  console.log(JSON.stringify({ pass: label, recordId: row.recordId, bio: row.bio }));
}

async function main() {
  const before = await findAirtableMightyMemberByEmail(EMAIL);
  if (!before?.mightyId) {
    console.error(JSON.stringify({ error: "no_airtable_row", email: EMAIL }));
    process.exit(1);
  }

  const originalBio = before.bio ?? "";
  const mightyId = before.mightyId;
  const bioField = getAirtableMightyBioFieldName();
  const bioFieldId = process.env.MIGHTY_BIO_CUSTOM_FIELD_ID ?? null;

  console.log(
    JSON.stringify({
      msg: "setup",
      email: EMAIL,
      mightyId,
      bioField,
      bioFieldId,
      originalBio: originalBio.slice(0, 80),
    })
  );

  const stampMap = `test-map-${Date.now()}`;
  const { db } = await connectToDatabase();

  // Path 1: map profile update (same as Save Profile API)
  await updateMemberProfileFromSession(db, {
    email: EMAIL,
    mightyId,
    firstName: before.firstName ?? "Jerry",
    lastName: before.lastName ?? "Bony",
  }, {
    firstName: before.firstName ?? "Jerry",
    lastName: before.lastName ?? "Bony",
    bio: stampMap,
  });
  await assertAirtableBio("map_profile_update", stampMap);

  // Path 2: simulated Mighty custom_field_response.updated webhook
  const stampWebhook = `test-webhook-${Date.now()}`;
  if (!bioFieldId) {
    console.error(JSON.stringify({ error: "MIGHTY_BIO_CUSTOM_FIELD_ID not set" }));
    process.exit(1);
  }

  const webhookPayload = {
    event_id: `test_evt_${Date.now()}`,
    event_timestamp: new Date().toISOString(),
    event_type: "custom_field_response.updated",
    payload: {
      custom_field_id: Number(bioFieldId),
      member_id: mightyId,
      value: stampWebhook,
    },
  };

  const webhookResult = await upsertMightyMemberFromWebhook(webhookPayload as Record<string, unknown>);
  if (webhookResult.deduped) {
    throw new Error("webhook deduped unexpectedly on first delivery");
  }
  await runMightyWebhookSideEffects(webhookResult);
  await assertAirtableBio("mighty_webhook", stampWebhook);

  // Restore original bio via map path
  await updateMemberProfileFromSession(db, {
    email: EMAIL,
    mightyId,
    firstName: before.firstName ?? "Jerry",
    lastName: before.lastName ?? "Bony",
  }, {
    firstName: before.firstName ?? "Jerry",
    lastName: before.lastName ?? "Bony",
    bio: originalBio || null,
  });
  await assertAirtableBio("restore", originalBio);

  console.log(JSON.stringify({ msg: "all_passed", paths: ["map_profile_update", "mighty_webhook"] }));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
