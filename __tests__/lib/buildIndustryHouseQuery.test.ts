const {
  resolveCanonicalIndustryHouse,
  normalizeIndustryHouseQueryParam,
} = require("@/lib/buildIndustryHouseQuery.js");

describe("resolveCanonicalIndustryHouse", () => {
  it("returns the canonical label when given the canonical label itself", () => {
    expect(resolveCanonicalIndustryHouse("☀️ Alternative Energy")).toBe("☀️ Alternative Energy");
  });

  it("resolves legacy short-form aliases to the canonical dropdown label", () => {
    expect(resolveCanonicalIndustryHouse("Alternative Renewable Energy")).toBe(
      "☀️ Alternative Energy"
    );
    expect(resolveCanonicalIndustryHouse("Community Development")).toBe("🏘 Community Development");
    expect(resolveCanonicalIndustryHouse("Climate/Environmental Justice")).toBe(
      "Climate/Environmental Justice"
    );
    expect(resolveCanonicalIndustryHouse("💻 Technology")).toBe("💻 Technology");
    expect(resolveCanonicalIndustryHouse("Water")).toBe("💧Water");
    expect(resolveCanonicalIndustryHouse("Reparative Agriculture")).toBe("🌾 Reparative Agriculture");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveCanonicalIndustryHouse("  waste  ")).toBe("🗑 Waste");
    expect(resolveCanonicalIndustryHouse("WHOLISTIC HEALTH")).toBe("🧘🏿‍♀️ Wholistic Health");
  });

  it("returns null for unknown values", () => {
    expect(resolveCanonicalIndustryHouse("Something Unrelated")).toBeNull();
    expect(resolveCanonicalIndustryHouse("")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(resolveCanonicalIndustryHouse(null)).toBeNull();
    expect(resolveCanonicalIndustryHouse(undefined)).toBeNull();
  });
});

describe("normalizeIndustryHouseQueryParam", () => {
  it("passes through a single string param", () => {
    expect(normalizeIndustryHouseQueryParam("💧Water")).toBe("💧Water");
  });

  it("takes the first value of an array param", () => {
    expect(normalizeIndustryHouseQueryParam(["💧Water", "🗑 Waste"])).toBe("💧Water");
  });

  it("returns empty string for missing values", () => {
    expect(normalizeIndustryHouseQueryParam(undefined)).toBe("");
    expect(normalizeIndustryHouseQueryParam(null)).toBe("");
  });
});
