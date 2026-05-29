/** Approved copy for the map help popup (do not change without stakeholder sign-off). */
export const MAP_HELP_INTRO = "Running into any issues? Let us know here:";

/** Main Black Sustainability Network site (member-facing). */
export const BLACK_SUSTAINABILITY_NETWORK_HOME_URL = "https://www.blacksustainability.org/";

/** Fallback until NEXT_PUBLIC_MAP_SUPPORT_FORM_URL is set (e.g. Google Form). */
const DEFAULT_MAP_SUPPORT_FORM_URL = "https://www.blacksustainability.org/support";

export function getMapSupportFormUrl(): string {
  const url = process.env.NEXT_PUBLIC_MAP_SUPPORT_FORM_URL?.trim();
  return url || DEFAULT_MAP_SUPPORT_FORM_URL;
}
