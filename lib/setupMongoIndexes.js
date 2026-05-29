import { connectToDatabase } from './mongodb.js';

const SUPPORT_TICKETS_COLLECTION = 'supportTickets';

export async function setupVerificationIndexes() {
  try {
    const { db } = await connectToDatabase();
    
    // Create TTL index to automatically delete expired verification codes
    await db.collection('verifications').createIndex(
      { "expiresAt": 1 },
      { expireAfterSeconds: 0 }
    );
    
    // Create index on email for faster lookups
    await db.collection('verifications').createIndex({ "email": 1 });
    
    console.log('✅ Verification indexes created');
  } catch (error) {
    console.error('❌ Error creating verification indexes:', error);
  }
}

/** Indexes for member map support tickets (admin list + ticket number lookup). */
export async function setupSupportTicketIndexes() {
  try {
    const { db } = await connectToDatabase();

    const existing = await db
      .listCollections({ name: SUPPORT_TICKETS_COLLECTION })
      .toArray();
    if (existing.length === 0) {
      await db.createCollection(SUPPORT_TICKETS_COLLECTION);
      console.log(`✅ Created collection "${SUPPORT_TICKETS_COLLECTION}"`);
    }

    const tickets = db.collection(SUPPORT_TICKETS_COLLECTION);

    await tickets.createIndex({ ticketNumber: 1 }, { unique: true });
    await tickets.createIndex({ seq: -1 });
    await tickets.createIndex({ status: 1, seq: -1 });
    await tickets.createIndex({ createdAt: -1 });

    console.log('✅ Support ticket indexes created');
  } catch (error) {
    console.error('❌ Error creating support ticket indexes:', error);
  }
}

export async function setupAllMongoIndexes() {
  await setupVerificationIndexes();
  await setupSupportTicketIndexes();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupAllMongoIndexes();
} 