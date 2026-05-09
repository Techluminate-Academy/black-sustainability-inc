import { toMapFeatureOrNull, buildMapFeatures } from "@/lib/mapFeatures";

describe("toMapFeatureOrNull", () => {
  it("returns a [lng, lat] GeoJSON Point feature for valid numeric coordinates", () => {
    const feature = toMapFeatureOrNull({
      id: "abc",
      location: { coordinates: [-51.92528, -14.235004] }, // Brazil
    });
    expect(feature).toEqual({
      type: "Feature",
      properties: { id: "abc" },
      geometry: { type: "Point", coordinates: [-51.92528, -14.235004] },
    });
  });

  it("parses string coordinates that come from Mongo via Airtable shape", () => {
    const feature = toMapFeatureOrNull({
      id: 1,
      location: { coordinates: ["-84.388" as any, "33.749" as any] },
    });
    expect(feature?.geometry.coordinates).toEqual([-84.388, 33.749]);
  });

  it("returns null for records missing location entirely", () => {
    expect(toMapFeatureOrNull({ id: "x" } as any)).toBeNull();
  });

  it("returns null when coordinates are missing", () => {
    expect(
      toMapFeatureOrNull({ id: "x", location: {} } as any)
    ).toBeNull();
  });

  it("returns null when only one coordinate is present (the bug we fixed)", () => {
    expect(
      toMapFeatureOrNull({ id: "x", location: { coordinates: [-84.388] } } as any)
    ).toBeNull();
    expect(
      toMapFeatureOrNull({
        id: "x",
        location: { coordinates: [undefined, 33.749] as any },
      })
    ).toBeNull();
  });

  it("returns null for non-numeric / NaN coordinates so we never fall back to mapCenter", () => {
    expect(
      toMapFeatureOrNull({
        id: "x",
        location: { coordinates: ["abc" as any, "def" as any] },
      })
    ).toBeNull();
    expect(
      toMapFeatureOrNull({
        id: "x",
        location: { coordinates: [null as any, null as any] },
      })
    ).toBeNull();
  });

  it("rejects Infinity / -Infinity", () => {
    expect(
      toMapFeatureOrNull({
        id: "x",
        location: { coordinates: [Infinity, 33] as any },
      })
    ).toBeNull();
  });

  it("accepts coordinates at exactly 0,0 (valid lat/lng, not falsy)", () => {
    const feature = toMapFeatureOrNull({
      id: "origin",
      location: { coordinates: [0, 0] },
    });
    expect(feature).not.toBeNull();
    expect(feature?.geometry.coordinates).toEqual([0, 0]);
  });
});

describe("buildMapFeatures", () => {
  it("filters out records without valid coordinates and keeps the order of valid ones", () => {
    const items = [
      { id: "1", location: { coordinates: [-51.92, -14.23] } },
      { id: "2", location: { coordinates: [] as any } }, // skipped
      { id: "3", location: null }, // skipped
      { id: "4", location: { coordinates: [-84.388, 33.749] } },
    ];
    const features = buildMapFeatures(items);
    expect(features.map((f) => f.properties.id)).toEqual(["1", "4"]);
  });

  it("returns [] for an empty input", () => {
    expect(buildMapFeatures([])).toEqual([]);
  });
});
