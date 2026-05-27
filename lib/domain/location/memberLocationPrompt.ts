export type MemberLocationMongo = {
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationPromptOptOut?: boolean;
};

/** True when the member should be sent to /update-location (unless they opted out). */
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

export function buildUpdateLocationUrl(nextPath = "/"): string {
  const next = nextPath.startsWith("/") ? nextPath : "/";
  return `/update-location?forced=1&next=${encodeURIComponent(next)}`;
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
