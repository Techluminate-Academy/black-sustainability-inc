// utils/sync-airtable.js

// Use require instead of import
require('dotenv').config();

const axios = require("axios");
const { MongoClient } = require("mongodb");

// Airtable configuration (using public env variables; for production consider securing these)
// const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
// const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
// const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;
const AIRTABLE_API_KEY = 'pat38lz8MgA9beOdR.216dd36a6aefde7f3ac3063e11cb0ea1d645131195be277237b6e776d8f8c88f';
const BASE_ID = 'appixDz0HieCrwdUq';
const TABLE_NAME = 'tblYq1mA17iTZ5DRb';
// Optionally, you could add a view parameter if needed:
// const VIEW_ID = process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID_NOT_SORTED;
console.log(AIRTABLE_API_KEY, BASE_ID, TABLE_NAME)
/**
 * fetchDataFromAirtable(offset):
 *  - Makes one GET request to Airtable for up to 100 records at a time.
 *  - Removes image fields (userphoto, attachments, PHOTO, etc.)
 *  - Returns {records, offset} or null on error.
 */
// const fetchDataFromAirtable = async (offset = "") => {
//   const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

//   try {
//     const response = await axios.get(url, {
//       headers: {
//         Authorization: `Bearer ${AIRTABLE_API_KEY}`,
//       },
//       params: {
//         pageSize: 100, // up to 100 per request
//         offset,
//         // Uncomment the next line if you want to fetch from a specific view:
//         // view: VIEW_ID,
//       },
//     });

//     // Remove large image fields from each record
//     const cleanedRecords = response.data.records.map((record) => {
//       const { fields } = record;
//       const { userphoto, attachments, PHOTO, ...restFields } = fields;
//       return {
//         ...record,
//         fields: restFields,
//       };
//     });

//     return {
//       records: cleanedRecords,
//       offset: response.data.offset || "",
//     };
//   } catch (error) {
//     console.error(
//       "Error fetching data from Airtable:",
//       error?.response?.data || error
//     );
//     return null;
//   }
// };


const fetchDataFromAirtable = async (offset = "") => {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      params: {
        pageSize: 100, // up to 100 per request
        offset,
        // view: VIEW_ID, // Uncomment if needed
      },
    });

    // Instead of removing image fields, retain all fields as is.
    const records = response.data.records;

    return {
      records,
      offset: response.data.offset || "",
    };
  } catch (error) {
    console.error(
      "Error fetching data from Airtable:",
      error?.response?.data || error
    );
    return null;
  }
};

/**
 * getAllRecordsFromAirtable():
 *  - Repeatedly calls fetchDataFromAirtable() until no more offset is returned.
 *  - Returns all records (with image fields removed).
 */
const getAllRecordsFromAirtable = async () => {
  let allRecords = [];
  let offset = "";

  // Loop until Airtable does not provide an offset
  do {
    const data = await fetchDataFromAirtable(offset);
    if (!data) {
      // Exit if there was an error
      break;
    }
    // Append the cleaned records
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
};

/**
 * syncAirtableToMongoDB():
 *  - Fetches all Airtable records.
 *  - Connects to MongoDB.
 *  - Upserts each record into the specified MongoDB collection.
 */
const syncAirtableToMongoDB = async () => {
  // Fetch all records from Airtable
  const records = await getAllRecordsFromAirtable();
  if (!records) {
    console.error("No records fetched from Airtable.");
    return;
  }
  
  // MongoDB configuration
  const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables.");
    return;
  }
  
  // Define your database and collection names
  const DATABASE_NAME = "members"; // Change if needed
  const COLLECTION_NAME = "airtableRecords"; // Change if needed

  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB.");
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Prepare bulk operations: upsert each record based on a unique identifier (Airtable's record id)
    const bulkOps = records.map((record) => ({
      updateOne: {
        filter: { airtableId: record.id },
        update: { $set: record },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      const result = await collection.bulkWrite(bulkOps);
      console.log("Bulk operation result:", result);
      return result;
    } else {
      console.log("No records to upsert.");
    }
  } catch (error) {
    console.error("Error syncing records to MongoDB:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
};

// Export functions for use in other modules if needed
module.exports = {
  getAllRecordsFromAirtable,
  syncAirtableToMongoDB,
};

// If this file is executed directly, run the sync
if (require.main === module) {
  syncAirtableToMongoDB();
}
