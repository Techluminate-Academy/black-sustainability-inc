import {
  extractLegacyBio,
  extractLegacyPhotoUrl,
} from "@/lib/domain/members/legacyProfileBackfill";

describe("legacyProfileBackfill extraction", () => {
  it("reads bio from legacy BIO field", () => {
    expect(extractLegacyBio({ BIO: "  Solar advocate  " })).toBe("Solar advocate");
  });

  it("returns empty bio when no legacy bio fields", () => {
    expect(extractLegacyBio({ "FIRST NAME": "Ada" })).toBe("");
  });

  it("reads Profile Photo URL from Mighty Members sync fields", () => {
    expect(
      extractLegacyPhotoUrl({
        "Profile Photo URL": "https://cdn.example/headshot.jpg",
      })
    ).toBe("https://cdn.example/headshot.jpg");
  });

  it("extracts portrait photo from PHOTO attachment", () => {
    const url = "https://cdn.example/headshot.jpg";
    expect(
      extractLegacyPhotoUrl({
        PHOTO: [{ url }],
        LOGO: [{ url: "https://cdn.example/logo-wide.png" }],
      })
    ).toBe(url);
  });

  it("skips logo-only PHOTO when it matches LOGO", () => {
    const logo = "https://cdn.example/org-logo.png";
    expect(
      extractLegacyPhotoUrl({
        PHOTO: [{ url: logo }],
        LOGO: [{ url: logo }],
      })
    ).toBeNull();
  });
});
