import {
  getMemberPhotoSortTier,
  memberHasDisplayPhoto,
  memberHasDisplayPhotoForRecord,
  sortMembersPhotosFirst,
} from "@/lib/sortMembersPhotosFirst";
import { BSN_PLATFORM_ICON } from "@/lib/getMemberDisplayImage";

describe("sortMembersPhotosFirst", () => {
  it("places https avatars before legacy proxy before no photo", () => {
    const input = [
      { id: "1", fields: { "FULL NAME": "No Photo" } },
      { id: "2", fields: { userphoto: "https://cdn.example/a.jpg", "FULL NAME": "Ada" } },
      { id: "3", fields: {} },
      { id: "4", fields: { PHOTO: [{ url: "/api/member-legacy-photo?recordId=recABCDEF123456" }] } },
    ];
    const sorted = sortMembersPhotosFirst(input);
    expect(sorted.map((r) => r.id)).toEqual(["2", "4", "1", "3"]);
  });

  it("keeps relative order within photo and non-photo groups", () => {
    const input = [
      { id: "a", fields: {} },
      { id: "b", fields: { userphoto: "https://x/1.jpg" } },
      { id: "c", fields: {} },
      { id: "d", fields: { userphoto: "https://x/2.jpg" } },
    ];
    expect(sortMembersPhotosFirst(input).map((r) => r.id)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("getMemberPhotoSortTier", () => {
  it("ranks https avatars above legacy proxy paths", () => {
    expect(getMemberPhotoSortTier({ fields: { userphoto: "https://cdn/a.jpg" } })).toBe(2);
    expect(
      getMemberPhotoSortTier({
        fields: { userphoto: "/api/member-legacy-photo?recordId=recABCDEF123456" },
      })
    ).toBe(1);
    expect(getMemberPhotoSortTier({ fields: {} })).toBe(0);
  });
});

describe("memberHasDisplayPhotoForRecord", () => {
  it("detects top-level userphoto from getMarkers shape", () => {
    expect(
      memberHasDisplayPhotoForRecord({
        fields: { "FULL NAME": "Ada" },
        userphoto: "/api/member-legacy-photo?recordId=recABCDEF123456",
      })
    ).toBe(true);
  });
});

describe("memberHasDisplayPhoto", () => {
  it("returns false for platform icon only", () => {
    expect(memberHasDisplayPhoto({ userphoto: BSN_PLATFORM_ICON })).toBe(false);
  });

  it("returns true for legacy photo proxy paths", () => {
    expect(
      memberHasDisplayPhoto({
        userphoto: "/api/member-legacy-photo?recordId=recABCDEF123456",
      })
    ).toBe(true);
  });
});
