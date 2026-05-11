import type { BsnSessionPayload } from "@/lib/bsnSession";
import type { Db } from "mongodb";

export async function persistLocationPromptOptOut(db: Db, session: BsnSessionPayload): Promise<void> {
  const now = new Date();
  const coll = db.collection("mightyMembers");
  await coll.updateOne(
    { mightyId: session.mightyId },
    {
      $set: {
        email: session.email,
        mightyId: session.mightyId,
        locationPromptOptOut: true,
        locationPromptOptOutAt: now,
        updatedAt: now,
        source: "member:location-prompt-optout",
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}
