import { getMapSupportFormUrl, MAP_HELP_INTRO } from "@/lib/mapSupportConfig";

describe("mapSupportConfig", () => {
  const original = process.env.NEXT_PUBLIC_MAP_SUPPORT_FORM_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_MAP_SUPPORT_FORM_URL;
    } else {
      process.env.NEXT_PUBLIC_MAP_SUPPORT_FORM_URL = original;
    }
  });

  it("exposes approved help intro copy", () => {
    expect(MAP_HELP_INTRO).toBe("Running into any issues? Let us know here:");
  });

  it("uses env URL when set", () => {
    process.env.NEXT_PUBLIC_MAP_SUPPORT_FORM_URL = "https://forms.example/map";
    expect(getMapSupportFormUrl()).toBe("https://forms.example/map");
  });

  it("falls back to BSN support page when env is empty", () => {
    delete process.env.NEXT_PUBLIC_MAP_SUPPORT_FORM_URL;
    expect(getMapSupportFormUrl()).toBe("https://www.blacksustainability.org/support");
  });
});
