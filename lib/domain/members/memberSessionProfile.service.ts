import { fetchMightyMemberById } from "@/lib/mightyAdmin";
import type { BsnSessionPayload } from "@/lib/bsnSession";
import { extractMightyAvatarUrl } from "@/lib/domain/members/mightyAvatar";
import type { Db } from "mongodb";

export type SessionMemberProfile = {
  email: string;
  mightyId: number;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl: string | null;
};

export async function resolveMemberAvatarUrl(
  db: Db,
  session: BsnSessionPayload
): Promise<string | null> {
  const coll = db.collection("mightyMembers");
  const doc = await coll.findOne(
    { $or: [{ mightyId: session.mightyId }, { email: session.email }] },
    { projection: { avatarUrl: 1 } }
  );

  const stored =
    typeof doc?.avatarUrl === "string" && doc.avatarUrl.trim().length > 0
      ? doc.avatarUrl.trim()
      : null;
  if (stored) return stored;

  try {
    const mighty = await fetchMightyMemberById(session.mightyId);
    const url = extractMightyAvatarUrl(mighty as Record<string, unknown>);
    if (url) {
      await coll
        .updateOne(
          { mightyId: session.mightyId },
          { $set: { avatarUrl: url, updatedAt: new Date() } }
        )
        .catch(() => {});
    }
    return url;
  } catch {
    return null;
  }
}

export async function buildSessionMemberProfile(
  db: Db,
  session: BsnSessionPayload
): Promise<SessionMemberProfile> {
  const avatarUrl = await resolveMemberAvatarUrl(db, session);
  return {
    email: session.email,
    mightyId: session.mightyId,
    firstName: session.firstName ?? null,
    lastName: session.lastName ?? null,
    avatarUrl,
  };
}
