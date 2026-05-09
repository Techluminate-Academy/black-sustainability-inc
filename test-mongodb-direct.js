const { MongoClient } = require('mongodb');

// Test script to debug MongoDB queries directly
async function testMongoDBDirect() {
  const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
  const DATABASE_NAME = "members";
  const COLLECTION_NAME = "airtableRecords";

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined');
    return;
  }

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true
  });

  try {
    console.log('🔍 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log('✅ Connected to MongoDB');

    // Test 1: Find Yeamah E. Brewer by name
    console.log('\n📋 Test 1: Find Yeamah E. Brewer by name...');
    const yeamahDoc = await collection.findOne({ "fields.FULL NAME": "Yeamah E. Brewer" });
    if (yeamahDoc) {
      console.log('✅ Found Yeamah E. Brewer:', {
        name: yeamahDoc.fields['FULL NAME'],
        zip: yeamahDoc.fields['Zip/Postal Code'],
        city: yeamahDoc.fields['Location (Nearest City)']
      });
    } else {
      console.log('❌ Yeamah E. Brewer not found');
    }

    // Test 2: Search by zip code 55443
    console.log('\n📋 Test 2: Search by zip code 55443...');
    const zipResults = await collection.find({ "fields['Zip/Postal Code']": 55443 }).toArray();
    console.log(`✅ Found ${zipResults.length} results for zip 55443`);
    if (zipResults.length > 0) {
      console.log('Results:', zipResults.map(d => ({
        name: d.fields['FULL NAME'],
        zip: d.fields['Zip/Postal Code']
      })));
    }

    // Test 3: Search by zip code with regex
    console.log('\n📋 Test 3: Search by zip code with regex...');
    const zipRegexResults = await collection.find({ "fields['Zip/Postal Code']": { $regex: "55443", $options: "i" } }).toArray();
    console.log(`✅ Found ${zipRegexResults.length} results for zip regex 55443`);
    if (zipRegexResults.length > 0) {
      console.log('Results:', zipRegexResults.map(d => ({
        name: d.fields['FULL NAME'],
        zip: d.fields['Zip/Postal Code']
      })));
    }

    // Test 4: Search by city Minneapolis
    console.log('\n📋 Test 4: Search by city Minneapolis...');
    const cityResults = await collection.find({ "fields['Location (Nearest City)']": "Minneapolis" }).toArray();
    console.log(`✅ Found ${cityResults.length} results for city Minneapolis`);
    if (cityResults.length > 0) {
      console.log('Results:', cityResults.map(d => ({
        name: d.fields['FULL NAME'],
        city: d.fields['Location (Nearest City)']
      })));
    }

    // Test 5: Search by city with regex
    console.log('\n📋 Test 5: Search by city with regex...');
    const cityRegexResults = await collection.find({ "fields['Location (Nearest City)']": { $regex: "Minneapolis", $options: "i" } }).toArray();
    console.log(`✅ Found ${cityRegexResults.length} results for city regex Minneapolis`);
    if (cityRegexResults.length > 0) {
      console.log('Results:', cityRegexResults.map(d => ({
        name: d.fields['FULL NAME'],
        city: d.fields['Location (Nearest City)']
      })));
    }

    // Test 6: Test the actual $or query from the API
    console.log('\n📋 Test 6: Test the actual $or query from the API...');
    const searchTerm = "55443";
    const searchRegex = new RegExp(searchTerm, "i");
    
    const orQuery = {
      $or: [
        { ["fields.FIRST NAME"]: searchRegex },
        { ["fields.LAST NAME"]: searchRegex },
        { ["fields.FULL NAME"]: searchRegex },
        { ["fields.PRIMARY INDUSTRY HOUSE"]: searchRegex },
        { ["fields['Location (Nearest City)']"]: searchRegex },
        { ["fields.State"]: searchRegex },
        { ["fields['State/Province']"]: searchRegex },
        { ["fields.Country"]: searchRegex },
        { ["fields['Zip/Postal Code']"]: { $regex: searchRegex.source, $options: "i" } },
        { ["fields['Zip/Postal Code']"]: parseInt(searchTerm) },
        { ["fields.BIO"]: searchRegex },
        { ["fields['AFFILIATED ENTITY']"]: searchRegex },
        { ["fields.WEBSITE"]: searchRegex },
        { ["fields['Name (from Location)']"]: searchRegex },
        { ["fields['ADDITIONAL FOCUS AREAS']"]: searchRegex },
        { ["fields['Similar Categories']"]: searchRegex },
        { ["fields['NAICS Code']"]: searchRegex },
        { ["fields['ORGANIZATION NAME']"]: searchRegex }
      ]
    };
    
    console.log('🔍 Executing $or query for 55443...');
    const orResults = await collection.find(orQuery).toArray();
    console.log(`✅ $or query found ${orResults.length} results`);
    if (orResults.length > 0) {
      console.log('Results:', orResults.map(d => ({
        name: d.fields['FULL NAME'],
        city: d.fields['Location (Nearest City)'],
        zip: d.fields['Zip/Postal Code']
      })));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔍 Test completed');
  }
}

// Run the test
testMongoDBDirect();
