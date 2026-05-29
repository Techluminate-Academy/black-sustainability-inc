/**
 * One-time (or repeatable) setup for map support tickets in MongoDB.
 *
 * Creates the `supportTickets` collection in the `members` database and indexes.
 * Usage: npm run setup-support-tickets
 *
 * Requires MONGODB_URI (or NEXT_PUBLIC_MONGODB_URI) in the environment.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { ensureSupportTicketCollections } from "@/lib/domain/support/ensureSupportTicketCollections";
import { SUPPORT_TICKETS_COLLECTION } from "@/lib/mapSupportConfig";

async function main() {
  if (!process.env.MONGODB_URI && !process.env.NEXT_PUBLIC_MONGODB_URI) {
    console.error(
      "Missing MONGODB_URI. Add it to .env or .env.local before running this script."
    );
    process.exit(1);
  }

  await ensureSupportTicketCollections();
  console.log(`✅ MongoDB collection "${SUPPORT_TICKETS_COLLECTION}" is ready (members database).`);
  console.log("   Indexes: ticketNumber (unique), seq, status+seq, createdAt");
}

main().catch((err) => {
  console.error("❌ Support ticket collection setup failed:", err);
  process.exit(1);
});
