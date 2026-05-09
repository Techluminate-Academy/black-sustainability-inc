import { connectToDatabase } from './mongodb.js';

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
    
    console.log('✅ MongoDB indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating MongoDB indexes:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupVerificationIndexes();
} 