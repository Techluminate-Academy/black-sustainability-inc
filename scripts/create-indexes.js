const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const collection = db.collection('airtableRecords');
    
    // Create indexes for better query performance
    console.log('Creating indexes...');
    
    // Index for industry house filtering
    await collection.createIndex({ "fields.PRIMARY INDUSTRY HOUSE": 1 });
    console.log('✅ Created index for PRIMARY INDUSTRY HOUSE');
    
    // Compound index for pagination
    await collection.createIndex({ "fields.PRIMARY INDUSTRY HOUSE": 1, "_id": 1 });
    console.log('✅ Created compound index for pagination');
    
    // Index for search functionality
    await collection.createIndex({ 
      "fields.NAME": "text",
      "fields.ORGANIZATION": "text",
      "fields.BIO": "text",
      "fields.CITY": "text",
      "fields.STATE": "text",
      "fields.COUNTRY": "text"
    });
    console.log('✅ Created text index for search');
    
    // Index for email lookups
    await collection.createIndex({ "fields.EMAIL ADDRESS": 1 });
    console.log('✅ Created index for EMAIL ADDRESS');
    
    console.log('All indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await client.close();
  }
}

createIndexes();
