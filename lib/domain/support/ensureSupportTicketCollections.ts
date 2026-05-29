import { connectToDatabase } from "@/lib/integrations/mongodb";
import { SUPPORT_TICKETS_COLLECTION } from "@/lib/mapSupportConfig";

/** Counter document in `counters` for sequential ticket numbers. */
export const SUPPORT_TICKET_COUNTERS_COLLECTION = "counters";
export const SUPPORT_TICKET_COUNTER_ID = "supportTicket";

let ensurePromise: Promise<void> | null = null;

/** Test-only: allow re-running ensure logic between tests. */
export function resetSupportTicketCollectionEnsureForTests(): void {
  ensurePromise = null;
}

/**
 * Ensures the `supportTickets` collection exists in the `members` database and
 * has indexes for ticket numbers, admin listing, and status filters.
 * Safe to call repeatedly (cached after first success).
 */
export async function ensureSupportTicketCollections(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = doEnsure().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  await ensurePromise;
}

async function doEnsure(): Promise<void> {
  const { db } = await connectToDatabase();

  const existing = await db
    .listCollections({ name: SUPPORT_TICKETS_COLLECTION })
    .toArray();

  if (existing.length === 0) {
    await db.createCollection(SUPPORT_TICKETS_COLLECTION);
  }

  const tickets = db.collection(SUPPORT_TICKETS_COLLECTION);
  await tickets.createIndex({ ticketNumber: 1 }, { unique: true });
  await tickets.createIndex({ seq: -1 });
  await tickets.createIndex({ status: 1, seq: -1 });
  await tickets.createIndex({ createdAt: -1 });
}
