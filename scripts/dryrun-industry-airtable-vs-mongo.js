/**
 * READ-ONLY dry run: compare industry-related fields
 * — Live Airtable (same table as map / signup env)
 * — Mongo `members.airtableRecords`
 * — Mongo `members.mightyMembers`
 *
 * Join key: normalized email.
 * Does not write to Airtable, Mongo, or any other store.
 *
 * Usage: node scripts/dryrun-industry-airtable-vs-mongo.js
 * Requires .env with Airtable + Mongo (same as app).
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

const DATABASE_NAME = "members";
const COLLECTION_AIRTABLE = "airtableRecords";
const COLLECTION_MIGHTY = "mightyMembers";

/** Prefer Mighty sync PAT + base (often has table access); else public web token. */
function resolveAirtableConfig() {
  const mighty = {
    label: "Mighty sync (AIRTABLE_PAT + AIRTABLE_MIGHTY_SYNC_*)",
    apiKey:
      process.env.AIRTABLE_PAT ||
      process.env.AIRTABLE_ACCESS_TOKEN ||
      null,
    baseId: process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID || null,
    table:
      process.env.AIRTABLE_MIGHTY_SYNC_TABLE_ID ||
      process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME ||
      null,
  };
  const pub = {
    label: "Public map (NEXT_PUBLIC_AIRTABLE_*)",
    apiKey: process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN || null,
    baseId: process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || null,
    table: process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || null,
  };
  if (mighty.apiKey && mighty.baseId && mighty.table) return mighty;
  if (pub.apiKey && pub.baseId && pub.table) return pub;
  return null;
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;

/** Airtable sync + legacy map field names to try */
const AT_INDUSTRY_FIELD_CANDIDATES = [
  "Industry / Sector",
  "PRIMARY INDUSTRY HOUSE",
  "Primary Industry",
  "Primary industry",
];

function normEmail(v) {
  if (v == null || v === "") return "";
  return String(v).trim().toLowerCase();
}

function stringifyAirtableValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (x == null) return "";
        if (typeof x === "object" && x !== null && "name" in x) return String((x).name);
        return String(x);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim();
}

function pickIndustryFromAirtableFields(fields) {
  const out = {};
  for (const name of AT_INDUSTRY_FIELD_CANDIDATES) {
    if (fields && Object.prototype.hasOwnProperty.call(fields, name)) {
      const s = stringifyAirtableValue(fields[name]);
      if (s) out[name] = s;
    }
  }
  return out;
}

function primaryIndustrySummary(obj) {
  const parts = [];
  for (const k of AT_INDUSTRY_FIELD_CANDIDATES) {
    if (obj[k]) parts.push(`${k}=${obj[k].slice(0, 80)}${obj[k].length > 80 ? "…" : ""}`);
  }
  return parts.join(" | ") || "(empty)";
}

