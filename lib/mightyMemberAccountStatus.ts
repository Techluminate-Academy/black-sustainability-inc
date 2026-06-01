import { connectToDatabase } from "./mongodb";
import {
  ACCOUNT_STATUS_ACTIVE,
  ACCOUNT_STATUS_DEACTIVATED,
  type MemberAccountStatus,
  SUBSCRIPTION_STATUS_DEACTIVATED,
  airtableSubscriptionStatusesForMemberStatus,
} from "./domain/member/accountStatus";
import { upsertAirtableMightyMember } from "./airtableMightyMembers";

type AnyObj = Record<string, unknown>;

const DEACTIVATION_EVENT_TYPES = new Set([
  "MemberDeactivated",
  "MemberSuspended",
  "MemberBanned",
  "MemberRemoved",
  "member.deactivated",
  "member.suspended",
  "member.banned",
]);

const REACTIVATION_EVENT_TYPES = new Set([
  "MemberReactivated",
  "MemberUnsuspended",
  "member.reactivated",
]);

function normalizeEventType(eventType: string): string {
  return eventType.trim();
}

/** Infer deactivated from Mighty webhook event name. */
export function isDeactivationWebhookEvent(eventType: string): boolean {
  const t = normalizeEventType(eventType);
  if (DEACTIVATION_EVENT_TYPES.has(t)) return true;
  return /deactivat|suspend|banned|removed from network/i.test(t);
}

export function isReactivationWebhookEvent(eventType: string): boolean {
  const t = normalizeEventType(eventType);
  if (REACTIVATION_EVENT_TYPES.has(t)) return true;
  return /reactivat|unsuspend/i.test(t);
}

/** Infer from Mighty Admin API / webhook member object shape. */
export function inferDeactivatedFromMightyMember(member: AnyObj | null | undefined): boolean | null {
  if (!member || typeof member !== "object") return null;

  if (member.deactivated === true || member.is_deactivated === true) return true;
  if (member.deactivated === false || member.is_deactivated === false) return false;

  const statusCandidates = [
    member.status,
    member.member_status,
    member.network_status,
    member.account_status,
    member.state,
  ];
  for (const s of statusCandidates) {
    if (typeof s !== "string") continue;
    const t = s.trim().toLowerCase();
    if (t === "deactivated" || t === "suspended" || t === "banned" || t === "disabled") return true;
    if (t === "active" || t === "enabled") return false;
  }

  if (member.active === false || member.is_active === false) return true;
  if (member.active === true || member.is_active === true) return false;

  return null;
}

export function resolveAccountStatusFromWebhook(params: {
  eventType: string;
  member?: AnyObj | null;
}): MemberAccountStatus | null {
  if (isDeactivationWebhookEvent(params.eventType)) return ACCOUNT_STATUS_DEACTIVATED;
  if (isReactivationWebhookEvent(params.eventType)) return ACCOUNT_STATUS_ACTIVE;

  const fromMember = inferDeactivatedFromMightyMember(params.member);
  if (fromMember === true) return ACCOUNT_STATUS_DEACTIVATED;
  if (fromMember === false) return ACCOUNT_STATUS_ACTIVE;

  return null;
}

export async function applyMemberAccountStatus(params: {
  email: string;
  mightyId?: number;
  accountStatus: MemberAccountStatus;
  reason?: string;
  syncAirtable?: boolean;
  firstName?: string;
  lastName?: string;
}): Promise<{ mongo: { matchedCount: number }; airtable?: { skipped: boolean } }> {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error("email required");

  const now = new Date();
  const deactivated = params.accountStatus === ACCOUNT_STATUS_DEACTIVATED;
  const col = (await connectToDatabase()).db.collection("mightyMembers");
  const filter =
    typeof params.mightyId === "number" && Number.isFinite(params.mightyId)
      ? { $or: [{ mightyId: params.mightyId }, { email }] }
      : { email };

  const setDoc = {
    ...(typeof params.mightyId === "number" ? { mightyId: params.mightyId } : {}),
    email,
    accountStatus: params.accountStatus,
    ...(deactivated
      ? {
          accountDeactivatedAt: now,
          "subscription.isPaidActive": false,
          "subscription.updatedAt": now,
        }
      : { accountReactivatedAt: now }),
    accountStatusReason: params.reason ?? null,
    accountStatusUpdatedAt: now,
    updatedAt: now,
  };

  const statusList = airtableSubscriptionStatusesForMemberStatus(params.accountStatus);

  const mongoUpdate: Record<string, unknown> = {
    $set: setDoc,
    $addToSet: { "subscription.statuses": { $each: statusList } },
  };
  if (!deactivated) {
    mongoUpdate.$pull = { "subscription.statuses": SUBSCRIPTION_STATUS_DEACTIVATED };
  }

  let mongoResult = await col.updateOne(filter, mongoUpdate, { upsert: false });
  if (mongoResult.matchedCount === 0) {
    mongoResult = await col.updateOne(
      { email },
      {
        $set: setDoc,
        $setOnInsert: { createdAt: now, source: "account-status-sync" },
        $addToSet: { "subscription.statuses": { $each: statusList } },
      },
      { upsert: true }
    );
  }

  let airtable: { skipped: boolean; error?: string } = { skipped: true };
  if (params.syncAirtable !== false) {
    try {
      airtable = await upsertAirtableMightyMember({
        mightyId: params.mightyId,
        email,
        firstName: params.firstName,
        lastName: params.lastName,
        accountStatus: params.accountStatus,
        subscription: {
          statuses: statusList,
          updatedAt: now.toISOString(),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      airtable = { skipped: true, error: msg };
    }
  }

  return { mongo: { matchedCount: mongoResult.matchedCount }, airtable };
}
