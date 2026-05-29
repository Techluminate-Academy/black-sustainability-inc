import {
  memberNeedsLocationPrompt,
  buildUpdateLocationUrl,
  buildMapFocusAfterSaveUrl,
} from "@/lib/domain/location/memberLocationPrompt";

describe("memberLocationPrompt", () => {
  it("requires prompt when mongo is null", () => {
    expect(memberNeedsLocationPrompt(null)).toBe(true);
  });

  it("requires prompt when location or coords missing", () => {
    expect(memberNeedsLocationPrompt({ location: "NYC" })).toBe(true);
    expect(memberNeedsLocationPrompt({ latitude: 1, longitude: 2 })).toBe(true);
    expect(
      memberNeedsLocationPrompt({
        location: "New York, NY",
        latitude: 40.7,
        longitude: -74,
      })
    ).toBe(false);
  });

  it("skips prompt when opted out", () => {
    expect(
      memberNeedsLocationPrompt({
        locationPromptOptOut: true,
      })
    ).toBe(false);
  });

  it("builds map URL that opens update-location modal with forced flag", () => {
    expect(buildUpdateLocationUrl("/")).toBe("/?updateLocation=1&forced=1");
    expect(buildUpdateLocationUrl("/directory")).toBe(
      "/?updateLocation=1&forced=1&next=%2Fdirectory"
    );
  });

  it("builds map focus URL after save", () => {
    expect(buildMapFocusAfterSaveUrl("/", 40.71, -74.0)).toBe(
      "/?focus=self&lat=40.71&lng=-74"
    );
  });
});
