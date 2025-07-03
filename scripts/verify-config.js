const { MongoClient } = require('mongodb');

async function verifyConfig() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('Error: MONGODB_URI environment variable is not set');
    console.error('Please add MONGODB_URI to your .env.local file');
    console.error('Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db('members');
    const formVersions = db.collection('formVersions');
    
    const bsnForm = await formVersions.findOne({ version: 1001 });
    console.log('BSN Registration Form Configuration:');
    console.log(JSON.stringify(bsnForm, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verifyConfig(); 