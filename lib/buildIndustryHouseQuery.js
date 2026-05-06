/**
 * Expands agriculture-related industry filter values so Mongo matches legacy + normalized
 * strings. Use on `mightyMembers.industry` or legacy `fields.PRIMARY INDUSTRY HOUSE`.
 *
 * Ported from wix-billing-enforcement agriculture / reparative filter fix.
 */

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

/**
 * @param {string} industryHouse - value from IndustryHouses select
 * @returns {string | { $in: string[] }} - assign to `industry` or `fields.PRIMARY INDUSTRY HOUSE`
 */
function buildPrimaryIndustryHouseFilter(industryHouse) {
  if (!industryHouse || industryHouse === "") return null;
  if (industryHouse === "🌾 Reparative Agriculture") {
    return { $in: REPARATIVE_VALUES };
  }
  if (industryHouse === "🌾 Agriculture/Sustainable Food Production / Land Management") {
    return { $in: AGRICULTURE_VALUES };
  }
  return industryHouse;
}

module.exports = { buildPrimaryIndustryHouseFilter };
