/**
 * Pure helpers for shaping member records into Mapbox GeoJSON features.
 *
 * The map MUST never plot records without finite coordinates — that would
 * pile every coord-less member onto `mapCenter` (Atlanta). These helpers
 * exist outside `MapboxMap.tsx` so we can unit-test that invariant without
 * having to spin up Mapbox/JSDOM.
 */

export type GeoJsonPointFeature = {
  type: "Feature";
  properties: { id: string | number | undefined };
  geometry: { type: "Point"; coordinates: [number, number] };
};

type MaybeMember = {
  id?: string | number;
  location?: {
    coordinates?: Array<number | string | null | undefined>;
  } | null;
} | null | undefined;

/**
 * Convert a single member record into a GeoJSON Point feature, or `null`
 * if the record's longitude/latitude are missing or non-finite.
 *
 * GeoJSON order is `[lng, lat]`.
 */
export function toMapFeatureOrNull(item: MaybeMember): GeoJsonPointFeature | null {
  const lng = parseFloat(String(item?.location?.coordinates?.[0]));
  const lat = parseFloat(String(item?.location?.coordinates?.[1]));
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return {
    type: "Feature",
    properties: { id: item?.id },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}

/**
 * Build the full GeoJSON feature list for a member array, dropping any
 * records that lack finite coordinates.
 */
export function buildMapFeatures(items: ReadonlyArray<MaybeMember>): GeoJsonPointFeature[] {
  const out: GeoJsonPointFeature[] = [];
  for (const item of items) {
    const feature = toMapFeatureOrNull(item);
    if (feature) out.push(feature);
  }
  return out;
}
