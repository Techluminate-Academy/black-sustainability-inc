// utils/sync-airtable.js

// Use require instead of import
require('dotenv').config();

const axios = require("axios");
const { MongoClient } = require("mongodb");

// Airtable "Mighty Members" sync table (server-side tokens)
const AIRTABLE_API_KEY =
  process.env.AIRTABLE_PAT ||
  process.env.AIRTABLE_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
const BASE_ID =
  process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
// Prefer Table ID; fall back to name if needed
const TABLE_NAME =
  process.env.AIRTABLE_MIGHTY_SYNC_TABLE_ID ||
  process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME ||
  process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME ||
  "Mighty Members";
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
  if (!AIRTABLE_API_KEY || !BASE_ID || !TABLE_NAME) {
    console.error("Missing Airtable env vars for Mighty Members sync table.");
    return null;
  }
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
 *  - Upserts records into Mongo `mightyMembers`.
 */
const syncAirtableToMongoDB = async () => {
  // Fetch all records from Airtable
  const records = await getAllRecordsFromAirtable();
  if (!records) {
    console.error("No records fetched from Airtable.");
    return;
  }
  
  // MongoDB configuration
  const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI || process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables.");
    return;
  }
  
  // Define your database and collection names
  const DATABASE_NAME = "members"; // Change if needed
  const COLLECTION_NAME = "mightyMembers";

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

    const normalizeEmail = (v) =>
      typeof v === "string" ? v.trim().toLowerCase() : "";

    const toNumberOrNull = (v) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const parseBooleanField = (v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v === 1 ? true : v === 0 ? false : null;
      if (typeof v === "string") {
        const t = v.trim().toLowerCase();
        if (t === "true" || t === "yes" || t === "1") return true;
        if (t === "false" || t === "no" || t === "0") return false;
      }
      return null;
    };

    const parseStringList = (v) => {
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
      if (typeof v === "string" && v.trim()) return [v.trim()];
      return [];
    };

    // Upsert by mightyId when present, else by email.
    // IMPORTANT: do NOT overwrite subscription fields here (those are set by Mighty/Wix sync scripts).
    const bulkOps = records
      .map((record) => {
        const f = record.fields || {};
        const mightyId = toNumberOrNull(f["Mighty Member ID"]);
        const email = normalizeEmail(f["Primary Email"]);
        if (!mightyId && !email) return null;

        const lat = toNumberOrNull(f["Latitude"]);
        const lng = toNumberOrNull(f["Longitude"]);
        const hasCoords = typeof lat === "number" && typeof lng === "number";

        const isPaidActive = parseBooleanField(f.isPaidActive ?? f["isPaidActive"]);
        const planNames = parseStringList(f.planNames ?? f["planNames"]);
        const planIds = parseStringList(f.planIds ?? f["planIds"]);
        const lastSyncFromAirtable = f["Last Sync Date"] || null;
        const subscriptionUpdatedAt =
          f.subscriptionUpdatedAt ?? f["subscriptionUpdatedAt"] ?? lastSyncFromAirtable ?? null;

        const doc = {
          ...(mightyId ? { mightyId } : {}),
          ...(email ? { email } : {}),
          firstName: (f["First Name"] || "").toString(),
          lastName: (f["Last Name"] || "").toString(),
          location: (f["City"] || "").toString(),
          bio: (
            f["Extended Bio"] ||
            f["Short Bio"] ||
            f["BIO"] ||
            f["Bio"] ||
            f["Member Bio"] ||
            f["About"] ||
            f["Description"] ||
            ""
          ).toString(),
          avatarUrl: (f["Profile Photo URL"] || "").toString(),
          industry: (f["Industry / Sector"] || "").toString(),
          latitude: hasCoords ? lat : null,
          longitude: hasCoords ? lng : null,
          geo: hasCoords ? { type: "Point", coordinates: [lng, lat] } : null,
          accountCreatedAt: f["Account Created Date"] || null,
          lastSyncDate: f["Last Sync Date"] || null,
          source: "airtable:mighty_members",
          airtable: { recordId: record.id },
          updatedAt: new Date(),
        };

        const filter = mightyId ? { mightyId } : { email };

        const setDoc = { ...doc };
        const update = {
          $set: setDoc,
          $setOnInsert: { createdAt: new Date() },
        };

        if (typeof isPaidActive === "boolean") {
          setDoc["subscription.isPaidActive"] = isPaidActive;
          setDoc["subscription.syncSource"] = "airtable:mighty_members";
          if (subscriptionUpdatedAt) {
            setDoc["subscription.updatedAt"] = subscriptionUpdatedAt;
          }
        }
        if (planNames.length) setDoc["subscription.planNames"] = planNames;
        if (planIds.length) setDoc["subscription.planIds"] = planIds;

        return {
          updateOne: {
            filter,
            update,
            upsert: true,
          },
        };
      })
      .filter(Boolean);

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
