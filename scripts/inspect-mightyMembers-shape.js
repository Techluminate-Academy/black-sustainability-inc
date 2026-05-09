/**
 * One-off / dev: sample mightyMembers to see how industry & legacy fields are stored.
 * Usage: node scripts/inspect-mightyMembers-shape.js
 * Loads .env from repo root (MONGODB_URI or NEXT_PUBLIC_MONGODB_URI).
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

const DATABASE_NAME = "members";
const COLLECTION_NAME = "mightyMembers";

async function main() {
  const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI / NEXT_PUBLIC_MONGODB_URI");
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const col = client.db(DATABASE_NAME).collection(COLLECTION_NAME);

  const total = await col.estimatedDocumentCount();
  console.log("estimatedDocumentCount:", total);

  const [
    withIndustry,
    withLegacyPrimary,
    withFieldsDoc,
    reparativeIndustry,
    reparativeLegacy,
    sampleIndustryTypes,
  ] = await Promise.all([
    col.countDocuments({ industry: { $exists: true, $ne: null, $ne: "" } }),
    col.countDocuments({
      "fields.PRIMARY INDUSTRY HOUSE": { $exists: true, $ne: null, $ne: "" },
    }),
    col.countDocuments({ fields: { $exists: true, $type: "object" } }),
    col.countDocuments({
      industry: { $regex: /reparative/i },
    }),
    col.countDocuments({
      "fields.PRIMARY INDUSTRY HOUSE": { $regex: /reparative/i },
    }),
    col
      .aggregate([
        {
          $project: {
            t: { $type: "$industry" },
            hasF: { $cond: [{ $ifNull: ["$fields", false] }, 1, 0] },
          },
        },
        { $group: { _id: { type: "$t", hasFields: "$hasF" }, n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 25 },
      ])
      .toArray(),
  ]);

  console.log("\n--- counts ---");
  console.log("has non-empty industry:", withIndustry);
  console.log("has non-empty fields.PRIMARY INDUSTRY HOUSE:", withLegacyPrimary);
  console.log("has fields object:", withFieldsDoc);
  console.log('industry matches /reparative/i:', reparativeIndustry);
  console.log('fields.PRIMARY INDUSTRY HOUSE matches /reparative/i:', reparativeLegacy);

  console.log("\n--- industry $type x has fields (top) ---");
  console.log(JSON.stringify(sampleIndustryTypes, null, 2));

  const samples = await col
    .find(
      {
        $or: [
          { industry: { $regex: /reparative|agriculture|🌾/i } },
          { "fields.PRIMARY INDUSTRY HOUSE": { $regex: /reparative|agriculture|🌾/i } },
        ],
      },
      {
        projection: {
          industry: 1,
          "fields.PRIMARY INDUSTRY HOUSE": 1,
          email: 1,
          mightyId: 1,
          firstName: 1,
          lastName: 1,
          source: 1,
        },
        limit: 8,
      }
    )
    .toArray();

  console.log("\n--- sample docs (ag/reparative-ish) ---");
  for (const d of samples) {
    console.log(
      JSON.stringify(
        {
          _id: String(d._id),
          mightyId: d.mightyId,
          email: d.email,
          industryType: typeof d.industry,
          industry: d.industry,
          legacyPrimaryType: typeof d.fields?.["PRIMARY INDUSTRY HOUSE"],
          legacyPrimary: d.fields?.["PRIMARY INDUSTRY HOUSE"],
          source: d.source,
        },
        null,
        2
      )
    );
  }

  const anyTop = await col.findOne(
    {},
    { projection: { industry: 1, fields: 1, firstName: 1, email: 1, source: 1 } }
  );
  console.log("\n--- arbitrary first doc projection ---");
  console.log(
    JSON.stringify(
      {
        keys: anyTop ? Object.keys(anyTop).sort() : [],
        industry: anyTop?.industry,
        fieldsKeys: anyTop?.fields && typeof anyTop.fields === "object" ? Object.keys(anyTop.fields).slice(0, 20) : anyTop?.fields,
        source: anyTop?.source,
      },
      null,
      2
    )
  );

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
