const { getMemberBio, getMemberBioFromAirtableFields } = require("@/lib/memberBio");

describe("getMemberBio", () => {
  it("prefers top-level bio", () => {
    expect(getMemberBio({ bio: "  Hello  ", fields: { BIO: "legacy" } })).toBe("Hello");
  });

  it("reads legacy fields.BIO when top-level bio is missing", () => {
    expect(getMemberBio({ fields: { BIO: "Alexis bio from Airtable" } })).toBe(
      "Alexis bio from Airtable"
    );
  });

  it("reads Extended Bio from nested fields", () => {
    expect(getMemberBio({ fields: { "Extended Bio": "Mighty table bio" } })).toBe(
      "Mighty table bio"
    );
  });

  it("reads legacy Short Bio from nested fields", () => {
    expect(getMemberBio({ fields: { "Short Bio": "legacy column" } })).toBe("legacy column");
  });

  it("returns empty string when no bio is present", () => {
    expect(getMemberBio({})).toBe("");
    expect(getMemberBio({ fields: { "FIRST NAME": "Alexis" } })).toBe("");
  });
});

describe("getMemberBioFromAirtableFields", () => {
  it("maps Airtable BIO column", () => {
    expect(getMemberBioFromAirtableFields({ BIO: "From main roster" })).toBe(
      "From main roster"
    );
  });
});
