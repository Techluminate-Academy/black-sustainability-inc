import type { BsnSessionPayload } from "@/lib/bsnSession";
import type { Db } from "mongodb";

export type MemberLocationUpdateInput = {
  location: string;
  latitude: number;
  longitude: number;
};

export async function persistMemberLocationSelfUpdate(
  db: Db,
  session: BsnSessionPayload,
  input: MemberLocationUpdateInput
): Promise<void> {
  const now = new Date();
  const coll = db.collection("mightyMembers");
  await coll.updateOne(
    { mightyId: session.mightyId },
    {
      $set: {
        email: session.email,
        mightyId: session.mightyId,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        geo: { type: "Point", coordinates: [input.longitude, input.latitude] },
        memberLocationUpdatedAt: now,
        updatedAt: now,
        source: "member:self-update",
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}