async function fetchAllAirtableRecords(apiKey, baseId, table) {
  const urlBase = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`;
  const all = [];
  let offset = "";
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const res = await fetch(`${urlBase}?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Airtable ${res.status}: ${t.slice(0, 500)}`);
    }
    const data = await res.json();
    all.push(...(data.records || []));
    offset = data.offset || "";
  } while (offset);
  return all;
}

async function main() {
  const atCfg = resolveAirtableConfig();
  if (!atCfg) {
    console.error(
      "Missing Airtable env. Set either Mighty sync (AIRTABLE_PAT, AIRTABLE_MIGHTY_SYNC_BASE_ID, AIRTABLE_MIGHTY_SYNC_TABLE_*) or NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN + BASE + TABLE."
    );
    process.exit(1);
  }
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI / NEXT_PUBLIC_MONGODB_URI.");
    process.exit(1);
  }

  console.log("=== Industry dry run (READ ONLY) ===\n");
  console.log("Airtable source:", atCfg.label);
  console.log("Airtable table:", atCfg.table);
  console.log("Mongo DB:", DATABASE_NAME, "|", COLLECTION_AIRTABLE, "+", COLLECTION_MIGHTY, "\n");

  console.log("Fetching Airtable…");
  let atRecords;
  try {
    atRecords = await fetchAllAirtableRecords(atCfg.apiKey, atCfg.baseId, atCfg.table);
  } catch (e) {
    const alt =
      atCfg.label.startsWith("Mighty") &&
      process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN &&
      process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID &&
      process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME
        ? {
            label: "Public map (NEXT_PUBLIC_AIRTABLE_*) [fallback]",
            apiKey: process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN,
            baseId: process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID,
            table: process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME,
          }
        : null;
    if (alt) {
      console.warn("First Airtable fetch failed:", (e && e.message) || e);
      console.warn("Retrying with", alt.label);
      atRecords = await fetchAllAirtableRecords(alt.apiKey, alt.baseId, alt.table);
    } else {
      throw e;
    }
  }
  console.log("Airtable rows:", atRecords.length);

  /** @type {Map<string, { industries: Record<string,string>, emailField: string }>} */
  const byEmailAirtable = new Map();
  let atWithAnyIndustry = 0;
  const atFieldPresence = Object.fromEntries(AT_INDUSTRY_FIELD_CANDIDATES.map((k) => [k, 0]));

  for (const rec of atRecords) {
    const f = rec.fields || {};
    const email =
      normEmail(f["Primary Email"]) ||
      normEmail(f["EMAIL ADDRESS"]) ||
      normEmail(f["Email"]) ||
      normEmail(f.email);
    if (!email) continue;
    const industries = pickIndustryFromAirtableFields(f);
    for (const k of Object.keys(industries)) atFieldPresence[k] += 1;
    if (Object.keys(industries).length) atWithAnyIndustry += 1;
    const emailField =
      f["Primary Email"] != null
        ? "Primary Email"
        : f["EMAIL ADDRESS"] != null
          ? "EMAIL ADDRESS"
          : "Email/other";
    byEmailAirtable.set(email, { industries, emailField, recordId: rec.id });
  }

  console.log("\n--- Airtable (live) ---");
  console.log("Rows with usable email:", byEmailAirtable.size);
  console.log("Rows with at least one industry field (candidates):", atWithAnyIndustry);
  console.log("Non-empty counts by field:", atFieldPresence);

  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db(DATABASE_NAME);

  /** @type {Map<string, { primary?: string, sector?: string }>} */
  const byEmailMongoAR = new Map();
  let arTotal = 0;
  let arWithPrimary = 0;
  let arWithSector = 0;

  const arCursor = db.collection(COLLECTION_AIRTABLE).find(
    {},
    {
      projection: {
        "fields.EMAIL ADDRESS": 1,
        "fields.PRIMARY INDUSTRY HOUSE": 1,
        "fields.Industry / Sector": 1,
      },
    }
  );

  for await (const doc of arCursor) {
    arTotal += 1;
    const email = normEmail(doc?.fields?.["EMAIL ADDRESS"]);
    if (!email) continue;
    const primary = stringifyAirtableValue(doc?.fields?.["PRIMARY INDUSTRY HOUSE"]);
    const sector = stringifyAirtableValue(doc?.fields?.["Industry / Sector"]);
    if (primary) arWithPrimary += 1;
    if (sector) arWithSector += 1;
    byEmailMongoAR.set(email, { primary, sector });
  }

  console.log("\n--- Mongo airtableRecords ---");
  console.log("Documents scanned:", arTotal);
  console.log("With non-empty fields.PRIMARY INDUSTRY HOUSE:", arWithPrimary);
  console.log("With non-empty fields.Industry / Sector:", arWithSector);
  console.log("Unique emails indexed:", byEmailMongoAR.size);

  /** @type {Map<string, { industry: string }>} */
  const byEmailMighty = new Map();
  let mmTotal = 0;
  let mmNonEmptyIndustry = 0;
  const mmCursor = db.collection(COLLECTION_MIGHTY).find(
    {},
    { projection: { email: 1, industry: 1 } }
  );
  for await (const doc of mmCursor) {
    mmTotal += 1;
    const email = normEmail(doc?.email);
    if (!email) continue;
    const industry = typeof doc.industry === "string" ? doc.industry.trim() : "";
    if (industry) mmNonEmptyIndustry += 1;
    byEmailMighty.set(email, { industry });
  }

  console.log("\n--- Mongo mightyMembers ---");
  console.log("Documents scanned:", mmTotal);
  console.log("With non-empty industry:", mmNonEmptyIndustry);
  console.log("Unique emails indexed:", byEmailMighty.size);

  /** Airtable has industry info but mightyMembers industry empty */
  const atRichMmEmpty = [];
  /** Airtable has industry info but mongo airtableRecords has both empty */
  const atRichArEmpty = [];
  /** In mightyMembers but not in Airtable email set */
  const mmOnly = [];
  /** In Airtable email set but not in mightyMembers */
  const atOnly = [];

  for (const [email, at] of byEmailAirtable) {
    const mm = byEmailMighty.get(email);
    const ar = byEmailMongoAR.get(email);
    if (!mm) {
      atOnly.push(email);
      continue;
    }
    const atHas = Object.keys(at.industries).length > 0;
    const mmEmpty = !mm.industry;
    if (atHas && mmEmpty) {
      atRichMmEmpty.push({
        email,
        airtable: primaryIndustrySummary(at.industries),
        mightyIndustry: mm.industry || "(empty)",
      });
    }
    const arPrimary = ar?.primary || "";
    const arSector = ar?.sector || "";
    if (atHas && !arPrimary && !arSector) {
      atRichArEmpty.push({
        email,
        airtable: primaryIndustrySummary(at.industries),
      });
    }
  }

  for (const email of byEmailMighty.keys()) {
    if (!byEmailAirtable.has(email)) mmOnly.push(email);
  }

  const SAMPLE = 20;
  console.log("\n--- Gaps (dry run) ---");
  console.log(
    "Airtable has industry field(s) filled but mightyMembers.industry empty:",
    atRichMmEmpty.length
  );
  console.log(
    "Airtable has industry field(s) filled but mongo airtableRecords has no PRIMARY INDUSTRY HOUSE and no Industry / Sector:",
    atRichArEmpty.length
  );
  console.log("Emails in Airtable (indexed) not found in mightyMembers:", atOnly.length);
  console.log("Emails in mightyMembers not found in Airtable (indexed):", mmOnly.length);

  const show = (label, arr) => {
    console.log(`\nSample (max ${SAMPLE}) — ${label}:`);
    arr.slice(0, SAMPLE).forEach((x, i) => {
      console.log(`  ${i + 1}.`, typeof x === "string" ? x : JSON.stringify(x));
    });
  };

  show("Airtable industry present, mightyMembers.industry empty", atRichMmEmpty);
  show("Airtable industry present, airtableRecords industry fields empty", atRichArEmpty);
  show("In Airtable only (no mightyMembers row)", atOnly);
  show("In mightyMembers only (no Airtable row in this table)", mmOnly);

  await client.close();
  console.log("\nDone. No data was modified.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
