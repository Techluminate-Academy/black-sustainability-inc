import { connectToDatabase } from "@/lib/integrations/mongodb";
import {
  ensureSupportTicketCollections,
  SUPPORT_TICKET_COUNTERS_COLLECTION,
  SUPPORT_TICKET_COUNTER_ID,
} from "@/lib/domain/support/ensureSupportTicketCollections";
import {
  SUPPORT_TICKETS_COLLECTION,
  formatSupportTicketNumber,
} from "@/lib/mapSupportConfig";

const MAX_MESSAGE_LENGTH = 5000;

export const SUPPORT_TICKET_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export function isSupportTicketStatus(value: unknown): value is SupportTicketStatus {
  return (
    typeof value === "string" &&
    (SUPPORT_TICKET_STATUSES as readonly string[]).includes(value)
  );
}

export type CreateSupportTicketInput = {
  message: string;
  submitterEmail?: string | null;
  submitterName?: string | null;
  mightyId?: number | null;
  pageUrl?: string | null;
  userAgent?: string | null;
  source?: string;
};

export type SupportTicket = {
  ticketNumber: string;
  seq: number;
  message: string;
  submitterEmail: string | null;
  submitterName: string | null;
  mightyId: number | null;
  status: SupportTicketStatus;
  pageUrl: string | null;
  userAgent: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

type CounterDoc = { _id: string; seq: number };

/** Atomically reserve the next sequential ticket number. */
async function nextTicketSeq(): Promise<number> {
  await ensureSupportTicketCollections();
  const { db } = await connectToDatabase();
  const counters = db.collection<CounterDoc>(SUPPORT_TICKET_COUNTERS_COLLECTION);
  const result = await counters.findOneAndUpdate(
    { _id: SUPPORT_TICKET_COUNTER_ID },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  // Support both legacy ({ value }) and modern (document) driver return shapes.
  const raw = result as unknown as
    | { value?: CounterDoc | null }
    | CounterDoc
    | null;
  const doc =
    raw && "value" in raw ? raw.value : (raw as CounterDoc | null);
  const seq = doc?.seq;
  if (typeof seq === "number" && Number.isFinite(seq) && seq >= 1) {
    return seq;
  }
  const current = await counters.findOne({ _id: SUPPORT_TICKET_COUNTER_ID });
  if (current && typeof current.seq === "number" && current.seq >= 1) {
    return current.seq;
  }
  throw new Error("Could not allocate ticket number");
}

/**
 * Persist a support ticket to MongoDB and return it (with a generated ticket number).
 * Throws on invalid input or DB failure; callers decide how to respond.
 */
export async function createSupportTicket(
  input: CreateSupportTicketInput
): Promise<SupportTicket> {
  const message = sanitizeText(input.message, MAX_MESSAGE_LENGTH);
  if (message.length < 3) {
    throw new Error("Please describe the issue (at least a few words).");
  }

  const seq = await nextTicketSeq();
  const ticketNumber = formatSupportTicketNumber(seq);
  const now = new Date();

  const ticket: SupportTicket = {
    ticketNumber,
    seq,
    message,
    submitterEmail: normalizeEmail(input.submitterEmail),
    submitterName: sanitizeText(input.submitterName, 200) || null,
    mightyId:
      typeof input.mightyId === "number" && Number.isFinite(input.mightyId)
        ? input.mightyId
        : null,
    status: "open",
    pageUrl: sanitizeText(input.pageUrl, 2000) || null,
    userAgent: sanitizeText(input.userAgent, 1000) || null,
    source: sanitizeText(input.source, 100) || "map-help",
    createdAt: now,
    updatedAt: now,
  };

  const { db } = await connectToDatabase();
  await db.collection(SUPPORT_TICKETS_COLLECTION).insertOne({ ...ticket });

  return ticket;
}

export type SupportTicketRecord = SupportTicket & { id: string };

export type ListSupportTicketsOptions = {
  status?: SupportTicketStatus;
  limit?: number;
};

/** List tickets newest-first for the admin dashboard. */
export async function listSupportTickets(
  options: ListSupportTicketsOptions = {}
): Promise<SupportTicketRecord[]> {
  await ensureSupportTicketCollections();
  const { db } = await connectToDatabase();
  const filter = options.status ? { status: options.status } : {};
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);

  const docs = await db
    .collection(SUPPORT_TICKETS_COLLECTION)
    .find(filter)
    .sort({ seq: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: unknown };
    return {
      id: String(_id),
      ...(rest as unknown as SupportTicket),
    };
  });
}

/** Counts of tickets grouped by status (for dashboard summary). */
export async function getSupportTicketCounts(): Promise<
  Record<SupportTicketStatus, number> & { total: number }
> {
  await ensureSupportTicketCollections();
  const { db } = await connectToDatabase();
  const rows = await db
    .collection(SUPPORT_TICKETS_COLLECTION)
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();

  const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
  for (const row of rows) {
    if (isSupportTicketStatus(row._id)) {
      counts[row._id] = row.count;
      counts.total += row.count;
    }
  }
  return counts;
}

/** Update a ticket's status by its ticket number (e.g. BSN-000042). */
export async function updateSupportTicketStatus(
  ticketNumber: string,
  status: SupportTicketStatus
): Promise<boolean> {
  await ensureSupportTicketCollections();
  const { db } = await connectToDatabase();
  const result = await db
    .collection(SUPPORT_TICKETS_COLLECTION)
    .updateOne(
      { ticketNumber },
      { $set: { status, updatedAt: new Date() } }
    );
  return result.matchedCount > 0;
}
