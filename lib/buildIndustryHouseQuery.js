/**
 * Maps Industry Houses dropdown values to `mightyMembers.industry` (and legacy fields).
 *
 * `industry` may be: (a) short strings from Mighty sync "Industry / Sector", or
 * (b) emoji-style labels from Airtable `PRIMARY INDUSTRY HOUSE` after backfill — usually
 * the same string as the dropdown `value`. Each mapping includes the canonical UI `value`
 * plus legacy short forms where they differ.
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
 * Extra stored strings beyond the dropdown `value` (short Airtable sector names, etc.).
 * The canonical `value` itself is always prepended when building the filter list.
 */
const UI_INDUSTRY_EXTRA_ALIASES = {
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
  "🌾 Reparative Agriculture": [...REPARATIVE_UI_FORMS, ...MONGO_AG_CORE],
  "🗑 Waste": ["Waste"],
  "💧Water": ["Water"],
  "🧘🏿‍♀️ Wholistic Health": ["Wholistic Health"],
  "❓ Other": [
    "Clothing manufacturing",
    "Teaching, Writing",
    "Web Development",
    "Spirituality",
    "Sustainable Communities",
  ],
};

const UI_INDUSTRY_TO_DB_STRINGS = Object.fromEntries(
  Object.entries(UI_INDUSTRY_EXTRA_ALIASES).map(([uiValue, extras]) => [
    uiValue,
    [uiValue, ...extras],
  ])
);

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
