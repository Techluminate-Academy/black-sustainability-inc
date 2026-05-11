/**
 * Map/directory paid visibility is owned by Mighty → MongoDB `mightyMembers.subscription.isPaidActive`
 * (webhook / Admin API paths). Staff Airtable fields are not authoritative for pins.
 *
 * No code outside Mighty sync should call Mongo updates that set `subscription.isPaidActive`.
 */

export const MIGHTY_PAID_STATUS_MONGO_PATH = "subscription.isPaidActive" as const;
