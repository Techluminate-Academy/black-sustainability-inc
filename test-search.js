const { MongoClient } = require('mongodb');

// Test script to debug search functionality
async function testSearch() {
  // Try to get the MongoDB URI from environment
  const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI || process.env.MONGODB_URI;
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

    // Test 1: Check if Yeamah E. Brewer exists
    console.log('\n📋 Test 1: Looking for Yeamah E. Brewer...');
    const yeamahDoc = await collection.findOne({ "fields.FULL NAME": "Yeamah E. Brewer" });
    if (yeamahDoc) {
      console.log('✅ Found Yeamah E. Brewer:', {
        id: yeamahDoc._id,
        name: yeamahDoc.fields['FULL NAME'],
        city: yeamahDoc.fields['Location (Nearest City)'],
        zip: yeamahDoc.fields['Zip/Postal Code'],
        org: yeamahDoc.fields['ORGANIZATION NAME']
      });
    } else {
      console.log('❌ Yeamah E. Brewer not found');
    }

    // Test 2: Check for documents with zip 55443
    console.log('\n📋 Test 2: Looking for zip code 55443...');
    const zipDoc = await collection.findOne({ "fields['Zip/Postal Code']": 55443 });
    if (zipDoc) {
      console.log('✅ Found document with zip 55443:', {
        name: zipDoc.fields['FULL NAME'],
        zip: zipDoc.fields['Zip/Postal Code'],
        city: zipDoc.fields['Location (Nearest City)']
      });
    } else {
      console.log('❌ No document found with zip 55443');
    }

    // Test 3: Check for documents with Minneapolis
    console.log('\n📋 Test 3: Looking for Minneapolis...');
    const minneapolisDoc = await collection.findOne({ "fields['Location (Nearest City)']": "Minneapolis" });
    if (minneapolisDoc) {
      console.log('✅ Found document with Minneapolis:', {
        name: minneapolisDoc.fields['FULL NAME'],
        city: minneapolisDoc.fields['Location (Nearest City)'],
        zip: minneapolisDoc.fields['Zip/Postal Code']
      });
    } else {
      console.log('❌ No document found with Minneapolis');
    }

    // Test 4: Check all available fields in a sample document
    console.log('\n📋 Test 4: Checking available fields...');
    const sampleDoc = await collection.findOne({});
    if (sampleDoc && sampleDoc.fields) {
      console.log('✅ Available fields:', Object.keys(sampleDoc.fields));
      console.log('✅ Sample document data:', {
        'FULL NAME': sampleDoc.fields['FULL NAME'],
        'Location (Nearest City)': sampleDoc.fields['Location (Nearest City)'],
        'Zip/Postal Code': sampleDoc.fields['Zip/Postal Code'],
        'ORGANIZATION NAME': sampleDoc.fields['ORGANIZATION NAME'],
        'BIO': sampleDoc.fields['BIO']?.substring(0, 100) + '...'
      });
    } else {
      console.log('❌ No documents found in collection');
    }

    // Test 5: Test regex search for zip code
    console.log('\n📋 Test 5: Testing regex search for zip 55443...');
    const zipRegex = new RegExp("55443", "i");
    const zipRegexResults = await collection.find({ 
      "fields['Zip/Postal Code']": { $regex: zipRegex.source, $options: "i" } 
    }).toArray();
    console.log(`✅ Regex search for zip 55443 found ${zipRegexResults.length} results`);
    if (zipRegexResults.length > 0) {
      console.log('Results:', zipRegexResults.map(d => ({
        name: d.fields['FULL NAME'],
        zip: d.fields['Zip/Postal Code']
      })));
    }

    // Test 6: Test exact numeric search for zip code
    console.log('\n📋 Test 6: Testing exact numeric search for zip 55443...');
    const zipNumericResults = await collection.find({ 
      "fields['Zip/Postal Code']": 55443 
    }).toArray();
    console.log(`✅ Numeric search for zip 55443 found ${zipNumericResults.length} results`);
    if (zipNumericResults.length > 0) {
      console.log('Results:', zipNumericResults.map(d => ({
        name: d.fields['FULL NAME'],
        zip: d.fields['Zip/Postal Code']
      })));
    }

    // Test 7: Test regex search for Minneapolis
    console.log('\n📋 Test 7: Testing regex search for Minneapolis...');
    const cityRegex = new RegExp("Minneapolis", "i");
    const cityResults = await collection.find({ 
      "fields['Location (Nearest City)']": cityRegex 
    }).toArray();
    console.log(`✅ Regex search for Minneapolis found ${cityResults.length} results`);
    if (cityResults.length > 0) {
      console.log('Results:', cityResults.map(d => ({
        name: d.fields['FULL NAME'],
        city: d.fields['Location (Nearest City)']
      })));
    }

    // Test 8: Test the actual $or query that the API uses
    console.log('\n📋 Test 8: Testing the actual $or query from API...');
    const searchTerm = "55443";
    const searchRegex = new RegExp(searchTerm, "i");
    const isNumeric = !isNaN(parseInt(searchTerm));
    
    console.log(`Search term: ${searchTerm}`);
    console.log(`Is numeric: ${isNumeric}`);
    console.log(`Parsed as: ${parseInt(searchTerm)}`);
    
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
    
    console.log('🔍 Executing $or query...');
    const orResults = await collection.find(orQuery).toArray();
    console.log(`✅ $or query found ${orResults.length} results`);
    if (orResults.length > 0) {
      console.log('Results:', orResults.map(d => ({
        name: d.fields['FULL NAME'],
        city: d.fields['Location (Nearest City)'],
        zip: d.fields['Zip/Postal Code'],
        org: d.fields['ORGANIZATION NAME']
      })));
    }

    // Test 9: Check total document count
    console.log('\n📋 Test 9: Checking total document count...');
    const totalCount = await collection.countDocuments();
    console.log(`✅ Total documents in collection: ${totalCount}`);

    // Test 10: Check for any documents with location data
    console.log('\n📋 Test 10: Checking for documents with location data...');
    const locationDocs = await collection.find({ 
      "fields['Location (Nearest City)']": { $exists: true, $ne: null } 
    }).limit(5).toArray();
    console.log(`✅ Found ${locationDocs.length} documents with location data`);
    if (locationDocs.length > 0) {
      console.log('Sample location documents:', locationDocs.map(d => ({
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
testSearch();
