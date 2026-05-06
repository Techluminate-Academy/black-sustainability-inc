import { connectToDatabase } from "./mongodb";
import { fetchMightyMemberById } from "./mightyAdmin";

export type MightyWebhookEventType =
  | "MemberUpdated"
  | "MemberPurchased"
  | "MemberPlanChanged"
  | "MemberSubscriptionRenewed"
  | "MemberSubscriptionCanceled"
  | "MemberRemovedFromPlan"
  | "MemberJoined"
  | "MemberLeft"
  | "CustomFieldResponseCreated"
  | "CustomFieldResponseUpdated"
  | "CustomFieldResponseRemoved"
  | "MemberTagAdded"
  | "MemberTagRemoved";

type AnyObj = Record<string, any>;

export function getBearerToken(authHeader: unknown): string | null {
  if (typeof authHeader !== "string") return null;
  const m = authHeader.match(/^Bearer\s+(.+)\s*$/i);
  const token = m?.[1]?.trim();
  return token || null;
}

export function extractEventType(payload: AnyObj): string | null {
  return (
    payload?.type ||
    payload?.event ||
    payload?.event_type ||
    payload?.eventType ||
    payload?.name ||
    null
  );
}

export function extractEventId(payload: AnyObj): string | null {
  const v =
    payload?.id ||
    payload?.event_id ||
    payload?.eventId ||
    payload?.webhook_event_id ||
    null;
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
}

export function extractEventAt(payload: AnyObj): Date {
  const v =
    payload?.created_at ||
    payload?.createdAt ||
    payload?.occurred_at ||
    payload?.occurredAt ||
    payload?.timestamp ||
    null;

  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.valueOf())) return d;
  }

  return new Date();
}

export function extractMemberId(payload: AnyObj): string | null {
  const candidate =
    payload?.member?.id ??
    payload?.member?.member_id ??
    payload?.member_id ??
    payload?.memberId ??
    payload?.user_id ??
    payload?.userId ??
    null;

  return typeof candidate === "string" || typeof candidate === "number" ? String(candidate) : null;
}

export function extractMemberEmail(payload: AnyObj): string | null {
  const email =
    payload?.member?.email ??
    payload?.member_email ??
    payload?.email ??
    null;
  if (typeof email !== "string") return null;
  const norm = email.trim().toLowerCase();
  return norm ? norm : null;
}

