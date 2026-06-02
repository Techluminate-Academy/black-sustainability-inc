import {
  getMemberBio as getMemberBioJs,
  getMemberBioFromAirtableFields as getMemberBioFromAirtableFieldsJs,
} from "./memberBio.js";

/** Returns bio text or null when missing (for optional profile fields). */
export function getMemberBio(doc: Record<string, unknown> | null | undefined): string | null {
  const bio = getMemberBioJs(doc);
  return bio.length > 0 ? bio : null;
}

export function getMemberBioFromAirtableFields(
  airtableFields: Record<string, unknown>
): string | null {
  const bio = getMemberBioFromAirtableFieldsJs(airtableFields);
  return bio.length > 0 ? bio : null;
}

export { memberBioCoalesceExpr } from "./memberBio.js";
