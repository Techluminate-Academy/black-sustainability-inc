import { extractMightyAvatarUrl } from "@/lib/domain/members/mightyAvatar";

describe("extractMightyAvatarUrl", () => {
  it("reads avatar_url from member root", () => {
    expect(extractMightyAvatarUrl({ avatar_url: "https://cdn.mn.co/a.jpg" })).toBe(
      "https://cdn.mn.co/a.jpg"
    );
  });

  it("reads nested profile.avatar_url", () => {
    expect(
      extractMightyAvatarUrl({
        profile: { avatar_url: "https://cdn.mn.co/b.jpg" },
      })
    ).toBe("https://cdn.mn.co/b.jpg");
  });

  it("returns null when missing", () => {
    expect(extractMightyAvatarUrl({ email: "a@b.com" })).toBeNull();
  });
});
