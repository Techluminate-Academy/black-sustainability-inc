/**
 * READ-ONLY dry run: compare industry-related fields across sources.
 *
 * 1) Production / legacy map Airtable — NEXT_PUBLIC_AIRTABLE_* + view
 *    (same as utils/airtable.js: PRIMARY INDUSTRY HOUSE lives here.)
 * 2) Mighty sync Airtable — AIRTABLE_PAT + AIRTABLE_MIGHTY_SYNC_* (Industry / Sector)
 *
 * Mongo: members.airtableRecords, members.mightyMembers (join on email).
 * No writes.
 *
 * Usage: node scripts/dryrun-industry-airtable-vs-mongo.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

const DATABASE_NAME = "members";
const COLLECTION_AIRTABLE = "airtableRecords";
const COLLECTION_MIGHTY = "mightyMembers";

const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;

/** Field names to read from any Airtable row (production + Mighty layouts). */
const AT_INDUSTRY_FIELD_CANDIDATES = [
  "PRIMARY INDUSTRY HOUSE",
  "Industry / Sector",
  "Primary Email",
  "Primary Industry",
  "Primary industry",
  "EMAIL ADDRESS",
  "Email",
];

function resolveProductionAirtable() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN || null;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || null;
  const table = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || null;
  const view =
    process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID_NOT_SORTED?.trim() ||
    process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID?.trim() ||
    "viwYDUY0xStG108Lv";
  if (!apiKey || !baseId || !table) return null;
  return {
    label: "Production / legacy map (NEXT_PUBLIC_AIRTABLE_* + view)",
    apiKey,
    baseId,
    table,
    view,
  };
}

function resolveMightySyncAirtable() {
  const apiKey =
    process.env.AIRTABLE_PAT || process.env.AIRTABLE_ACCESS_TOKEN || null;
  const baseId = process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID || null;
  const table =
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_ID ||
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME ||
    null;
  if (!apiKey || !baseId || !table) return null;
  return {
    label: "Mighty members sync (AIRTABLE_PAT + AIRTABLE_MIGHTY_SYNC_*)",
    apiKey,
    baseId,
    table,
    view: null,
  };
}

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
        if (typeof x === "object" && x !== null && "name" in x) return String(x.name);
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
  for (const name of [
    "PRIMARY INDUSTRY HOUSE",
    "Industry / Sector",
    "Primary Industry",
    "Primary industry",
  ]) {
    if (fields && Object.prototype.hasOwnProperty.call(fields, name)) {
      const s = stringifyAirtableValue(fields[name]);
      if (s) out[name] = s;
    }
  }
  return out;
}

function emailFromAirtableFields(f) {
  return (
    normEmail(f["Primary Email"]) ||
    normEmail(f["EMAIL ADDRESS"]) ||
    normEmail(f["Email"]) ||
    normEmail(f.email)
  );
}

function primaryIndustrySummary(obj) {
  const parts = [];
  for (const k of ["PRIMARY INDUSTRY HOUSE", "Industry / Sector", "Primary Industry", "Primary industry"]) {
    if (obj[k]) parts.push(`${k}=${obj[k].slice(0, 80)}${obj[k].length > 80 ? "…" : ""}`);
  }
  return parts.join(" | ") || "(empty)";
}

async function fetchAllAirtableRecords(apiKey, baseId, table, view) {
  const urlBase = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`;

  async function pull(useView) {
    const all = [];
    let offset = "";
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      if (useView) params.set("view", useView);
      const res = await fetch(`${urlBase}?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const t = await res.text();
        const err = new Error(`Airtable ${res.status}: ${t.slice(0, 500)}`);
        err.status = res.status;
        err.body = t;
        throw err;
      }
      const data = await res.json();
      all.push(...(data.records || []));
      offset = data.offset || "";
    } while (offset);
    return all;
  }

  if (view) {
    try {
      return await pull(view);
    } catch (e) {
      const missingView =
        e.body && /VIEW_ID_NOT_FOUND|view.*not found/i.test(String(e.body));
      if (missingView) {
        console.warn(`View "${view}" not found — fetching whole table without view.`);
        return await pull(null);
      }
      throw e;
    }
  }
  return await pull(null);
}

async function loadMongoMaps() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db(DATABASE_NAME);

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

  const byEmailMighty = new Map();
  let mmTotal = 0;
  let mmNonEmptyIndustry = 0;
  const mmCursor = db.collection(COLLECTION_MIGHTY).find({}, { projection: { email: 1, industry: 1 } });
  for await (const doc of mmCursor) {
    mmTotal += 1;
    const email = normEmail(doc?.email);
    if (!email) continue;
    const industry = typeof doc.industry === "string" ? doc.industry.trim() : "";
    if (industry) mmNonEmptyIndustry += 1;
    byEmailMighty.set(email, { industry });
  }

  await client.close();

  return {
    byEmailMongoAR,
    arTotal,
    arWithPrimary,
    arWithSector,
    byEmailMighty,
    mmTotal,
    mmNonEmptyIndustry,
  };
}

