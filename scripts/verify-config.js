const { MongoClient } = require('mongodb');

async function verifyConfig() {
  const uri = "mongodb+srv://jbony:6ctSL5CbDZBhWexM@members.rvmjn.mongodb.net/?retryWrites=true&w=majority&appName=members";
  const client = new MongoClient(uri);

  try {
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