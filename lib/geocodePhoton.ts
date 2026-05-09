/**
 * Geocode free-text location via Photon (Komoot) — no API key.
 * Used when Mighty supplies "location" text but no lat/lng for map markers.
 */
export async function geocodePhotonFreeText(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: Array<{ geometry?: { coordinates?: unknown } }> };
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
