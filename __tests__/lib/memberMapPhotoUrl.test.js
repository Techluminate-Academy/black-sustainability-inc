const {
  getMemberMapPhotoUrl,
  memberPhotoSortTierExpr,
} = require("../../lib/memberMapPhotoUrl");

describe("getMemberMapPhotoUrl", () => {
  it("prefers avatarUrl over legacy Airtable record link", () => {
    expect(
      getMemberMapPhotoUrl({
        avatarUrl: "https://cdn.mighty/avatar.jpg",
        legacyAvatarAirtableRecordId: "recABCDEF123456",
      })
    ).toBe("https://cdn.mighty/avatar.jpg");
  });

  it("uses stable legacy photo API path when only Airtable record id is set", () => {
    expect(
      getMemberMapPhotoUrl({
        legacyAvatarAirtableRecordId: "recABCDEF123456",
      })
    ).toBe("/api/member-legacy-photo?recordId=recABCDEF123456");
  });

  it("falls back to legacyAvatarUrl when record id is missing", () => {
    expect(
      getMemberMapPhotoUrl({
        legacyAvatarUrl: "https://cdn.airtable/legacy.jpg",
      })
    ).toBe("https://cdn.airtable/legacy.jpg");
  });

  it("reads Profile Photo URL from nested fields", () => {
    expect(
      getMemberMapPhotoUrl({
        fields: { "Profile Photo URL": "https://cdn.airtable/from-fields.jpg" },
      })
    ).toBe("https://cdn.airtable/from-fields.jpg");
  });

  it("reads PHOTO attachment urls from nested Airtable fields", () => {
    expect(
      getMemberMapPhotoUrl({
        fields: {
          PHOTO: [{ url: "https://v5.airtableusercontent.com/.attachments/headshot.jpg" }],
        },
      })
    ).toBe("https://v5.airtableusercontent.com/.attachments/headshot.jpg");
  });
});

describe("memberPhotoSortTierExpr", () => {
  it("treats resolved https urls as top-tier photos and legacy proxy paths as second-tier", () => {
    expect(memberPhotoSortTierExpr()).toEqual({
      $switch: {
        branches: [
          {
            case: {
              $regexMatch: {
                input: expect.any(Object),
                regex: /^https?:\/\//,
              },
            },
            then: 2,
          },
          {
            case: {
              $gt: [{ $strLenCP: expect.any(Object) }, 0],
            },
            then: 1,
          },
          {
            case: {
              $regexMatch: {
                input: expect.any(Object),
                regex: /^\/api\/member-legacy-photo/,
              },
            },
            then: 1,
          },
        ],
        default: 0,
      },
    });
  });
});
