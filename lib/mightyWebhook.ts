import { connectToDatabase } from "./mongodb";
import { fetchMightyMemberById } from "./mightyAdmin";
import { geocodePhotonFreeText } from "./geocodePhoton";

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

function isObject(v: unknown): v is AnyObj {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

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
  // Prefer webhook event id over resource `id` (Mighty puts member id inside `payload`).
  const v =
    payload?.event_id ??
    payload?.eventId ??
    payload?.webhook_event_id ??
    payload?.id ??
    null;
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
}

export function extractEventAt(payload: AnyObj): Date {
  const v =
    payload?.event_timestamp ??
    payload?.eventTimestamp ??
    payload?.created_at ??
    payload?.createdAt ??
    payload?.occurred_at ??
    payload?.occurredAt ??
    payload?.timestamp ??
    null;

  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.valueOf())) return d;
  }

  return new Date();
}

export function extractMemberId(payload: AnyObj): string | null {
  const nested = isObject(payload?.payload) ? payload.payload : null;
  const candidate =
    payload?.member?.id ??
    payload?.member?.member_id ??
    nested?.member?.id ??
    nested?.member?.member_id ??
    nested?.id ??
    nested?.member_id ??
    payload?.member_id ??
    payload?.memberId ??
    payload?.user_id ??
    payload?.userId ??
    null;

  return typeof candidate === "string" || typeof candidate === "number" ? String(candidate) : null;
}

export function extractMemberEmail(payload: AnyObj): string | null {
  const nested = isObject(payload?.payload) ? payload.payload : null;
  const email =
    payload?.member?.email ??
    nested?.member?.email ??
    nested?.email ??
    payload?.member_email ??
    payload?.email ??
    null;
  if (typeof email !== "string") return null;
  const norm = email.trim().toLowerCase();
  return norm ? norm : null;
}

function looksLikeFullMember(member: AnyObj | null | undefined): boolean {
  if (!isObject(member)) return false;
  // Heuristic: if we have basic profile fields, assume it's "full enough" to write without refetch.
  return Boolean(member.email || member.name || member.first_name || member.last_name || member.profile || member.avatar_url);
}

function pickFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function extractCustomFieldResponse(payload: AnyObj): { customFieldId?: string; text?: string } {
  const nested = isObject(payload?.payload) ? payload.payload : null;
  const p = nested || payload;

  const customFieldId =
    p?.custom_field_id ??
    p?.customFieldId ??
    p?.custom_field?.id ??
    p?.customField?.id ??
    p?.custom_field_response?.custom_field_id ??
    p?.customFieldResponse?.customFieldId ??
    null;

  const text =
    p?.text ??
    p?.value ??
    p?.custom_field_response?.text ??
    p?.customFieldResponse?.text ??
    null;

  return {
    ...(customFieldId != null ? { customFieldId: String(customFieldId) } : {}),
    ...(typeof text === "string" ? { text } : {}),
  };
}

/** Mighty may omit coords; some payloads include lat/lng under various keys. */
function extractLatLng(member: AnyObj): { latitude?: number; longitude?: number } {
  const pairs: [unknown, unknown][] = [
    [member.latitude, member.longitude],
    [member.lat, member.lng],
    [member.profile?.latitude, member.profile?.longitude],
    [member.custom_profile?.latitude, member.custom_profile?.longitude],
  ];
  for (const [la, lo] of pairs) {
    const latitude = pickFiniteNumber(la);
    const longitude = pickFiniteNumber(lo);
    if (latitude != null && longitude != null) return { latitude, longitude };
  }
  return {};
}

/**
 * Mighty Admin API webhooks send `{ event_type, event_id, event_timestamp, payload }`
 * where `payload` is often the member record (or contains `member` + `space`).
 * Normalize to the flatter shape the rest of this module expects.
 */
