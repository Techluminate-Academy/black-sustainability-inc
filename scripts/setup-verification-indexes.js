// Run this script once to set up MongoDB indexes for verification codes
// Usage: node scripts/setup-verification-indexes.js

const { MongoClient } = require('mongodb');

async function setupIndexes() {
  const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;

if (!MONGODB_URI) {
  console.log('⚠️  MONGODB_URI not set. Please add NEXT_PUBLIC_MONGODB_URI to your .env.local file');
  console.log('   Example: NEXT_PUBLIC_MONGODB_URI=mongodb://localhost:27017/members');
    return;
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('members');
    
    // Create TTL index to automatically delete expired verification codes
    await db.collection('verifications').createIndex(
      { "expiresAt": 1 },
      { expireAfterSeconds: 0 }
    );
    
    // Create index on email for faster lookups
    await db.collection('verifications').createIndex({ "email": 1 });
    
    console.log('✅ MongoDB indexes created successfully');
    console.log('   - TTL index on expiresAt (auto-deletes expired codes)');
    console.log('   - Index on email (faster lookups)');
    
    await client.close();
  } catch (error) {
    console.error('❌ Error creating MongoDB indexes:', error.message);
  }
}

setupIndexes(); 