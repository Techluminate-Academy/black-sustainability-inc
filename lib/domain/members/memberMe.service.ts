import type { BsnSessionPayload } from "@/lib/bsnSession";
import type { Db } from "mongodb";

export type MemberMeMongoProjection = {
  mightyId?: number;
  email?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  geo?: unknown;
  memberLocationUpdatedAt?: Date;
  locationPromptOptOut?: boolean;
  locationPromptOptOutAt?: Date;
  updatedAt?: Date;
  createdAt?: Date;
  source?: string;
} | null;

export async function getMemberMeForSession(
  db: Db,
  session: BsnSessionPayload
): Promise<MemberMeMongoProjection> {
  const coll = db.collection("mightyMembers");
  return coll.findOne(
    { $or: [{ mightyId: session.mightyId }, { email: session.email }] },
    {
      projection: {
        _id: 0,
        mightyId: 1,
        email: 1,
        location: 1,
        latitude: 1,
        longitude: 1,
        geo: 1,
        memberLocationUpdatedAt: 1,
        locationPromptOptOut: 1,
        locationPromptOptOutAt: 1,
        updatedAt: 1,
        createdAt: 1,
        source: 1,
      },
    }
  ) as Promise<MemberMeMongoProjection>;
}
