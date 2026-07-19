// utils/sync-airtable.js
//
// Scheduled membership reconciliation (twice daily — morning + night):
//   Mighty webhooks keep Mongo + Airtable mostly current in between; this job
//   re-pulls Mighty → Airtable (Last Sync Date + profile) then Airtable → Mongo.
//   Default --sleep-ms 450 to stay under Mighty Admin API rate limits.
//
// Render: create TWO Cron Jobs with the same command (set timezone, e.g. America/New_York):
//   Morning: 0 6 * * *
//   Night:   0 2 * * *
//   Command: node utils/sync-airtable.js
//   Plan:    allow ~60–90 min per run
//
// Usage:
//   node utils/sync-airtable.js
//   node utils/sync-airtable.js --sleep-ms 500
//   node utils/sync-airtable.js --stale-only          # lighter run (failed/old rows only)
//   node utils/sync-airtable.js --skip-mighty        # Airtable → Mongo only
//   node utils/sync-airtable.js --skip-cache         # do not invalidate Redis
//
// Env: MIGHTY_SYNC_SLEEP_MS (default 450), MIGHTY_SYNC_RETRY_ROUNDS (default 3),
//      MIGHTY_SYNC_STALE_ONLY=1 for incremental runs,
//      SYNC_REQUIRE_COMPLETE=0 to run Mongo when Mighty rows still failing,
//      SKIP_MIGHTY_SYNC=1 to skip step 1

// Use require instead of import
require('dotenv').config();

const axios = require("axios");
const { MongoClient } = require("mongodb");
const { spawnSync } = require("child_process");
const path = require("path");

/** Scheduled full-sync pacing (Mighty Admin API rate limits). Override via MIGHTY_SYNC_SLEEP_MS. */
const DEFAULT_MIGHTY_SLEEP_MS = 450;

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
      throw new Error("Airtable Mighty Members fetch failed before pagination completed");
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
  if (!records.length) {
    throw new Error("No records fetched from Airtable Mighty Members table");
  }
  
  // MongoDB configuration
  const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI || process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
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
    // Subscription fields mirror Airtable when present (after Mighty → Airtable step).
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
    throw error;
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
};

// Export functions for use in other modules if needed
module.exports = {
  getAllRecordsFromAirtable,
  syncAirtableToMongoDB,
  runMightyToAirtableSync,
  runCacheInvalidation,
  runScheduledMembershipSync,
  parseSyncCliArgs,
};

function parseSyncCliArgs(argv = process.argv.slice(2)) {
  const sleepIdx = argv.indexOf("--sleep-ms");
  const retryIdx = argv.indexOf("--retry-rounds");
  const envSleep = parseInt(process.env.MIGHTY_SYNC_SLEEP_MS || "", 10);
  const envRetry = parseInt(process.env.MIGHTY_SYNC_RETRY_ROUNDS || "", 10);
  const defaultSleep = Number.isFinite(envSleep) ? envSleep : DEFAULT_MIGHTY_SLEEP_MS;
  const defaultRetry = Number.isFinite(envRetry) ? Math.max(1, envRetry) : 3;
  const requireComplete = process.env.SYNC_REQUIRE_COMPLETE !== "0";
  const staleOnly =
    argv.includes("--stale-only") ||
    argv.includes("--incremental") ||
    process.env.MIGHTY_SYNC_STALE_ONLY === "1";
  return {
    skipMighty:
      argv.includes("--skip-mighty") ||
      argv.includes("--airtable-only") ||
      process.env.SKIP_MIGHTY_SYNC === "1",
    staleOnly,
    sleepMs:
      sleepIdx >= 0 && argv[sleepIdx + 1]
        ? Math.max(0, parseInt(argv[sleepIdx + 1], 10) || 0)
        : defaultSleep,
    retryRounds:
      retryIdx >= 0 && argv[retryIdx + 1]
        ? Math.max(1, parseInt(argv[retryIdx + 1], 10) || 1)
        : defaultRetry,
    requireComplete,
    skipCache: argv.includes("--skip-cache") || process.env.SKIP_CACHE_INVALIDATION === "1",
  };
}