function isObject(v: unknown): v is AnyObj {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function looksLikeFullMember(member: AnyObj | null | undefined): boolean {
  if (!isObject(member)) return false;
  // Heuristic: if we have basic profile fields, assume it's "full enough" to write without refetch.
  return Boolean(member.email || member.name || member.first_name || member.last_name || member.profile || member.avatar_url);
}

function normalizeMemberDoc(member: AnyObj): AnyObj {
  const email = typeof member.email === "string" ? member.email.trim().toLowerCase() : undefined;

  const firstName =
    typeof member.first_name === "string"
      ? member.first_name
      : typeof member.firstName === "string"
        ? member.firstName
        : undefined;
  const lastName =
    typeof member.last_name === "string"
      ? member.last_name
      : typeof member.lastName === "string"
        ? member.lastName
        : undefined;

  const avatarUrl =
    typeof member.avatar_url === "string"
      ? member.avatar_url
      : typeof member.avatarUrl === "string"
        ? member.avatarUrl
        : undefined;

  const bio = typeof member.bio === "string" ? member.bio : undefined;

  const location =
    typeof member.location === "string"
      ? member.location
      : typeof member.city === "string"
        ? member.city
        : undefined;

  const mightyId =
    typeof member.id === "string" || typeof member.id === "number"
      ? Number(member.id)
      : typeof member.member_id === "string" || typeof member.member_id === "number"
        ? Number(member.member_id)
        : undefined;

  return {
    ...(typeof mightyId === "number" && Number.isFinite(mightyId) ? { mightyId } : {}),
    ...(email ? { email } : {}),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(location ? { location } : {}),
    ...(bio ? { bio } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    source: "mighty:webhook",
  };
}

function deriveSubscriptionPatch(eventType: string, payload: AnyObj): AnyObj {
  // Keep this conservative: only set the fields you said you already use.
  // We also attempt to capture plan identifiers if they exist.
  const planIdCandidates = [
    payload?.plan?.id,
    payload?.plan_id,
    payload?.planId,
    payload?.subscription?.plan?.id,
  ].filter((v) => typeof v === "string" || typeof v === "number");

  const planNameCandidates = [
    payload?.plan?.name,
    payload?.plan_name,
    payload?.planName,
    payload?.subscription?.plan?.name,
  ].filter((v) => typeof v === "string");

  const planIds = planIdCandidates.map((v) => String(v));
  const planNames = planNameCandidates.map((v) => String(v));

  const statusesAdd = [eventType];

  const isPaidActive =
    eventType === "MemberPurchased" ||
    eventType === "MemberPlanChanged" ||
    eventType === "MemberSubscriptionRenewed";

  const isCanceled =
    eventType === "MemberSubscriptionCanceled" || eventType === "MemberRemovedFromPlan";

  const patch: AnyObj = {
    "subscription.updatedAt": new Date(),
    ...(planIds.length ? { "subscription.planIds": planIds } : {}),
    ...(planNames.length ? { "subscription.planNames": planNames } : {}),
  };

  // Only flip paid-active on subscription-affecting events.
  if (isPaidActive) patch["subscription.isPaidActive"] = true;
  if (isCanceled) patch["subscription.isPaidActive"] = false;

  // Maintain a small, unique status list.
  patch.$addToSet = { "subscription.statuses": { $each: statusesAdd } };
  return patch;
}

function deriveSubscriptionSummary(eventType: string, payload: AnyObj): {
  isPaidActive?: boolean;
  planIds?: string[];
  planNames?: string[];
  statuses: string[];
  updatedAt: string;
} {
  const planIdCandidates = [
    payload?.plan?.id,
    payload?.plan_id,
    payload?.planId,
    payload?.subscription?.plan?.id,
  ].filter((v) => typeof v === "string" || typeof v === "number");

  const planNameCandidates = [
    payload?.plan?.name,
    payload?.plan_name,
    payload?.planName,
    payload?.subscription?.plan?.name,
  ].filter((v) => typeof v === "string");

  const planIds = planIdCandidates.map((v) => String(v));
  const planNames = planNameCandidates.map((v) => String(v));

  const isPaidActive =
    eventType === "MemberPurchased" ||
    eventType === "MemberPlanChanged" ||
    eventType === "MemberSubscriptionRenewed"
      ? true
      : eventType === "MemberSubscriptionCanceled" || eventType === "MemberRemovedFromPlan"
        ? false
        : undefined;

  return {
    ...(typeof isPaidActive === "boolean" ? { isPaidActive } : {}),
    ...(planIds.length ? { planIds } : {}),
    ...(planNames.length ? { planNames } : {}),
    statuses: [eventType],
    updatedAt: new Date().toISOString(),
  };
}

function deriveSpaceMembershipPatch(eventType: string, payload: AnyObj): AnyObj | null {
  const spaceId =
    payload?.space?.id ?? payload?.space_id ?? payload?.spaceId ?? payload?.community?.id ?? null;
  if (typeof spaceId !== "string" && typeof spaceId !== "number") return null;

  const isMember = eventType === "MemberJoined";
  const key = `spaces.${String(spaceId)}`;
  return {
    [key]: {
      isMember,
      updatedAt: new Date(),
    },
  };
}

export async function upsertMightyMemberFromWebhook(payload: AnyObj): Promise<{
  matchedBy: "mightyId" | "email";
  mightyId?: number;
  email?: string;
  member: {
    mightyId?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
  };
  subscription: {
    isPaidActive?: boolean;
    planIds?: string[];
    planNames?: string[];
    statuses: string[];
    updatedAt: string;
  };
}> {
  const eventType = extractEventType(payload) || "UnknownEvent";
  const eventId = extractEventId(payload);
  const eventAt = extractEventAt(payload);

  const memberId = extractMemberId(payload);
  const email = extractMemberEmail(payload);

  const embeddedMember = isObject(payload?.member) ? payload.member : null;
  const member =
    looksLikeFullMember(embeddedMember) ? embeddedMember : memberId ? await fetchMightyMemberById(memberId) : embeddedMember;

  if (!isObject(member)) {
    throw new Error("Webhook payload missing member info and no memberId to fetch");
  }

  const memberDoc = normalizeMemberDoc(member);
  const mightyId = typeof memberDoc.mightyId === "number" ? memberDoc.mightyId : undefined;
  const normalizedEmail = typeof memberDoc.email === "string" ? memberDoc.email : email || undefined;

  const filter = mightyId ? { mightyId } : normalizedEmail ? { email: normalizedEmail } : null;
  if (!filter) {
    throw new Error("Cannot upsert member: no mightyId or email");
  }

  const { db } = await connectToDatabase();
  const collection = db.collection("mightyMembers");

  const setPatch: AnyObj = {
    ...memberDoc,
    updatedAt: new Date(),
    "webhooks.mighty.lastEventAt": eventAt,
    ...(eventId ? { "webhooks.mighty.lastEventId": eventId } : {}),
    "webhooks.mighty.lastEventType": eventType,
  };

  // Event-specific patches
  const subscriptionPatch = deriveSubscriptionPatch(eventType, payload);
  const spacePatch = deriveSpaceMembershipPatch(eventType, payload);

  const update: AnyObj = {
    $set: {
      ...setPatch,
      ...(spacePatch || {}),
      // subscriptionPatch may contain $addToSet: handle separately below
      ...Object.fromEntries(Object.entries(subscriptionPatch).filter(([k]) => k !== "$addToSet")),
    },
    $setOnInsert: { createdAt: new Date() },
  };

  if (subscriptionPatch.$addToSet) update.$addToSet = subscriptionPatch.$addToSet;

  await collection.updateOne(filter, update, { upsert: true });

  const subscription = deriveSubscriptionSummary(eventType, payload);
  const memberSummary = {
    mightyId,
    email: normalizedEmail,
    firstName: memberDoc.firstName,
    lastName: memberDoc.lastName,
    avatarUrl: memberDoc.avatarUrl,
    bio: memberDoc.bio,
    location: memberDoc.location,
  };

  return mightyId
    ? { matchedBy: "mightyId", mightyId, email: normalizedEmail, member: memberSummary, subscription }
    : { matchedBy: "email", email: normalizedEmail, member: memberSummary, subscription };
}

