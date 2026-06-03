/**
 * Normalize member bio from Mongo `mightyMembers` docs and Airtable-shaped `fields`.
 */

const MIGHTY_BIO_FIELD_LABEL = "Extended Bio";

/** Airtable / legacy field names that may hold a member bio (first non-empty wins). */
const BIO_NESTED_FIELD_KEYS = [
  MIGHTY_BIO_FIELD_LABEL,
  "Short Bio",
  "BIO",
  "Bio",
  "bio",
  "Member Bio",
  "About",
  "Description",
];

function pickTrimmedString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} doc Mongo member or { bio, fields }
 * @returns {string} Bio text, or "" when missing
 */
function getMemberBio(doc) {
  if (!doc || typeof doc !== "object") return "";

  const topLevel = pickTrimmedString(doc.bio);
  if (topLevel) return topLevel;

  const fields = doc.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "";

  for (const key of BIO_NESTED_FIELD_KEYS) {
    const nested = pickTrimmedString(fields[key]);
    if (nested) return nested;
  }

  return "";
}

function trimmedFieldExpr(fieldName) {
  return {
    $trim: {
      input: {
        $ifNull: [
          { $getField: { field: fieldName, input: { $ifNull: ["$fields", {}] } } },
          "",
        ],
      },
    },
  };
}

function pickFirstNonEmptyExpr(candidates) {
  if (!candidates.length) return "";
  if (candidates.length === 1) return candidates[0];
  const [head, ...rest] = candidates;
  return {
    $cond: {
      if: { $gt: [{ $strLenCP: head }, 0] },
      then: head,
      else: pickFirstNonEmptyExpr(rest),
    },
  };
}

/**
 * Mongo aggregation expression: first non-empty bio from top-level or nested `fields`.
 * @returns {object}
 */
function memberBioCoalesceExpr() {
  return pickFirstNonEmptyExpr([
    { $trim: { input: { $ifNull: ["$bio", ""] } } },
    trimmedFieldExpr("BIO"),
    trimmedFieldExpr(MIGHTY_BIO_FIELD_LABEL),
    trimmedFieldExpr("Short Bio"),
    trimmedFieldExpr("Bio"),
    trimmedFieldExpr("Member Bio"),
    trimmedFieldExpr("About"),
    trimmedFieldExpr("Description"),
    trimmedFieldExpr("bio"),
  ]);
}

/**
 * @param {Record<string, unknown>} airtableFields Raw Airtable `fields` object
 * @returns {string}
 */
function getMemberBioFromAirtableFields(airtableFields) {
  return getMemberBio({ fields: airtableFields });
}

module.exports = {
  BIO_NESTED_FIELD_KEYS,
  getMemberBio,
  getMemberBioFromAirtableFields,
  memberBioCoalesceExpr,
};
