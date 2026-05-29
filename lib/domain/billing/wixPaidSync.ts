import type { MemberAuthorization } from "../../billing/aggregateAuthorization";
import { connectToDatabase } from "../../mongodb";
import { findAirtableMightyMemberByEmail, upsertAirtableMightyMember } from "../../airtableMightyMembers";
import { ACCOUNT_STATUS_DEACTIVATED, subscriptionStatusesIndicateDeactivated } from "../member/accountStatus";
import { EQUITY_PROTECTED_EMAILS } from "../../reconciliation/computeWixAirtableDiff";
import {
  type ResolvedSubscription,
  upsertMightyMemberSubscriptionInMongo,
} from "./mightySubscriptionSync";

function wixEvidence(subs: MemberAuthorization["sourceSubscriptions"]): string {
  return subs
    .map((s) => `${s.subscriptionStatus}/${s.lastPaymentStatus}${s.plan ? ` (${s.plan})` : ""}`)
    .join("; ");
}

export function resolvedSubscriptionFromWix(auth: MemberAuthorization): ResolvedSubscription {
  const planNames = [
    ...new Set(
      auth.sourceSubscriptions.map((s) => s.plan?.trim()).filter((p): p is string => Boolean(p))
    ),
  ];
  if (auth.memberLevel && !planNames.includes(auth.memberLevel)) {
    planNames.unshift(auth.memberLevel);
  }

  return {
    isPaidActive: auth.authorized,
    planNames,
    planIds: [],
    authority: "wix",
    note: auth.authorized
      ? `Wix authorized: ${wixEvidence(auth.sourceSubscriptions)}`
      : `Wix not authorized: ${wixEvidence(auth.sourceSubscriptions)}`,
  };
}

export type WixPaidSyncRowResult = {
  email: string;
  action: "applied" | "would_apply" | "skipped" | "error";
  reason?: string;
  mightyId?: number | null;
  airtableRecordId?: string | null;
  mongoMatched?: number;
  isPaidActive?: boolean;
  planNames?: string[];
};

export async function syncWixAuthorizationToMightySystems(params: {
  auth: MemberAuthorization;
  apply: boolean;
}): Promise<WixPaidSyncRowResult> {
  const email = params.auth.email.trim().toLowerCase();
  if (!email) {
    return { email: "", action: "error", reason: "missing email" };
  }

  if (EQUITY_PROTECTED_EMAILS.has(email)) {
    return { email, action: "skipped", reason: "equity_protected" };
  }

  if (!params.auth.authorized) {
    return { email, action: "skipped", reason: "wix_not_authorized" };
  }

  const { db } = await connectToDatabase();
  const mongoRow = await db.collection("mightyMembers").findOne(
    { email },
    { projection: { mightyId: 1, accountStatus: 1 } }
  );

  if (mongoRow?.accountStatus === ACCOUNT_STATUS_DEACTIVATED) {
    return { email, action: "skipped", reason: "deactivated_in_mongo", mightyId: mongoRow.mightyId ?? null };
  }

  const airtableRow = await findAirtableMightyMemberByEmail(email);
  if (
    airtableRow &&
    subscriptionStatusesIndicateDeactivated(airtableRow.subscriptionStatuses ?? [])
  ) {
    return {
      email,
      action: "skipped",
      reason: "deactivated_in_airtable",
      mightyId: airtableRow.mightyId,
      airtableRecordId: airtableRow.recordId,
    };
  }

  const subscription = resolvedSubscriptionFromWix(params.auth);
  const mightyId =
    (typeof mongoRow?.mightyId === "number" ? mongoRow.mightyId : null) ??
    airtableRow?.mightyId ??
    undefined;

  if (!params.apply) {
    return {
      email,
      action: "would_apply",
      mightyId: mightyId ?? null,
      airtableRecordId: airtableRow?.recordId ?? null,
      isPaidActive: subscription.isPaidActive,
      planNames: subscription.planNames,
    };
  }

  try {
    const mongo = await upsertMightyMemberSubscriptionInMongo({
      email,
      mightyId,
      subscription,
    });

    if (airtableRow?.recordId) {
      await upsertAirtableMightyMember({
        mightyId,
        email,
        firstName: airtableRow.firstName ?? undefined,
        lastName: airtableRow.lastName ?? undefined,
        subscription: {
          isPaidActive: true,
          planNames: subscription.planNames,
          statuses: ["paid"],
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return {
      email,
      action: "applied",
      mightyId: mightyId ?? null,
      airtableRecordId: airtableRow?.recordId ?? null,
      mongoMatched: mongo.matchedCount + (mongo.upsertedCount ?? 0),
      isPaidActive: true,
      planNames: subscription.planNames,
      ...(airtableRow ? {} : { reason: "no_airtable_mighty_members_row" }),
    };
  } catch (e) {
    return {
      email,
      action: "error",
      reason: e instanceof Error ? e.message : String(e),
      mightyId: mightyId ?? null,
      airtableRecordId: airtableRow?.recordId ?? null,
    };
  }
}
