/**
 * Pure reshape tests for `lib/mightyMemberAirtableShape.js`.
 *
 * This module converts MongoDB `mightyMembers` documents into the
 * Airtable-shaped objects the BSN UI was originally built around. A bug here
 * silently breaks the directory, the map, and the search results in lockstep,
 * so we lock its contract down with explicit cases.
 */

const { toAirtableishDoc } = require("@/lib/mightyMemberAirtableShape");

describe("toAirtableishDoc — id and identity", () => {
  it("uses _id (stringified) when present", () => {
    const out = toAirtableishDoc({ _id: { toString: () => "mongo-id" }, mightyId: 99 });
    expect(out.id).toBe("mongo-id");
  });

  it("falls back to mightyId (stringified) when _id is missing", () => {
    const out = toAirtableishDoc({ mightyId: 12345 });
    expect(out.id).toBe("12345");
  });

  it("returns empty id when both _id and mightyId are missing", () => {
    const out = toAirtableishDoc({});
    expect(out.id).toBe("");
  });

  it("treats mightyId=0 as a valid id (not falsy)", () => {
    const out = toAirtableishDoc({ mightyId: 0 });
    expect(out.id).toBe("0");
  });
});

describe("toAirtableishDoc — name handling", () => {
  it("composes FULL NAME from firstName + lastName", () => {
    const out = toAirtableishDoc({ firstName: "Jerry", lastName: "Bony" });
    expect(out.fields["FIRST NAME"]).toBe("Jerry");
    expect(out.fields["LAST NAME"]).toBe("Bony");
    expect(out.fields["FULL NAME"]).toBe("Jerry Bony");
  });

  it("trims FULL NAME when only firstName is set", () => {
    const out = toAirtableishDoc({ firstName: "Jerry" });
    expect(out.fields["FULL NAME"]).toBe("Jerry");
  });

  it("trims FULL NAME when only lastName is set", () => {
    const out = toAirtableishDoc({ lastName: "Bony" });
    expect(out.fields["FULL NAME"]).toBe("Bony");
  });

  it("returns empty FULL NAME when both names are missing", () => {
    expect(toAirtableishDoc({}).fields["FULL NAME"]).toBe("");
  });
});

describe("toAirtableishDoc — coordinates and GeoJSON location", () => {
  it("includes a GeoJSON Point when both lat and lng are valid numbers", () => {
    const out = toAirtableishDoc({ latitude: -14.235, longitude: -51.925 });
    expect(out.location).toEqual({ type: "Point", coordinates: [-51.925, -14.235] });
  });

  it("treats numeric strings as valid coordinates", () => {
    const out = toAirtableishDoc({ latitude: "33.749", longitude: "-84.388" });
    expect(out.location).toEqual({ type: "Point", coordinates: [-84.388, 33.749] });
  });

  it("DOES NOT include a location field when coordinates are missing (the Atlanta-fallback bug we already fixed at the map layer)", () => {
    const out = toAirtableishDoc({ firstName: "No", lastName: "Coords" });
    expect("location" in out).toBe(false);
  });

  it("does not include a location field when only latitude is present", () => {
    const out = toAirtableishDoc({ latitude: 33.749 });
    expect("location" in out).toBe(false);
  });

  it("does not include a location field for non-numeric strings", () => {
    const out = toAirtableishDoc({ latitude: "abc", longitude: "def" });
    expect("location" in out).toBe(false);
  });

  it("accepts coordinates at exactly 0, 0", () => {
    const out = toAirtableishDoc({ latitude: 0, longitude: 0 });
    expect(out.location).toEqual({ type: "Point", coordinates: [0, 0] });
  });

  it("preserves the raw lat/lng on the LATITUDE/LONGITUDE (NEW) fields even when GeoJSON is rejected", () => {
    const out = toAirtableishDoc({ latitude: 33.749 }); // missing lng → no GeoJSON
    expect(out.fields["LATITUDE (NEW)"]).toBe(33.749);
    expect(out.fields["LONGITUDE (NEW)"]).toBeNull();
  });
});

