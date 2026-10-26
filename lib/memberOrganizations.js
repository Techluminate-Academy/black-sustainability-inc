/** Keep a member's own organization distinct from their affiliated entity. */
const ORGANIZATION_FIELDS = ['ORGANIZATION NAME', 'Organization'];
const AFFILIATION_FIELDS = ['AFFILIATED ENTITY', 'Affiliated Entity'];

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).join(', ');
  return '';
}

function firstValue(doc, key, fields) {
  const top = text(doc?.[key]);
  if (top) return top;
  for (const field of fields) {
    const value = text(doc?.fields?.[field]);
    if (value) return value;
  }
  return '';
}

function getMemberOrganization(doc) {
  return firstValue(doc, 'organizationName', ORGANIZATION_FIELDS);
}
function getMemberAffiliation(doc) {
  return firstValue(doc, 'affiliatedEntity', AFFILIATION_FIELDS);
}

module.exports = { getMemberOrganization, getMemberAffiliation, ORGANIZATION_FIELDS, AFFILIATION_FIELDS };
