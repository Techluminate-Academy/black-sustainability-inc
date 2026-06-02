import type { BsnSessionPayload } from "@/lib/bsnSession";
import { upsertAirtableMightyMember } from "@/lib/airtableMightyMembers";
import {
  ensureMightyMemberAccess,
  MightyMemberAccessError,
} from "@/lib/domain/members/ensureMightyMemberAccess.service";
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
  if (!trimmed) return "Could not save your profile. Please try again.";

  let message = trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { error?: string };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      message = parsed.error.trim();
    }
  } catch {
    /* plain text */
  }

  if (/Couldn't find User/i.test(message) || /Couldn't find Member/i.test(message)) {
    return "We couldn't update your Mighty Networks profile yet. Please try again in a moment, or sign out and sign back in.";
  }
  if (/WHERE\s+"users"/i.test(message) || (/memberships/i.test(message) && /deleted_at/i.test(message))) {
    return "Your profile could not be updated because your Mighty Networks membership is not fully active. Sign in to Mighty Networks with this email, then try again.";
  }
  if (message.startsWith("{") || message.length > 200) {
    return "Could not save your profile. Please try again.";
  }
  return message;
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

export type MemberProfileUpdateResult = {
  profile: MemberMapProfileView;
  mightyId: number;
};

/**
 * Self-service profile update. Mighty Network is source of truth; Mongo and Airtable mirror.
 */
export async function updateMemberProfileFromSession(
  db: Db,
  session: BsnSessionPayload,
  raw: MemberProfileUpdateInput
): Promise<MemberProfileUpdateResult> {
  const firstName = trimRequiredName(raw.firstName, "First name");
  const lastName = trimRequiredName(raw.lastName, "Last name");
  const bio = trimOptionalBio(raw.bio);
  const organizationName = trimOptionalOrganization(raw.organizationName);

  let mightyId = session.mightyId;
  try {
    const access = await ensureMightyMemberAccess({
      email: session.email,
      mightyId: session.mightyId,
      firstName,
      lastName,
    });
    mightyId = access.mightyId;
    if (access.repaired) {
      console.info("[memberProfileUpdate] resolved Mighty member id", {
        email: session.email,
        previousMightyId: session.mightyId,
        mightyId,
      });
    }
  } catch (e) {
    if (e instanceof MightyMemberAccessError) {
      throw new MemberProfileUpdateError(e.message, e.statusCode);
    }
    throw e;
  }

  let patched = await patchMightyMemberProfile({
    mightyMemberId: mightyId,
    patch: { first_name: firstName, last_name: lastName },
  });

  if (!patched.ok && /Couldn't find User/i.test(patched.message)) {
    try {
      const access = await ensureMightyMemberAccess({
        email: session.email,
        mightyId,
        firstName,
        lastName,
      });
      mightyId = access.mightyId;
      patched = await patchMightyMemberProfile({
        mightyMemberId: mightyId,
        patch: { first_name: firstName, last_name: lastName },
      });
    } catch (retryErr) {
      if (retryErr instanceof MightyMemberAccessError) {
        throw new MemberProfileUpdateError(retryErr.message, retryErr.statusCode);
      }
      throw retryErr;
    }
  }

  if (!patched.ok) {
    throw new MemberProfileUpdateError(parseMightyErrorMessage(patched.message), 502);
  }

  await syncTextToMightyCustomField(
    "MIGHTY_BIO_CUSTOM_FIELD_ID",
    mightyId,
    bio ?? "",
    "bio"
  );
  await syncTextToMightyCustomField(
    "MIGHTY_ORGANIZATION_CUSTOM_FIELD_ID",
    mightyId,
    organizationName ?? "",
    "organization"
  );

  let mightyMember = patched.member as Record<string, unknown>;
  if (!mightyMember?.email && !mightyMember?.first_name) {
    mightyMember = (await fetchMightyMemberById(mightyId)) as Record<string, unknown>;
  }

  const fromMighty = profileFieldsFromMightyMember(mightyMember);
  const now = new Date();
  const coll = db.collection("mightyMembers");

  const mongoSet: Record<string, unknown> = {
    email: session.email,
    mightyId,
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
    { $or: [{ mightyId }, { email: session.email }] },
    {
      $set: mongoSet,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await Promise.resolve()
    .then(() =>
      upsertAirtableMightyMember({
        mightyId,
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
    mightyId,
    firstName: fromMighty.firstName || firstName,
    lastName: fromMighty.lastName || lastName,
  });

  return {
    mightyId,
    profile: {
      ...view,
      firstName: fromMighty.firstName || firstName,
      lastName: fromMighty.lastName || lastName,
      bio: bio ?? view.bio,
      organizationName: organizationName ?? view.organizationName,
    },
  };
}

export function sessionPayloadAfterProfileUpdate(
  session: BsnSessionPayload,
  profile: MemberMapProfileView,
  mightyId?: number
): BsnSessionPayload {
  return {
    email: session.email,
    mightyId: mightyId ?? session.mightyId,
    firstName: profile.firstName || session.firstName,
    lastName: profile.lastName || session.lastName,
  };
}