describe("toAirtableishDoc — industry house fallback", () => {
  it("prefers top-level `industry` from the Mighty payload", () => {
    const out = toAirtableishDoc({
      industry: "☀️ Alternative Energy",
      fields: { "PRIMARY INDUSTRY HOUSE": "stale legacy value" },
    });
    expect(out.fields["PRIMARY INDUSTRY HOUSE"]).toBe("☀️ Alternative Energy");
  });

  it("falls back to legacy `fields.PRIMARY INDUSTRY HOUSE` when industry is missing", () => {
    const out = toAirtableishDoc({
      fields: { "PRIMARY INDUSTRY HOUSE": "💧Water" },
    });
    expect(out.fields["PRIMARY INDUSTRY HOUSE"]).toBe("💧Water");
  });

  it("returns empty string when neither source has a value", () => {
    expect(toAirtableishDoc({}).fields["PRIMARY INDUSTRY HOUSE"]).toBe("");
  });
});

describe("toAirtableishDoc — photo / avatar", () => {
  it("wraps avatarUrl in the Airtable PHOTO attachment-style array", () => {
    const out = toAirtableishDoc({ avatarUrl: "https://cdn/avatar.jpg" });
    expect(out.fields.PHOTO).toEqual([{ url: "https://cdn/avatar.jpg" }]);
    expect(out.fields.userphoto).toBe("https://cdn/avatar.jpg");
  });

  it("returns an empty PHOTO array and null userphoto when no avatar is set", () => {
    const out = toAirtableishDoc({});
    expect(out.fields.PHOTO).toEqual([]);
    expect(out.fields.userphoto).toBeNull();
  });
});

describe("toAirtableishDoc — string defaults and shape stability", () => {
  it("defaults all string fields to '' so the UI never sees undefined", () => {
    const out = toAirtableishDoc({});
    expect(out.fields["FIRST NAME"]).toBe("");
    expect(out.fields["LAST NAME"]).toBe("");
    expect(out.fields["EMAIL ADDRESS"]).toBe("");
    expect(out.fields["Location (Nearest City)"]).toBe("");
    expect(out.fields.BIO).toBe("");
    expect(out.fields.WEBSITE).toBe("");
    expect(out.fields["ORGANIZATION NAME"]).toBe("");
    expect(out.fields["MEMBER LEVEL"]).toBe("");
  });

  it("includes the full set of expected `fields` keys (regression guard)", () => {
    const out = toAirtableishDoc({});
    expect(Object.keys(out.fields).sort()).toEqual(
      [
        "BIO",
        "EMAIL ADDRESS",
        "FIRST NAME",
        "FULL NAME",
        "LAST NAME",
        "LATITUDE (NEW)",
        "LONGITUDE (NEW)",
        "Location (Nearest City)",
        "MEMBER LEVEL",
        "ORGANIZATION NAME",
        "PHOTO",
        "PRIMARY INDUSTRY HOUSE",
        "WEBSITE",
        "userphoto",
      ].sort()
    );
  });

  it("returns LATITUDE (NEW) / LONGITUDE (NEW) as null when not provided (not undefined)", () => {
    const out = toAirtableishDoc({});
    expect(out.fields["LATITUDE (NEW)"]).toBeNull();
    expect(out.fields["LONGITUDE (NEW)"]).toBeNull();
  });

  it("uses `d.location` (the Mighty city STRING) for `Location (Nearest City)`, not the GeoJSON object", () => {
    const out = toAirtableishDoc({
      location: "Salvador, BA, Brazil",
      latitude: -12.97,
      longitude: -38.5,
    });
    // The string field maps from `d.location`
    expect(out.fields["Location (Nearest City)"]).toBe("Salvador, BA, Brazil");
    // The OUTPUT location is the GeoJSON we built from the coords (NOT the string)
    expect(out.location).toEqual({
      type: "Point",
      coordinates: [-38.5, -12.97],
    });
  });
});
