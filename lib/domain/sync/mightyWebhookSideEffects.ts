import { upsertAirtableMightyMember } from "@/lib/airtableMightyMembers";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";
import { isJoinMapSignupInFlight } from "@/lib/server/joinMapSignupLock";

export type MightyWebhookSideEffectInput = {
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
};

/**
 * Best-effort mirror to Airtable and Redis cache bust after Mongo upsert.
 */
export async function runMightyWebhookSideEffects(result: MightyWebhookSideEffectInput): Promise<void> {
  await Promise.resolve()
    .then(async () => {
      if (await isJoinMapSignupInFlight(result.member.email)) {
        console.info(
          JSON.stringify({
            msg: "mighty_webhook_airtable_upsert",
            skipped: true,
            reason: "join_map_signup_in_flight",
            mightyId: result.member.mightyId,
          })
        );
        return;
      }

      const airtable = await upsertAirtableMightyMember({
        ...result.member,
        subscription: result.subscription,
      });
      console.info(
        JSON.stringify({
          msg: "mighty_webhook_airtable_upsert",
          skipped: airtable.skipped,
          action: airtable.action,
          recordId: airtable.recordId,
          mightyId: result.member.mightyId,
          hasBio: typeof result.member.bio === "string" && result.member.bio.length > 0,
        })
      );
    })
    .catch((e) => {
      console.error("Airtable upsert failed (non-fatal):", { message: (e as Error)?.message });
    });

  await Promise.resolve()
    .then(() => invalidateMightyMemberCaches())
    .catch((e) => {
      console.warn("Cache invalidation failed (non-fatal):", { message: (e as Error)?.message });
    });
}
