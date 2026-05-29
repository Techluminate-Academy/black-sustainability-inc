import type { BsnSessionPayload } from "@/lib/bsnSession";
import { upsertAirtableMightyMember } from "@/lib/airtableMightyMembers";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";
import {
  fetchMightyMemberById,
  patchMightyMemberProfile,
  upsertMightyCustomFieldAnswer,
} from "@/lib/mightyAdmin";
import {
  getMemberMapProfileView,
  type MemberMapProfileView,
} from "@/lib/domain/members/memberMapProfileView.service";
import type { Db } from "mongodb";

export type MemberProfileUpdateInput = {
  firstName: string;
  lastName: string;
  bio?: string | null;
  organizationName?: string | null;
};

export class MemberProfileUpdateError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "MemberProfileUpdateError";
  }
}

const NAME_MAX = 80;
const BIO_MAX = 5000;
const ORG_MAX = 200;

function trimRequiredName(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new MemberProfileUpdateError(`${label} is required`);
  }
  const t = value.trim();
  if (t.length < 1 || t.length > NAME_MAX) {
    throw new MemberProfileUpdateError(`${label} must be between 1 and ${NAME_MAX} characters`);
  }
  return t;
}

function trimOptionalBio(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new MemberProfileUpdateError("Bio must be text");
  }
  const t = value.trim();
  if (!t.length) return null;
  if (t.length > BIO_MAX) {
    throw new MemberProfileUpdateError(`Bio must be at most ${BIO_MAX} characters`);
  }
  return t;
}

function trimOptionalOrganization(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new MemberProfileUpdateError("Organization must be text");
  }
  const t = value.trim();
  if (!t.length) return null;
  if (t.length > ORG_MAX) {
    throw new MemberProfileUpdateError(`Organization must be at most ${ORG_MAX} characters`);
  }
  return t;
}

function profileFieldsFromMightyMember(member: Record<string, unknown>): {
  firstName: string;
  lastName: string;
  bio: string | null;
  avatarUrl: string | null;
} {
  const firstName =
    (typeof member.first_name === "string" ? member.first_name : null) ??
    (typeof member.firstName === "string" ? member.firstName : null) ??
    "";
  const lastName =
    (typeof member.last_name === "string" ? member.last_name : null) ??
    (typeof member.lastName === "string" ? member.lastName : null) ??
    "";
  const bio =
    typeof member.bio === "string" && member.bio.trim() ? member.bio.trim() : null;
  const avatarUrl =
    (typeof member.avatar_url === "string" ? member.avatar_url : null) ??
    (typeof member.avatar === "string" ? member.avatar : null) ??
    (typeof member.avatarUrl === "string" ? member.avatarUrl : null);

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    bio,
    avatarUrl: avatarUrl?.trim() || null,
  };
}

function parseMightyErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Mighty profile update failed";
  try {
    const parsed = JSON.parse(trimmed) as { error?: string };
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
  } catch {
    /* plain text */
  }
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
}

async function syncTextToMightyCustomField(
  envKey: string,
  mightyId: number,
  text: string,
  label: string
): Promise<void> {
  const raw = process.env[envKey];
  const customFieldId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(customFieldId)) return;

  const ans = await upsertMightyCustomFieldAnswer({
    customFieldId,
    mightyMemberId: mightyId,
    text,
  });
  if (!ans.ok) {
    console.warn(`[memberProfileUpdate] Mighty ${label} custom field failed (non-fatal):`, ans);
  }
}

/**
 * Self-service profile update. Mighty Network is source of truth; Mongo and Airtable mirror.
 */
export async function updateMemberProfileFromSession(
  db: Db,
  session: BsnSessionPayload,
  raw: MemberProfileUpdateInput
): Promise<MemberMapProfileView> {
  const firstName = trimRequiredName(raw.firstName, "First name");
  const lastName = trimRequiredName(raw.lastName, "Last name");
  const bio = trimOptionalBio(raw.bio);
  const organizationName = trimOptionalOrganization(raw.organizationName);

  const patched = await patchMightyMemberProfile({
    mightyMemberId: session.mightyId,
    patch: { first_name: firstName, last_name: lastName },
  });

  if (!patched.ok) {
    throw new MemberProfileUpdateError(parseMightyErrorMessage(patched.message), 502);
  }

  await syncTextToMightyCustomField(
    "MIGHTY_BIO_CUSTOM_FIELD_ID",
    session.mightyId,
    bio ?? "",
    "bio"
  );
  await syncTextToMightyCustomField(
    "MIGHTY_ORGANIZATION_CUSTOM_FIELD_ID",
    session.mightyId,
    organizationName ?? "",
    "organization"
  );

  let mightyMember = patched.member as Record<string, unknown>;
  if (!mightyMember?.email && !mightyMember?.first_name) {
    mightyMember = (await fetchMightyMemberById(session.mightyId)) as Record<string, unknown>;
  }

  const fromMighty = profileFieldsFromMightyMember(mightyMember);
  const now = new Date();
  const coll = db.collection("mightyMembers");

  const mongoSet: Record<string, unknown> = {
    email: session.email,
    mightyId: session.mightyId,
    firstName: fromMighty.firstName || firstName,
    lastName: fromMighty.lastName || lastName,
    bio,
    organizationName: organizationName ?? null,
        memberProfileUpdatedAt: now,
        updatedAt: now,
        source: "member:profile-update",
  };
  if (fromMighty.avatarUrl) mongoSet.avatarUrl = fromMighty.avatarUrl;

  await coll.updateOne(
    { mightyId: session.mightyId },
    {
      $set: mongoSet,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await Promise.resolve()
    .then(() =>
      upsertAirtableMightyMember({
        mightyId: session.mightyId,
        email: session.email,
        firstName: fromMighty.firstName || firstName,
        lastName: fromMighty.lastName || lastName,
        bio: bio ?? undefined,
        avatarUrl: fromMighty.avatarUrl ?? undefined,
        organizationName: organizationName ?? undefined,
      })
    )
    .catch((e) => {
      console.error("[memberProfileUpdate] Airtable sync failed (non-fatal):", {
        message: (e as Error)?.message,
      });
    });

  await Promise.resolve()
    .then(() => invalidateMightyMemberCaches())
    .catch(() => {});

  const view = await getMemberMapProfileView(db, {
    ...session,
    firstName: fromMighty.firstName || firstName,
    lastName: fromMighty.lastName || lastName,
  });

  return {
    ...view,
    firstName: fromMighty.firstName || firstName,
    lastName: fromMighty.lastName || lastName,
    bio: bio ?? view.bio,
    organizationName: organizationName ?? view.organizationName,
  };
}

export function sessionPayloadAfterProfileUpdate(
  session: BsnSessionPayload,
  profile: MemberMapProfileView
): BsnSessionPayload {
  return {
    email: session.email,
    mightyId: session.mightyId,
    firstName: profile.firstName || session.firstName,
    lastName: profile.lastName || session.lastName,
  };
}
