import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import CACHE_EXPIRY from "../../constants/CacheExpiry";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("airtableRecords");

    // Read query parameters for search and filtering
    const queryParams = req.query;

    // Generate a cache key based on the search query
    const cacheKey = `search:${JSON.stringify(queryParams)}`;
    
    // Check Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log('🔍 API: Serving from cache, skipping database query');
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log('🔍 API: No cache found, querying database');

    let query = {};

    if (queryParams.q) {
      const searchRegex = new RegExp(queryParams.q, "i");
      console.log('🔍 API: Creating search regex for:', queryParams.q);
      console.log('🔍 API: Regex object:', searchRegex);
      
      // Check if search term is a number (for zip code)
      const isNumeric = !isNaN(parseInt(queryParams.q));
      console.log('🔍 API: Is numeric search term?', isNumeric, 'Parsed as:', parseInt(queryParams.q));
      
      query.$or = [
        { "fields.FIRST NAME": searchRegex },
        { "fields.LAST NAME": searchRegex },
        { "fields.FULL NAME": searchRegex },
        { "fields.PRIMARY INDUSTRY HOUSE": searchRegex },
        // Add location fields that exist in some documents
        { "fields.Location (Nearest City)": searchRegex },
        { "fields.State": searchRegex },
        { "fields.State/Province": searchRegex },
        { "fields.Country": searchRegex },
        // Add postal code search - handle both string and number
        { "fields.Zip/Postal Code": { $regex: searchRegex.source, $options: "i" } },
        { "fields.Zip/Postal Code": parseInt(queryParams.q) },
        // Add other fields that might exist
        { "fields.BIO": searchRegex },
        { "fields.AFFILIATED ENTITY": searchRegex },
        { "fields.WEBSITE": searchRegex },
        { "fields.Name (from Location)": searchRegex },
        { "fields.ADDITIONAL FOCUS AREAS": searchRegex },
        { "fields.Similar Categories": searchRegex },
        { "fields.NAICS Code": searchRegex },
        // Add organization name search
        { "fields.ORGANIZATION NAME": searchRegex },
      ];
    }
    
    if (queryParams.timeZone)
      query["fields['Time zone']"] = queryParams.timeZone;
    if (queryParams.stateProvince)
      query["fields['State/Province']"] = queryParams.stateProvince;
    if (queryParams.nameFromLocation)
      query["fields['Name (from Location)']"] = queryParams.nameFromLocation;
    if (queryParams.state) query["fields.State"] = queryParams.state;
    if (queryParams.nearestCity)
      query["fields['Location (Nearest City)']"] = queryParams.nearestCity;
    if (queryParams.firstName)
      query["fields['FIRST NAME']"] = queryParams.firstName;
    if (queryParams.lastName)
      query["fields['LAST NAME']"] = queryParams.lastName;
    if (queryParams.fullName)
      query["fields['FULL NAME']"] = queryParams.fullName;
    if (queryParams.country)
      query["fields.Country"] = queryParams.country;
    if (queryParams.bio) query["fields.BIO"] = queryParams.bio;
    if (queryParams.organizationName)
      query["fields['ORGANIZATION NAME']"] = queryParams.organizationName;
    
    // NEW: Additional affiliated entity filter
    if (queryParams.affiliatedEntity)
      query["fields['AFFILIATED ENTITY']"] = queryParams.affiliatedEntity;

    // Retrieve matching documents
    console.log('Search query:', queryParams.q);
    console.log('MongoDB query:', JSON.stringify(query, null, 2));
    
    // Let's test the individual query parts
    if (queryParams.q === '55443') {
      console.log('🔍 Testing zip code search specifically...');
      const zipTest = await collection.find({ "fields['Zip/Postal Code']": 55443 }).toArray();
      console.log('✅ Direct zip search results:', zipTest.length);
      
      const zipRegexTest = await collection.find({ "fields['Zip/Postal Code']": { $regex: "55443", $options: "i" } }).toArray();
      console.log('✅ Regex zip search results:', zipRegexTest.length);
      
      // Let's also test with string comparison
      const zipStringTest = await collection.find({ "fields['Zip/Postal Code']": "55443" }).toArray();
      console.log('✅ String zip search results:', zipStringTest.length);
    }
    
    if (queryParams.q === 'Minneapolis') {
      console.log('🔍 Testing city search specifically...');
      const cityTest = await collection.find({ "fields['Location (Nearest City)']": "Minneapolis" }).toArray();
      console.log('✅ Direct city search results:', cityTest.length);
      
      const cityRegexTest = await collection.find({ "fields['Location (Nearest City)']": { $regex: "Minneapolis", $options: "i" } }).toArray();
      console.log('✅ Regex city search results:', cityRegexTest.length);
    }
    
    // Let's also check what fields are available in a sample document
    const sampleDoc = await collection.findOne({});
    if (sampleDoc && sampleDoc.fields) {
      console.log('Available fields in database:', Object.keys(sampleDoc.fields));
      console.log('Sample document fields:', {
        'FULL NAME': sampleDoc.fields['FULL NAME'],
        'Location (Nearest City)': sampleDoc.fields['Location (Nearest City)'],
        'Zip/Postal Code': sampleDoc.fields['Zip/Postal Code'],
        'ORGANIZATION NAME': sampleDoc.fields['ORGANIZATION NAME'],
        'BIO': sampleDoc.fields['BIO']?.substring(0, 100) + '...'
      });
      
      // Let's check the exact field names for location data
      const locationFields = Object.keys(sampleDoc.fields).filter(key => 
        key.toLowerCase().includes('location') || 
        key.toLowerCase().includes('city') || 
        key.toLowerCase().includes('zip') || 
        key.toLowerCase().includes('postal')
      );
      console.log('Location-related fields:', locationFields);
      
      // Let's also check if there are any documents with location data
      const locationDoc = await collection.findOne({ "fields.Location (Nearest City)": { $exists: true, $ne: null } });
      if (locationDoc) {
        console.log('Found document with location data:', {
          name: locationDoc.fields['FULL NAME'],
          city: locationDoc.fields['Location (Nearest City)'],
          zip: locationDoc.fields['Zip/Postal Code']
        });
      } else {
        console.log('No documents found with location data');
      }
      
      // Check specifically for zip code 55443
      const zipDoc = await collection.findOne({ "fields['Zip/Postal Code']": 55443 });
      if (zipDoc) {
        console.log('Found document with zip 55443:', {
          name: zipDoc.fields['FULL NAME'],
          zip: zipDoc.fields['Zip/Postal Code'],
          city: zipDoc.fields['Location (Nearest City)']
        });
      } else {
        console.log('No documents found with zip 55443');
        
        // Let's check what zip codes actually exist
        const zipCodes = await collection.distinct("fields['Zip/Postal Code']");
        console.log('Available zip codes in database:', zipCodes.slice(0, 10));
        
        // Let's also check the data type of zip codes
        const sampleWithZip = await collection.findOne({ "fields['Zip/Postal Code']": { $exists: true } });
        if (sampleWithZip) {
          console.log('Sample zip code data:', {
            zip: sampleWithZip.fields['Zip/Postal Code'],
            zipType: typeof sampleWithZip.fields['Zip/Postal Code']
          });
        }
      }
    }
    
    const data = await collection.find(query).toArray();
    const totalCount = data.length;
    
    console.log('Search results count:', totalCount);
    console.log('First few results:', data.slice(0, 3).map(d => ({
      id: d.id,
      name: d.fields?.['FULL NAME'] || d.fields?.['FIRST NAME'] + ' ' + d.fields?.['LAST NAME'],
      city: d.fields?.['Location (Nearest City)'],
      zip: d.fields?.['Zip/Postal Code'],
      org: d.fields?.['ORGANIZATION NAME']
    })));

    const responseData = { success: true, totalCount, data };

    // Cache the search result for 5 minutes
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", CACHE_EXPIRY);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error retrieving filtered data from MongoDB:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
