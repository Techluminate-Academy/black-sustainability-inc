import { connectToDatabase } from "../../mongodb";
import type { MightyMemberPlan } from "../../mightyAdmin";
import { subscriptionStatusesIndicateDeactivated } from "../member/accountStatus";
import { MIGHTY_PAID_STATUS_MONGO_PATH } from "./isPaidActiveAuthority";

export type AirtableSubscriptionFields = {
  isPaidActive: boolean | null;
  planNames: string[];
  planIds: string[];
  statuses: string[];
};

export type ResolvedSubscription = {
  isPaidActive: boolean;
  planNames: string[];
  planIds: string[];
  authority: "airtable" | "mighty" | "airtable+mighty" | "wix" | "default_unpaid";
  note?: string;
};

function parseBooleanField(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true" || t === "yes" || t === "1") return true;
    if (t === "false" || t === "no" || t === "0") return false;
  }
  return null;
}

function parseStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

/** Read subscription-shaped columns from the Mighty Members Airtable sync table. */
export function parseAirtableSubscriptionFields(
  fields: Record<string, unknown>
): AirtableSubscriptionFields {
  return {
    isPaidActive: parseBooleanField(fields.isPaidActive),
    planNames: parseStringList(fields.planNames),
    planIds: parseStringList(fields.planIds),
    statuses: parseStringList(fields.subscriptionStatuses),
  };
}

function paidPlanIdsFromEnv(): Set<string> {
  const raw = process.env.MIGHTY_PAID_PLAN_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function mightyPlansIndicatePaid(plans: MightyMemberPlan[]): boolean {
  if (!plans.length) return false;
  const paidIds = paidPlanIdsFromEnv();
  if (paidIds.size > 0) {
    return plans.some((p) => paidIds.has(String(p.id)));
  }
  // No env allowlist: any plan access counts as paid for migration fallback only.
  return plans.length > 0;
}

/**
 * Subscription for map access: Airtable Mighty Members table is primary.
 * When Airtable `isPaidActive` is unset, use Mighty member plans (Admin API) if available.
 */
export function resolveSubscriptionForMember(params: {
  airtable: AirtableSubscriptionFields;
  mightyPlans?: MightyMemberPlan[] | null;
  mightyFetched: boolean;
}): ResolvedSubscription {
  const planNames = [...params.airtable.planNames];
  const planIds = [...params.airtable.planIds];
  let authority: ResolvedSubscription["authority"] = "default_unpaid";
  let note: string | undefined;

  if (params.mightyFetched && params.mightyPlans?.length) {
    for (const p of params.mightyPlans) {
      const id = String(p.id);
      if (p.name && !planNames.includes(p.name)) planNames.push(p.name);
      if (!planIds.includes(id)) planIds.push(id);
    }
  }

  if (subscriptionStatusesIndicateDeactivated(params.airtable.statuses)) {
    return {
      isPaidActive: false,
      planNames,
      planIds,
      authority: "airtable",
      note: "subscriptionStatuses contains deactivated",
    };
  }

  if (typeof params.airtable.isPaidActive === "boolean") {
    const isPaidActive = params.airtable.isPaidActive;
    if (params.mightyFetched && params.mightyPlans) {
      const mightyPaid = mightyPlansIndicatePaid(params.mightyPlans);
      if (mightyPaid !== isPaidActive) {
        note = `Airtable isPaidActive=${isPaidActive} differs from Mighty plan inference=${mightyPaid}`;
      }
      authority = note ? "airtable+mighty" : "airtable";
    } else {
      authority = "airtable";
    }
    return { isPaidActive, planNames, planIds, authority, note };
  }

  if (params.mightyFetched && params.mightyPlans) {
    const isPaidActive = mightyPlansIndicatePaid(params.mightyPlans);
    return {
      isPaidActive,
      planNames,
      planIds,
      authority: "mighty",
      note: "Airtable isPaidActive blank; derived from Mighty plans",
    };
  }

  return {
    isPaidActive: false,
    planNames,
    planIds,
    authority: "default_unpaid",
    note: "No Airtable isPaidActive and Mighty plans unavailable",
  };
}

export async function upsertMightyMemberSubscriptionInMongo(params: {
  mightyId?: number;
  email: string;
  subscription: ResolvedSubscription;
}): Promise<{ matchedCount: number; upsertedCount: number }> {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error("email required");
  const filter =
    typeof params.mightyId === "number" && Number.isFinite(params.mightyId)
      ? { $or: [{ mightyId: params.mightyId }, { email }] }
      : { email };

  const now = new Date();
  const { db } = await connectToDatabase();
  const sub = params.subscription;
  const update = {
    $set: {
      ...(typeof params.mightyId === "number" ? { mightyId: params.mightyId } : {}),
      email,
      [MIGHTY_PAID_STATUS_MONGO_PATH]: sub.isPaidActive,
      "subscription.updatedAt": now,
      "subscription.syncSource":
        sub.authority === "wix"
          ? "wix:mighty-paid-sync"
          : `mighty:bulk-subscription-sync:${sub.authority}`,
      ...(sub.planNames.length ? { "subscription.planNames": sub.planNames } : {}),
      ...(sub.planIds.length ? { "subscription.planIds": sub.planIds } : {}),
      updatedAt: now,
    },
    $addToSet: {
      "subscription.statuses": {
        $each: [sub.authority === "wix" ? "WixPaidSync" : "BulkSubscriptionSync"],
      },
    },
    $setOnInsert: { createdAt: now, source: "mighty:bulk-subscription-sync" },
  };

  let result = await db.collection("mightyMembers").updateOne(filter, update, { upsert: false });
  if (result.matchedCount === 0) {
    result = await db.collection("mightyMembers").updateOne({ email }, update, { upsert: true });
  }

  return { matchedCount: result.matchedCount, upsertedCount: result.upsertedCount ?? 0 };
}
