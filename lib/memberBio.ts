import {
  getMemberBio as getMemberBioJs,
  getMemberBioFromAirtableFields as getMemberBioFromAirtableFieldsJs,
} from "./memberBio.js";

function toBioOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Returns bio text or null when missing (for optional profile fields). */
export function getMemberBio(doc: Record<string, unknown> | null | undefined): string | null {
  return toBioOrNull(getMemberBioJs(doc));
}

export function getMemberBioFromAirtableFields(
  airtableFields: Record<string, unknown>
): string | null {
  return toBioOrNull(getMemberBioFromAirtableFieldsJs(airtableFields));
}
