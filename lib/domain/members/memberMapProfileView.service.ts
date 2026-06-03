import type { BsnSessionPayload } from "@/lib/bsnSession";
import { findAirtableMightyMemberByEmail } from "@/lib/airtableMightyMembers";
import { HARDCODED_MEMBER_LEVELS } from "@/constants/member-levels";
import { buildSessionMemberProfile } from "@/lib/domain/members/memberSessionProfile.service";
import { fetchMightyProfileCustomFields } from "@/lib/domain/members/memberMightyCustomFields";
import { getMemberBio } from "@/lib/memberBio";
import type { Db } from "mongodb";

export type MemberMapProfileView = {
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string;
  location: string | null;
  organizationName: string | null;
  bio: string | null;
  memberLevelLabel: string | null;
};

function nonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function memberLevelDisplayLabel(raw: unknown): string | null {
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (typeof id !== "string" || !id.trim()) return null;
  const found = HARDCODED_MEMBER_LEVELS.find((l) => l.id === id.trim());
  return found?.name ?? null;
}

function organizationFromDoc(doc: Record<string, unknown> | null): string | null {
  if (!doc) return null;
  const top = nonEmptyString(doc.organizationName);
  if (top) return top;
  const fields = doc.fields;
  if (fields && typeof fields === "object") {
    return nonEmptyString((fields as Record<string, unknown>)["ORGANIZATION NAME"]);
  }
  return null;
}

function memberLevelFromDoc(doc: Record<string, unknown> | null): string | null {
  if (!doc) return null;
  const top = memberLevelDisplayLabel(doc.memberLevel);
  if (top) return top;
  const fields = doc.fields;
  if (fields && typeof fields === "object") {
    return memberLevelDisplayLabel((fields as Record<string, unknown>)["MEMBER LEVEL"]);
  }
  return null;
}

export async function getMemberMapProfileView(
  db: Db,
  session: BsnSessionPayload
): Promise<MemberMapProfileView> {
  const coll = db.collection("mightyMembers");
  const doc = (await coll.findOne(
    { $or: [{ mightyId: session.mightyId }, { email: session.email }] },
    {
      projection: {
        _id: 0,
        firstName: 1,
        lastName: 1,
        email: 1,
        bio: 1,
        location: 1,
        avatarUrl: 1,
        organizationName: 1,
        memberLevel: 1,
        fields: 1,
      },
    }
  )) as Record<string, unknown> | null;

  const sessionProfile = await buildSessionMemberProfile(db, session);

  const firstName =
    nonEmptyString(doc?.firstName) ?? nonEmptyString(session.firstName) ?? "";
  const lastName =
    nonEmptyString(doc?.lastName) ?? nonEmptyString(session.lastName) ?? "";
  const email =
    nonEmptyString(doc?.email) ?? nonEmptyString(session.email) ?? "";
  const photoUrl =
    nonEmptyString(doc?.avatarUrl) ?? nonEmptyString(sessionProfile.avatarUrl) ?? "";

  const mongoBio = getMemberBio(doc);
  const mongoOrg = organizationFromDoc(doc);

  let bio = mongoBio;
  let organizationName = mongoOrg;

  if (!bio && email) {
    try {
      const fromAirtable = await findAirtableMightyMemberByEmail(email);
      if (fromAirtable?.bio) bio = fromAirtable.bio;
    } catch (e) {
      console.warn("[memberMapProfileView] Airtable bio lookup failed:", {
        message: (e as Error)?.message,
      });
    }
  }

  if (typeof session.mightyId === "number" && Number.isFinite(session.mightyId)) {
    try {
      const fromMighty = await fetchMightyProfileCustomFields(session.mightyId);
      if (fromMighty.bioLoaded) {
        bio = fromMighty.bio;
      }
      if (fromMighty.organizationLoaded) {
        organizationName = fromMighty.organizationName;
      }

      const heal: Record<string, unknown> = {};
      if (fromMighty.bioLoaded && fromMighty.bio !== mongoBio) {
        heal.bio = fromMighty.bio ?? null;
      }
      if (
        fromMighty.organizationLoaded &&
        fromMighty.organizationName !== mongoOrg
      ) {
        heal.organizationName = fromMighty.organizationName;
      }
      if (Object.keys(heal).length) {
        await coll.updateOne(
          { $or: [{ mightyId: session.mightyId }, { email: session.email }] },
          { $set: { ...heal, updatedAt: new Date() } }
        );
      }
    } catch (e) {
      console.warn("[memberMapProfileView] Mighty custom field read failed:", {
        message: (e as Error)?.message,
      });
    }
  }

  return {
    firstName,
    lastName,
    email,
    photoUrl,
    location: nonEmptyString(doc?.location),
    organizationName,
    bio,
    memberLevelLabel: memberLevelFromDoc(doc),
  };
}
