/**
 * Backfill mightyMembers.industry from production Airtable PRIMARY INDUSTRY HOUSE.
 *
 * Default: --dry-run (no writes). Use --apply to execute bulk updates.
 * Optional --overwrite: set industry even when mightyMembers.industry is already non-empty.
 *
 * Env: NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN, NEXT_PUBLIC_AIRTABLE_BASE_ID,
 *      NEXT_PUBLIC_AIRTABLE_TABLE_NAME, optional view vars (see dry run script).
 *      MONGODB_URI or NEXT_PUBLIC_MONGODB_URI
 *
 * Usage:
 *   node scripts/backfill-mightyMembers-industry-from-airtable.js
 *   node scripts/backfill-mightyMembers-industry-from-airtable.js --apply
 *   node scripts/backfill-mightyMembers-industry-from-airtable.js --apply --overwrite
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

const DATABASE_NAME = "members";
const COLLECTION_MIGHTY = "mightyMembers";
const BULK_SIZE = 250;

const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;

function resolveProductionAirtable() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN || null;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || null;
  const table = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || null;
  const view =
    process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID_NOT_SORTED?.trim() ||
    process.env.NEXT_PUBLIC_AIRTABLE_VIEW_ID?.trim() ||
    null;
  if (!apiKey || !baseId || !table) return null;
  return { apiKey, baseId, table, view };
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

function emailFromAirtableFields(f) {
  return (
    normEmail(f["Primary Email"]) ||
    normEmail(f["EMAIL ADDRESS"]) ||
    normEmail(f["Email"]) ||
    normEmail(f.email)
  );
}

function primaryIndustryHouseFromFields(f) {
  if (!f || !Object.prototype.hasOwnProperty.call(f, "PRIMARY INDUSTRY HOUSE")) return "";
  return stringifyAirtableValue(f["PRIMARY INDUSTRY HOUSE"]).trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      if (e.body && /VIEW_ID_NOT_FOUND|view.*not found/i.test(String(e.body))) {
        console.warn(`View "${view}" not found — fetching whole table without view.`);
        return await pull(null);
      }
      throw e;
    }
  }
  return await pull(null);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    apply: argv.includes("--apply"),
    overwrite: argv.includes("--overwrite"),
  };
}

async function main() {
  const { apply, overwrite } = parseArgs();
  const atCfg = resolveProductionAirtable();
  if (!atCfg) {
    console.error("Missing NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN, BASE_ID, or TABLE_NAME.");
    process.exit(1);
  }
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI / NEXT_PUBLIC_MONGODB_URI.");
    process.exit(1);
  }

  console.log("=== mightyMembers.industry backfill from production Airtable ===\n");
  console.log("Mode:", apply ? (overwrite ? "APPLY (overwrite non-empty too)" : "APPLY (empty industry only)") : "DRY-RUN (no writes)");
  console.log("Airtable base/table:", atCfg.baseId, "/", atCfg.table, atCfg.view ? `(view ${atCfg.view})` : "");

  console.log("\nFetching Airtable…");
  const records = await fetchAllAirtableRecords(atCfg.apiKey, atCfg.baseId, atCfg.table, atCfg.view);
  console.log("Rows:", records.length);

  /** @type {Map<string, string>} */
  const emailToIndustry = new Map();
  let skippedNoEmail = 0;
  let skippedNoPrimary = 0;

  for (const rec of records) {
    const f = rec.fields || {};
    const email = emailFromAirtableFields(f);
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }
    const primary = primaryIndustryHouseFromFields(f);
    if (!primary) {
      skippedNoPrimary += 1;
      continue;
    }
    emailToIndustry.set(email, primary);
  }

  console.log("Airtable rows with email + PRIMARY INDUSTRY HOUSE:", emailToIndustry.size);
  console.log("Skipped (no email):", skippedNoEmail);
  console.log("Skipped (no PRIMARY INDUSTRY HOUSE):", skippedNoPrimary);

  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const col = client.db(DATABASE_NAME).collection(COLLECTION_MIGHTY);

  /** @type {Map<string, { industry: string }>} */
  const mightyByEmail = new Map();
  const mmCursor = col.find({}, { projection: { email: 1, industry: 1 } });
  for await (const doc of mmCursor) {
    const e = normEmail(doc?.email);
    if (!e) continue;
    mightyByEmail.set(e, {
      industry: typeof doc.industry === "string" ? doc.industry.trim() : "",
    });
  }
  console.log("mightyMembers rows indexed by email:", mightyByEmail.size);

  let wouldUpdate = 0;
  let wouldSkipHasIndustry = 0;
  let wouldSkipNoMember = 0;
  const sample = [];

  const ops = [];

  for (const [email, industry] of emailToIndustry) {
    const existing = mightyByEmail.get(email);
    if (!existing) {
      wouldSkipNoMember += 1;
      continue;
    }
    const current = existing.industry || "";
    if (current && !overwrite) {
      wouldSkipHasIndustry += 1;
      continue;
    }
    wouldUpdate += 1;
    if (sample.length < 12) {
      sample.push({ email, from: industry.slice(0, 60), had: current || "(empty)" });
    }
    if (apply) {
      const filter = { email: new RegExp(`^${escapeRegex(email)}$`, "i") };
      ops.push({
        updateOne: {
          filter,
          update: {
            $set: {
              industry,
              updatedAt: new Date(),
              industryBackfillSource: "airtable:production:PRIMARY_INDUSTRY_HOUSE",
            },
          },
        },
      });
    }
  }

  console.log("\n--- Summary ---");
  console.log("Members to update:", wouldUpdate);
  console.log("Skip (no mightyMembers row for email):", wouldSkipNoMember);
  console.log("Skip (already has industry, use --overwrite):", wouldSkipHasIndustry);
  console.log("\nSample updates:");
  sample.forEach((r, i) => console.log(`  ${i + 1}.`, JSON.stringify(r)));

  if (apply && ops.length) {
    let modified = 0;
    for (let i = 0; i < ops.length; i += BULK_SIZE) {
      const chunk = ops.slice(i, i + BULK_SIZE);
      const res = await col.bulkWrite(chunk, { ordered: false });
      modified += res.modifiedCount;
    }
    console.log("\nApplied bulkWrite batches; modifiedCount (approx):", modified);
  } else if (apply) {
    console.log("\nNothing to apply (ops=0).");
  } else {
    console.log("\nRe-run with --apply to write these updates.");
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
