/**
 * Expands agriculture-related industry filter values so Mongo matches legacy + normalized
 * strings. Use on `mightyMembers.industry` or legacy `fields.PRIMARY INDUSTRY HOUSE`.
 *
 * Ported from wix-billing-enforcement agriculture / reparative filter fix.
 */

const AGRICULTURE_DROPDOWN = new Set([
  "🌾 Agriculture/Sustainable Food Production / Land Management",
  "🌾 Reparative Agriculture",
]);

const AGRICULTURE_VALUES = [
  "Sustainable Agriculture+Land Management",
  "Sustainable Agriculture Land Management",
  "Agriculture",
  "🌾 Agriculture/Sustainable Food Production / Land Management",
  "🌾 Reparative Agriculture",
];

/**
 * @param {string} industryHouse - value from IndustryHouses select
 * @returns {string | { $in: string[] }} - assign to `industry` or `fields.PRIMARY INDUSTRY HOUSE`
 */
function buildPrimaryIndustryHouseFilter(industryHouse) {
  if (!industryHouse || industryHouse === "") return null;
  if (AGRICULTURE_DROPDOWN.has(industryHouse)) {
    return { $in: AGRICULTURE_VALUES };
  }
  return industryHouse;
}

module.exports = { buildPrimaryIndustryHouseFilter };
