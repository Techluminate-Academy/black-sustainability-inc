/**
 * Maps Industry Houses dropdown values (Mighty/Airtable UI strings, often with emoji)
 * to what is actually stored on `mightyMembers.industry` after sync.
 *
 * As of inspection: ~2.5k docs have `industry: ""`; non-empty values are short names like
 * "Water", "Sustainable Agriculture+Land Management" — not "💧Water" or "🌾 …".
 * Legacy `fields.PRIMARY INDUSTRY HOUSE` is still queried for forward compatibility.
 */

const LEGACY_PRIMARY_INDUSTRY = "fields.PRIMARY INDUSTRY HOUSE";

/** Stored forms seen on mightyMembers.industry (Airtable "Industry / Sector"). */
const MONGO_AG_CORE = [
  "Sustainable Agriculture+Land Management",
  "Sustainable Agriculture Land Management",
  "Agriculture",
];

const MONGO_AG_WITH_LIVESTOCK = [...MONGO_AG_CORE, "Livestock"];

/** Long / legacy labels still used in filters and older rows. */
const AGRICULTURE_LONG_FORM = [
  "🌾 Agriculture/Sustainable Food Production / Land Management",
  "🌾 Reparative Agriculture",
];

const REPARATIVE_UI_FORMS = ["🌾 Reparative Agriculture", "Reparative Agriculture"];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * UI `IndustryHouses.value` → strings that appear in Mongo `industry`.
 * Keys must match `utils/IndustryDetails.tsx` values exactly.
 */
const UI_INDUSTRY_TO_DB_STRINGS = {
  "💰 Alternative Economics": ["Alternative Economics"],
  "☀️ Alternative Energy": ["Alternative Renewable Energy"],
  "🏘 Community Development": ["Community Development"],
  "Environmental Justice/Advocacy": [
    "Environmental Justice/Advocacy",
    "Environmental Justice",
    "Environmental",
  ],
  "🧑🏾‍🏫 Education & Cultural Preservation": ["Education + Cultural Preservation"],
  "🛖 Eco-friendly Building": ["Eco-Friendly Building", "EcoBuilding + EcoHousing"],
  "♻️ Green Lifestyle": ["Green Lifestyle, Beauty, Fashion"],
  "🆘 Survival/Preparedness": ["Survival Preparedness"],
  "🌾 Agriculture/Sustainable Food Production / Land Management": [
    ...MONGO_AG_WITH_LIVESTOCK,
    ...AGRICULTURE_LONG_FORM,
  ],
  /** No separate reparative token in Mongo yet — align to core ag strings + UI spellings. */
  "🌾 Reparative Agriculture": [...REPARATIVE_UI_FORMS, ...MONGO_AG_CORE],
  "🗑 Waste": ["Waste"],
  "💧Water": ["Water"],
  "🧘🏿‍♀️ Wholistic Health": ["Wholistic Health"],
  /** Distinct industry strings in DB that are not covered by other houses. */
  "❓ Other": [
    "Clothing manufacturing",
    "Teaching, Writing",
    "Web Development",
    "Spirituality",
    "Sustainable Communities",
  ],
};

/**
 * @param {string[]} values
 * @returns {{ $or: object[] }}
 */
function industryStringMatchesAny(values) {
  const seen = new Set();
  const uniq = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }

  const paths = ["industry", LEGACY_PRIMARY_INDUSTRY];
  const or = [];
  for (const field of paths) {
    or.push({ [field]: { $in: uniq } });
    for (const v of uniq) {
      or.push({ [field]: { $regex: escapeRegex(v), $options: "i" } });
    }
  }
  return { $or: or };
}

/**
 * @param {string} industryHouse - value from IndustryHouses select
 * @returns {{ $or: object[] } | null}
 */
function buildPrimaryIndustryHouseFilter(industryHouse) {
  if (!industryHouse || industryHouse === "") return null;

  if (Object.prototype.hasOwnProperty.call(UI_INDUSTRY_TO_DB_STRINGS, industryHouse)) {
    return industryStringMatchesAny(UI_INDUSTRY_TO_DB_STRINGS[industryHouse]);
  }

  return industryStringMatchesAny([industryHouse]);
}

/**
 * @param {Record<string, unknown>} query
 * @param {string} industryHouse
 */
function applyIndustryHouseToMongoQuery(query, industryHouse) {
  if (!industryHouse || industryHouse === "") return;
  const industryClause = buildPrimaryIndustryHouseFilter(industryHouse);
  if (industryClause == null) return;
  if (industryClause.$or && Array.isArray(industryClause.$or)) {
    query.$or = industryClause.$or;
    return;
  }
  query.industry = industryClause;
}

/** Normalize Next.js `req.query` which may be string | string[]. */
function normalizeIndustryHouseQueryParam(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw).trim();
}

module.exports = {
  buildPrimaryIndustryHouseFilter,
  applyIndustryHouseToMongoQuery,
  normalizeIndustryHouseQueryParam,
};
