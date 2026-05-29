export type MemberLocationMongo = {
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationPromptOptOut?: boolean;
};

/** True when the member should be prompted to update location (unless they opted out). */
export function memberNeedsLocationPrompt(
  mongo: MemberLocationMongo | null | undefined
): boolean {
  if (!mongo) return true;
  if (mongo.locationPromptOptOut === true) return false;

  const hasCoords =
    typeof mongo.latitude === "number" &&
    Number.isFinite(mongo.latitude) &&
    typeof mongo.longitude === "number" &&
    Number.isFinite(mongo.longitude);
  const hasLocation =
    typeof mongo.location === "string" && mongo.location.trim().length >= 2;

  return !hasLocation || !hasCoords;
}

/** Opens the update-location modal on the map home page (`/?updateLocation=1&forced=1`). */
export function buildUpdateLocationUrl(nextPath = "/"): string {
  const next = nextPath.startsWith("/") ? nextPath : "/";
  const params = new URLSearchParams();
  params.set("updateLocation", "1");
  params.set("forced", "1");
  if (next !== "/") params.set("next", next);
  return `/?${params.toString()}`;
}

/** After saving location, return to the map and fly to the member's pin. */
export function buildMapFocusAfterSaveUrl(
  nextPath: string,
  lat: number,
  lng: number
): string {
  const base = nextPath.startsWith("/") ? nextPath : "/";
  const qIndex = base.indexOf("?");
  const path = qIndex >= 0 ? base.slice(0, qIndex) : base;
  const params = new URLSearchParams(qIndex >= 0 ? base.slice(qIndex + 1) : "");
  params.set("focus", "self");
  params.set("lat", String(lat));
  params.set("lng", String(lng));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