function analyzePhase(phaseLabel, atCfg, atRecords, byEmailMongoAR, byEmailMighty) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(phaseLabel);
  console.log(`Table: ${atCfg.table}${atCfg.view ? ` | view: ${atCfg.view}` : ""}`);
  console.log(`Rows fetched: ${atRecords.length}`);

  const byEmailAirtable = new Map();
  let atWithAnyIndustry = 0;
  const atFieldPresence = {
    "PRIMARY INDUSTRY HOUSE": 0,
    "Industry / Sector": 0,
    "Primary Industry": 0,
    "Primary industry": 0,
  };

  for (const rec of atRecords) {
    const f = rec.fields || {};
    const email = emailFromAirtableFields(f);
    if (!email) continue;
    const industries = pickIndustryFromAirtableFields(f);
    for (const k of Object.keys(industries)) {
      if (atFieldPresence[k] != null) atFieldPresence[k] += 1;
    }
    if (Object.keys(industries).length) atWithAnyIndustry += 1;
    byEmailAirtable.set(email, { industries, recordId: rec.id });
  }

  console.log("Rows with usable email:", byEmailAirtable.size);
  console.log("Rows with at least one industry field (candidates):", atWithAnyIndustry);
  console.log("Non-empty counts by field:", atFieldPresence);

  const atRichMmEmpty = [];
  const atRichArEmpty = [];
  const atOnly = [];
  const mmOnly = [];

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
      atRichArEmpty.push({ email, airtable: primaryIndustrySummary(at.industries) });
    }
  }

  for (const email of byEmailMighty.keys()) {
    if (!byEmailAirtable.has(email)) mmOnly.push(email);
  }

  const SAMPLE = 15;
  console.log("\n--- Gaps vs Mongo (this Airtable source) ---");
  console.log("Airtable industry filled but mightyMembers.industry empty:", atRichMmEmpty.length);
  console.log(
    "Airtable industry filled but mongo airtableRecords missing PRIMARY + Industry / Sector:",
    atRichArEmpty.length
  );
  console.log("In this Airtable index but not in mightyMembers:", atOnly.length);
  console.log("In mightyMembers but not in this Airtable index:", mmOnly.length);

  const show = (label, arr) => {
    console.log(`\nSample (max ${SAMPLE}) — ${label}:`);
    arr.slice(0, SAMPLE).forEach((x, i) => {
      console.log(`  ${i + 1}.`, typeof x === "string" ? x : JSON.stringify(x));
    });
  };

  show("Airtable industry present, mightyMembers.industry empty", atRichMmEmpty);
  show("Airtable industry present, airtableRecords industry fields empty", atRichArEmpty);
  show("Airtable only (no mightyMembers)", atOnly);
  show("mightyMembers only (not in this Airtable)", mmOnly);
}

async function main() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI / NEXT_PUBLIC_MONGODB_URI.");
    process.exit(1);
  }

  console.log("=== Industry dry run (READ ONLY) ===\n");
  console.log("Mongo:", DATABASE_NAME, "|", COLLECTION_AIRTABLE, "+", COLLECTION_MIGHTY);

  console.log("\nLoading Mongo maps…");
  const mongo = await loadMongoMaps();
  console.log("airtableRecords docs:", mongo.arTotal);
  console.log("  with fields.PRIMARY INDUSTRY HOUSE:", mongo.arWithPrimary);
  console.log("  with fields.Industry / Sector:", mongo.arWithSector);
  console.log("  unique emails:", mongo.byEmailMongoAR.size);
  console.log("mightyMembers docs:", mongo.mmTotal);
  console.log("  with non-empty industry:", mongo.mmNonEmptyIndustry);
  console.log("  unique emails:", mongo.byEmailMighty.size);

  const prod = resolveProductionAirtable();
  const mighty = resolveMightySyncAirtable();

  if (!prod && !mighty) {
    console.error(
      "No Airtable config: set NEXT_PUBLIC_AIRTABLE_* (production) and/or Mighty sync env vars."
    );
    process.exit(1);
  }

  if (prod) {
    console.log("\nFetching production Airtable…");
    const records = await fetchAllAirtableRecords(prod.apiKey, prod.baseId, prod.table, prod.view);
    analyzePhase(prod.label, prod, records, mongo.byEmailMongoAR, mongo.byEmailMighty);
  }

  if (mighty) {
    const sameAsProd =
      prod &&
      mighty.baseId === prod.baseId &&
      mighty.table === prod.table;
    if (sameAsProd) {
      console.log("\n(Skipping second fetch: Mighty sync points at same base+table as production.)");
    } else {
      console.log("\nFetching Mighty sync Airtable…");
      const records = await fetchAllAirtableRecords(
        mighty.apiKey,
        mighty.baseId,
        mighty.table,
        mighty.view
      );
      analyzePhase(mighty.label, mighty, records, mongo.byEmailMongoAR, mongo.byEmailMighty);
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log("Done. No data was modified.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
