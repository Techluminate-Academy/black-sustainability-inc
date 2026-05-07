/**
 * Expands agriculture-related industry filter values so Mongo matches legacy + normalized
 * strings. mightyMembers may use top-level `industry` (sync/Mighty) and/or nested
 * `fields.PRIMARY INDUSTRY HOUSE` (legacy Airtable-shaped docs) — both are queried.
 *
 * Ported from wix-billing-enforcement agriculture / reparative filter fix.
 */

const LEGACY_PRIMARY_INDUSTRY = "fields.PRIMARY INDUSTRY HOUSE";

/** Broad agriculture umbrella (legacy + current Mongo `industry` strings). */
const AGRICULTURE_VALUES = [
  "Sustainable Agriculture+Land Management",
  "Sustainable Agriculture Land Management",
  "Agriculture",
  "🌾 Agriculture/Sustainable Food Production / Land Management",
  "🌾 Reparative Agriculture",
];

/**
 * Reparative-only: must NOT reuse the full agriculture list or the count matches everyone in ag.
 */
const REPARATIVE_VALUES = ["🌾 Reparative Agriculture", "Reparative Agriculture"];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Airtable / sync often stores multi-select industry as one string (comma-separated). Exact `$in`
 * misses those rows; add substring regex matches per canonical value.
 * Matches either top-level `industry` or legacy `fields.PRIMARY INDUSTRY HOUSE`.
 * @param {string[]} values
 * @returns {{ $or: object[] }}
 */
function industryStringMatchesAny(values) {
  const paths = ["industry", LEGACY_PRIMARY_INDUSTRY];
  const or = [];
  for (const field of paths) {
    or.push({ [field]: { $in: values } });
    for (const v of values) {
      if (typeof v !== "string" || !v.trim()) continue;
      or.push({ [field]: { $regex: escapeRegex(v), $options: "i" } });
    }
  }
  return { $or: or };
}

/** Short tokens that would false-positive as regex substrings across unrelated industries. */
const AGRICULTURE_EXACT_ONLY = new Set(["Agriculture"]);

/**
 * @param {string} industryHouse - value from IndustryHouses select
 * @returns {string | { $in: string[] } | { $or: object[] } | null} - assign to `industry` or legacy field
 */
function buildPrimaryIndustryHouseFilter(industryHouse) {
  if (!industryHouse || industryHouse === "") return null;
  if (industryHouse === "🌾 Reparative Agriculture") {
    return industryStringMatchesAny(REPARATIVE_VALUES);
  }
  if (industryHouse === "🌾 Agriculture/Sustainable Food Production / Land Management") {
    const forRegex = AGRICULTURE_VALUES.filter((v) => !AGRICULTURE_EXACT_ONLY.has(v));
    const or = [];
    for (const field of ["industry", LEGACY_PRIMARY_INDUSTRY]) {
      or.push({ [field]: { $in: AGRICULTURE_VALUES } });
      for (const v of forRegex) {
        if (typeof v !== "string" || !v.trim()) continue;
        or.push({ [field]: { $regex: escapeRegex(v), $options: "i" } });
      }
    }
    return { $or: or };
  }
  return {
    $or: [
      { industry: industryHouse },
      { [LEGACY_PRIMARY_INDUSTRY]: industryHouse },
    ],
  };
}

/**
 * Merge industry filter into a Mongo query object. Top-level `$or` is used when the filter
 * is not a single `industry` equality (see `industryStringMatchesAny`).
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

module.exports = {
  buildPrimaryIndustryHouseFilter,
  applyIndustryHouseToMongoQuery,
};
