import { upsertAirtableMightyMember } from "@/lib/airtableMightyMembers";
import { extractMightyAvatarUrl } from "@/lib/domain/members/mightyAvatar";
import { fetchMightyProfileCustomFields } from "@/lib/domain/members/memberMightyCustomFields";
import {
  parseAirtableSubscriptionFields,
  resolveSubscriptionForMember,
} from "@/lib/domain/billing/mightySubscriptionSync";
import {
  fetchMightyMemberById,
  listMemberPlans,
  readMightyCustomFieldAnswer,
} from "@/lib/mightyAdmin";

function nonEmptyString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function mapLocationFromMightyMember(member: Record<string, unknown>): string | undefined {
  const direct =
    nonEmptyString(member.location) ??
    nonEmptyString(member.city) ??
    nonEmptyString((member.profile as Record<string, unknown> | undefined)?.location);
  return direct;
}

async function mapLocationFromCustomField(mightyId: number): Promise<string | undefined> {
  const raw = process.env.MIGHTY_MAP_LOCATION_CUSTOM_FIELD_ID;
  const fieldId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(fieldId)) return undefined;
  const read = await readMightyCustomFieldAnswer({
    customFieldId: fieldId,
    mightyMemberId: mightyId,
  });
  return read?.loaded ? nonEmptyString(read.text) : undefined;
}

export type MightyToAirtableMemberPayload = Parameters<typeof upsertAirtableMightyMember>[0];

/**
 * Pull one member from Mighty Admin API and shape an Airtable upsert payload.
 */
export async function buildMightyToAirtablePayload(mightyId: number): Promise<MightyToAirtableMemberPayload> {
  const member = (await fetchMightyMemberById(mightyId)) as Record<string, unknown>;
  const nested = (member.member ?? member) as Record<string, unknown>;

  const email =
    nonEmptyString(nested.email)?.toLowerCase() ??
    nonEmptyString(member.email)?.toLowerCase();
  const firstName =
    nonEmptyString(nested.first_name) ?? nonEmptyString(nested.firstName);
  const lastName =
    nonEmptyString(nested.last_name) ?? nonEmptyString(nested.lastName);
  const avatarUrl = extractMightyAvatarUrl(nested) ?? extractMightyAvatarUrl(member);

  const [custom, plans, mapLocationCustom] = await Promise.all([
    fetchMightyProfileCustomFields(mightyId),
    listMemberPlans(mightyId).catch(() => []),
    mapLocationFromCustomField(mightyId).catch(() => undefined),
  ]);

  const location =
    mapLocationCustom ??
    mapLocationFromMightyMember(nested) ??
    mapLocationFromMightyMember(member);

  const resolved = resolveSubscriptionForMember({
    airtable: parseAirtableSubscriptionFields({}),
    mightyPlans: plans,
    mightyFetched: true,
  });

  const now = new Date().toISOString();

  return {
    mightyId,
    email: email ?? undefined,
    firstName,
    lastName,
    avatarUrl: avatarUrl ?? undefined,
    bio: custom.bioLoaded ? (custom.bio ?? "") : undefined,
    location,
    organizationName: custom.organizationLoaded ? (custom.organizationName ?? undefined) : undefined,
    subscription: {
      isPaidActive: resolved.isPaidActive,
      planNames: resolved.planNames,
      planIds: resolved.planIds,
      statuses: resolved.isPaidActive ? ["active"] : [],
      updatedAt: now,
    },
    touchLastSyncDate: true,
  };
}

export async function syncMightyMemberToAirtable(mightyId: number): Promise<{
  skipped: boolean;
  action?: "created" | "updated";
  recordId?: string;
  email?: string;
}> {
  const payload = await buildMightyToAirtablePayload(mightyId);
  const result = await upsertAirtableMightyMember(payload);
  return { ...result, email: payload.email ?? undefined };
}
