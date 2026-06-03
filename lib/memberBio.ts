/** Default Mighty custom field + Airtable column label for synced member bio. */
export const MIGHTY_BIO_FIELD_LABEL = "Extended Bio";

/** Airtable / legacy field names that may hold a member bio (first non-empty wins). */
export const BIO_NESTED_FIELD_KEYS = [
  MIGHTY_BIO_FIELD_LABEL,
  "Short Bio",
  "BIO",
  "Bio",
  "bio",
  "Member Bio",
  "About",
  "Description",
] as const;

function pickTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getMemberBioRaw(doc: Record<string, unknown> | null | undefined): string {
  if (!doc || typeof doc !== "object") return "";

  const topLevel = pickTrimmedString(doc.bio);
  if (topLevel) return topLevel;

  const fields = doc.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "";

  for (const key of BIO_NESTED_FIELD_KEYS) {
    const nested = pickTrimmedString((fields as Record<string, unknown>)[key]);
    if (nested) return nested;
  }

  return "";
}

/** Returns bio text or null when missing (for optional profile fields). */
export function getMemberBio(doc: Record<string, unknown> | null | undefined): string | null {
  const bio = getMemberBioRaw(doc);
  return bio.length > 0 ? bio : null;
}

export function getMemberBioFromAirtableFields(
  airtableFields: Record<string, unknown>
): string | null {
  return getMemberBio({ fields: airtableFields });
}
