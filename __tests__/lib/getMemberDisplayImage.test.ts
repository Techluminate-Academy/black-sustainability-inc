import {
  BSN_PLATFORM_ICON,
  extractMemberImageUrl,
  getMemberDisplayImage,
  isPlatformIconUrl,
  shouldUseContainedMarkerImage,
} from "@/lib/getMemberDisplayImage";

describe("getMemberDisplayImage", () => {
  it("prefers headshot/user photo fields over logo", () => {
    const url = getMemberDisplayImage({
      userphoto: "https://cdn.example/headshot.jpg",
      LOGO: [{ url: "https://cdn.example/logo.png" }],
    });
    expect(url).toBe("https://cdn.example/headshot.jpg");
  });

  it("falls back to logo when no headshot is present", () => {
    const url = getMemberDisplayImage({
      LOGO: [{ url: "https://cdn.example/logo.png" }],
    });
    expect(url).toBe("https://cdn.example/logo.png");
  });

  it("uses PHOTO attachment arrays as headshot", () => {
    const url = getMemberDisplayImage({
      PHOTO: [{ url: "https://cdn.example/photo.jpg" }],
    });
    expect(url).toBe("https://cdn.example/photo.jpg");
  });

  it("returns the BSN platform icon when no images are available", () => {
    expect(getMemberDisplayImage({})).toBe(BSN_PLATFORM_ICON);
    expect(getMemberDisplayImage(null)).toBe(BSN_PLATFORM_ICON);
    expect(getMemberDisplayImage(undefined)).toBe(BSN_PLATFORM_ICON);
  });

  it("ignores empty strings and empty attachment arrays", () => {
    expect(
      getMemberDisplayImage({
        userphoto: "  ",
        PHOTO: [],
        logoUrl: "",
        LOGO: [{ url: "https://cdn.example/logo.png" }],
      })
    ).toBe("https://cdn.example/logo.png");
  });

  it("supports plain local asset paths", () => {
    expect(getMemberDisplayImage({ userphoto: "assets/rec123.png" })).toBe(
      "assets/rec123.png"
    );
  });
});

describe("shouldUseContainedMarkerImage", () => {
  it("uses cover for portrait headshots", () => {
    expect(
      shouldUseContainedMarkerImage({ userphoto: "https://cdn.example/headshot.jpg" })
    ).toBe(false);
  });

  it("uses contain for logos, platform fallback, and missing photos", () => {
    expect(shouldUseContainedMarkerImage({ LOGO: [{ url: "https://cdn/l.png" }] })).toBe(
      true
    );
    expect(shouldUseContainedMarkerImage({ userphoto: "/png/LOGO.png" })).toBe(true);
    expect(shouldUseContainedMarkerImage({})).toBe(true);
  });
});

describe("isPlatformIconUrl", () => {
  it("detects the default platform logo path", () => {
    expect(isPlatformIconUrl(BSN_PLATFORM_ICON)).toBe(true);
    expect(isPlatformIconUrl("https://example.com/png/LOGO.png")).toBe(true);
    expect(isPlatformIconUrl("https://cdn.example/avatar.jpg")).toBe(false);
  });
});

describe("extractMemberImageUrl", () => {
  it("reads thumbnail URLs from Airtable-style attachments", () => {
    expect(
      extractMemberImageUrl({
        thumbnails: { full: { url: "https://cdn.example/full.jpg" } },
      })
    ).toBe("https://cdn.example/full.jpg");
  });
});