function mightyToAirtableConfigured() {
  const mightyKey =
    process.env.MIGHTY_NETWORK_API_KEY || process.env.MIGHTY_API_KEY;
  const networkId = process.env.MIGHTY_NETWORK_ID;
  return Boolean(mightyKey && networkId && AIRTABLE_API_KEY && BASE_ID && TABLE_NAME);
}

function runMightyToAirtableSync(sleepMs, retryRounds, staleOnly) {
  const repoRoot = path.join(__dirname, "..");
  const args = [
    "tsx",
    "scripts/mighty-to-airtable-sync.ts",
    "--apply",
    "--sleep-ms",
    String(sleepMs),
    "--retry-rounds",
    String(retryRounds),
  ];
  if (staleOnly) args.push("--stale-only");
  console.error(
    JSON.stringify({
      msg: "sync_airtable_mighty_step_start",
      sleepMs,
      retryRounds,
      staleOnly,
      command: "npx",
      args,
    })
  );
  const result = spawnSync("npx", args, {
    stdio: "inherit",
    env: process.env,
    cwd: repoRoot,
  });
  const exitCode = result.status ?? 1;
  console.error(
    JSON.stringify({ msg: "sync_airtable_mighty_step_done", exitCode, sleepMs, retryRounds })
  );
  return exitCode;
}

function runCacheInvalidation() {
  const repoRoot = path.join(__dirname, "..");
  const args = ["tsx", "scripts/invalidate-mighty-member-caches.ts"];
  console.error(JSON.stringify({ msg: "sync_airtable_cache_step_start", command: "npx", args }));
  const result = spawnSync("npx", args, { stdio: "inherit", env: process.env, cwd: repoRoot });
  const exitCode = result.status ?? 1;
  console.error(JSON.stringify({ msg: "sync_airtable_cache_step_done", exitCode }));
  if (exitCode !== 0) throw new Error(`Redis cache invalidation failed with exit code ${exitCode}`);
}

async function runScheduledMembershipSync() {
  const args = parseSyncCliArgs();

  console.error(
    JSON.stringify({
      msg: "sync_airtable_scheduled_start",
      mode: args.staleOnly ? "incremental" : "full",
      sleepMs: args.sleepMs,
      retryRounds: args.retryRounds,
      requireComplete: args.requireComplete,
    })
  );

  if (!args.skipMighty && mightyToAirtableConfigured()) {
    const mightyExit = runMightyToAirtableSync(args.sleepMs, args.retryRounds, args.staleOnly);
    if (mightyExit !== 0 && args.requireComplete) {
      console.error(
        JSON.stringify({
          msg: "sync_airtable_mongo_step_skipped",
          reason: "Mighty → Airtable had retryable failures (set SYNC_REQUIRE_COMPLETE=0 to force Mongo)",
          mightyExit,
        })
      );
      process.exit(mightyExit);
    }
  } else if (!args.skipMighty) {
    throw new Error("Mighty → Airtable sync is not configured (use --skip-mighty only intentionally)");
  }

  const mongoResult = await syncAirtableToMongoDB();
  console.error(JSON.stringify({
    msg: "sync_airtable_mongo_step_done",
    matchedCount: mongoResult?.matchedCount ?? 0,
    modifiedCount: mongoResult?.modifiedCount ?? 0,
    upsertedCount: mongoResult?.upsertedCount ?? 0,
  }));
  if (!args.skipCache) runCacheInvalidation();
  console.error(JSON.stringify({ msg: "sync_airtable_scheduled_done" }));
}

// If this file is executed directly, run the full scheduled sync
if (require.main === module) {
  runScheduledMembershipSync().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