function normalizeMightyWebhookBody(body: AnyObj): AnyObj {
  if (!isObject(body)) return body;

  const inner = body.payload;
  if (!isObject(inner)) return body;

  const eventType = body.event_type ?? body.type;
  if (typeof eventType !== "string") return body;

  const hasMightyEnvelope =
    body.event_id != null || body.event_timestamp != null || body.event_type != null;
  if (!hasMightyEnvelope) return body;

  const memberFromInner = isObject(inner.member)
    ? inner.member
    : looksLikeFullMember(inner)
      ? inner
      : null;

  const out: AnyObj = {
    ...body,
    type: body.type ?? eventType,
    id: body.id ?? body.event_id,
    created_at: body.created_at ?? body.event_timestamp ?? body.eventTimestamp,
    member: body.member ?? memberFromInner,
  };

  if (body.space == null && isObject(inner.space)) out.space = inner.space;
  if (body.plan == null && isObject(inner.plan)) out.plan = inner.plan;
  if (body.subscription == null && isObject(inner.subscription)) out.subscription = inner.subscription;

  return out;
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

  const { latitude: latFromMember, longitude: lngFromMember } = extractLatLng(member);
  const hasCoords =
    latFromMember != null &&
    lngFromMember != null &&
    Number.isFinite(latFromMember) &&
    Number.isFinite(lngFromMember);

  return {
    ...(typeof mightyId === "number" && Number.isFinite(mightyId) ? { mightyId } : {}),
    ...(email ? { email } : {}),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(location ? { location } : {}),
    ...(bio ? { bio } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(hasCoords
      ? {
          latitude: latFromMember,
          longitude: lngFromMember,
          geo: { type: "Point", coordinates: [lngFromMember!, latFromMember!] },
        }
      : {}),
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
  const normalized = normalizeMightyWebhookBody(payload);
  const eventType = extractEventType(normalized) || "UnknownEvent";
  const eventId = extractEventId(normalized);
  const eventAt = extractEventAt(normalized);

  const memberId = extractMemberId(normalized);
  const email = extractMemberEmail(normalized);

  const embeddedMember = isObject(normalized?.member) ? normalized.member : null;
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

  const isCustomFieldEvent = /customfieldresponse/i.test(eventType);
  const mapLocationCustomFieldIdRaw = process.env.MIGHTY_MAP_LOCATION_CUSTOM_FIELD_ID;
  const mapLocationCustomFieldId = mapLocationCustomFieldIdRaw ? String(mapLocationCustomFieldIdRaw) : null;
  const cf = isCustomFieldEvent ? extractCustomFieldResponse(normalized) : {};
  const isMapLocationCustomFieldEvent =
    isCustomFieldEvent &&
    !!mapLocationCustomFieldId &&
    typeof cf.customFieldId === "string" &&
    cf.customFieldId === mapLocationCustomFieldId &&
    typeof cf.text === "string" &&
    cf.text.trim().length >= 2;

  // If the event is for our Map Location custom field, use that text as the member location.
  // This prevents stale profile `member.location` from overwriting the map source of truth.
  if (isMapLocationCustomFieldEvent) {
    memberDoc.location = cf.text!.trim();
    // Force geocode to run from this new string.
    delete memberDoc.latitude;
    delete memberDoc.longitude;
    delete memberDoc.geo;
  }

  const hasStoredCoords =
    typeof memberDoc.latitude === "number" &&
    typeof memberDoc.longitude === "number" &&
    Number.isFinite(memberDoc.latitude) &&
    Number.isFinite(memberDoc.longitude);

  let coordPatch: AnyObj = {};
  const geocodeEnabled =
    process.env.MIGHTY_WEBHOOK_GEOCODE !== "false" && process.env.MIGHTY_WEBHOOK_GEOCODE !== "0";
  if (!hasStoredCoords && geocodeEnabled && typeof memberDoc.location === "string") {
    const loc = memberDoc.location.trim();
    if (loc.length >= 2) {
      const g = await geocodePhotonFreeText(loc);
      if (g) {
        coordPatch = {
          latitude: g.lat,
          longitude: g.lng,
          geo: { type: "Point", coordinates: [g.lng, g.lat] },
        };
      }
    }
  }

  const { db } = await connectToDatabase();
  const collection = db.collection("mightyMembers");

  // If a member has updated their location via our self-service flow, do not let
  // later Mighty webhooks clobber their location/coords with stale profile data.
  // (Mighty's native `member.location` isn't reliably writable via Admin API; the
  // custom field answer is the source for Mighty UI, while Mongo is the map source.)
  const existing = await collection.findOne(filter, {
    projection: { source: 1, memberLocationUpdatedAt: 1 },
  });
  const existingMemberLocationUpdatedAt =
    existing?.memberLocationUpdatedAt instanceof Date
      ? existing.memberLocationUpdatedAt
      : typeof existing?.memberLocationUpdatedAt === "string" || typeof existing?.memberLocationUpdatedAt === "number"
        ? new Date(existing.memberLocationUpdatedAt)
        : null;

  const protectLocation =
    !isMapLocationCustomFieldEvent &&
    (existing?.source === "member:self-update" ||
      existing?.source === "member:self-service" ||
      (existingMemberLocationUpdatedAt != null &&
        Number.isFinite(existingMemberLocationUpdatedAt.valueOf()) &&
        existingMemberLocationUpdatedAt.valueOf() > eventAt.valueOf()));

  if (protectLocation) {
    delete memberDoc.location;
    delete memberDoc.latitude;
    delete memberDoc.longitude;
    delete memberDoc.geo;
    delete memberDoc.source; // keep original source
    delete coordPatch.latitude;
    delete coordPatch.longitude;
    delete coordPatch.geo;
  }

  const setPatch: AnyObj = {
    ...memberDoc,
    ...coordPatch,
    updatedAt: new Date(),
    "webhooks.mighty.lastEventAt": eventAt,
    ...(eventId ? { "webhooks.mighty.lastEventId": eventId } : {}),
    "webhooks.mighty.lastEventType": eventType,
  };

  // Event-specific patches
  const subscriptionPatch = deriveSubscriptionPatch(eventType, normalized);
  const spacePatch = deriveSpaceMembershipPatch(eventType, normalized);

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

  const subscription = deriveSubscriptionSummary(eventType, normalized);
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

