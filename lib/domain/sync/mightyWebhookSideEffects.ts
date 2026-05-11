import { upsertAirtableMightyMember } from "@/lib/airtableMightyMembers";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";

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
      await upsertAirtableMightyMember({
        ...result.member,
        subscription: result.subscription,
      });
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
