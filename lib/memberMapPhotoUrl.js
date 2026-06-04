/**
 * Resolve member headshot URL for map markers / cards from Mongo `mightyMembers`.
 * Mighty `avatarUrl` first; legacy photos use a stable API path that re-fetches
 * fresh Airtable attachment URLs (they expire).
 */

const {
  LEGACY_PHOTO_API_PATH,
  legacyMemberPhotoProxyPath,
  isValidAirtableRecordId,
} = require("./memberLegacyPhotoProxy");

function pickFirstNonEmptyExpr(candidates) {
  if (!candidates.length) return "";
  if (candidates.length === 1) return candidates[0];
  const [head, ...rest] = candidates;
  return {
    $cond: {
      if: { $gt: [{ $strLenCP: head }, 0] },
      then: head,
      else: pickFirstNonEmptyExpr(rest),
    },
  };
}

function trimmedTopLevelFieldExpr(fieldName) {
  return {
    $trim: {
      input: { $ifNull: [`$${fieldName}`, ""] },
    },
  };
}

function trimmedNestedFieldExpr(fieldName) {
  return {
    $trim: {
      input: {
        $ifNull: [
          { $getField: { field: fieldName, input: { $ifNull: ["$fields", {}] } } },
          "",
        ],
      },
    },
  };
}

function trimmedNestedAttachmentUrlExpr(fieldName) {
  return {
    $trim: {
      input: {
        $ifNull: [
          {
            $getField: {
              field: "url",
              input: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      {
                        $cond: {
                          if: {
                            $isArray: {
                              $getField: {
                                field: fieldName,
                                input: { $ifNull: ["$fields", {}] },
                              },
                            },
                          },
                          then: {
                            $getField: {
                              field: fieldName,
                              input: { $ifNull: ["$fields", {}] },
                            },
                          },
                          else: [],
                        },
                      },
                      0,
                    ],
                  },
                  {},
                ],
              },
            },
          },
          "",
        ],
      },
    },
  };
}

/** Stable /api path when `legacyAvatarAirtableRecordId` is set (fresh URL from Airtable). */
function legacyPhotoProxyUrlExpr() {
  const recordId = trimmedTopLevelFieldExpr("legacyAvatarAirtableRecordId");
  return {
    $cond: {
      if: { $gt: [{ $strLenCP: recordId }, 0] },
      then: { $concat: ["/api/member-legacy-photo?recordId=", recordId] },
      else: "",
    },
  };
}

/**
 * Mongo aggregation expression: first non-empty map display photo URL.
 * @returns {object}
 */
function memberMapPhotoCoalesceExpr() {
  return pickFirstNonEmptyExpr([
    trimmedTopLevelFieldExpr("avatarUrl"),
    legacyPhotoProxyUrlExpr(),
    trimmedTopLevelFieldExpr("legacyAvatarUrl"),
    trimmedNestedFieldExpr("Profile Photo URL"),
    trimmedNestedFieldExpr("userphoto"),
    trimmedNestedFieldExpr("Profile Photo"),
    trimmedNestedFieldExpr("Profile Image"),
    trimmedNestedFieldExpr("headshot"),
    trimmedNestedFieldExpr("Headshot"),
    trimmedNestedAttachmentUrlExpr("PHOTO"),
  ]);
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {string}
 */
function getMemberMapPhotoUrl(doc) {
  if (!doc || typeof doc !== "object") return "";

  const topAvatar =
    typeof doc.avatarUrl === "string" && doc.avatarUrl.trim().length > 0
      ? doc.avatarUrl.trim()
      : "";
  if (topAvatar) return topAvatar;

  const recordId =
    typeof doc.legacyAvatarAirtableRecordId === "string"
      ? doc.legacyAvatarAirtableRecordId.trim()
      : "";
  if (isValidAirtableRecordId(recordId)) {
    return legacyMemberPhotoProxyPath(recordId);
  }

  const legacy =
    typeof doc.legacyAvatarUrl === "string" && doc.legacyAvatarUrl.trim().length > 0
      ? doc.legacyAvatarUrl.trim()
      : "";
  if (legacy) return legacy;

  const fields = doc.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "";

  for (const key of ["Profile Photo URL", "userphoto", "Profile Photo", "PHOTO"]) {
    const raw = fields[key];
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
    if (Array.isArray(raw) && raw[0] && typeof raw[0].url === "string" && raw[0].url.trim()) {
      return raw[0].url.trim();
    }
  }

  return "";
}

/**
 * Mongo aggregation: 1 when a map/directory photo URL would resolve, else 0.
 * @returns {object}
 */
function memberHasProfilePhotoExpr() {
  const url = memberMapPhotoCoalesceExpr();
  return {
    $cond: {
      if: { $gt: [{ $strLenCP: url }, 0] },
      then: 1,
      else: 0,
    },
  };
}

/**
 * Directory/card sort tier (higher = show first):
 *   2 = live https avatar (Mighty CDN, etc.)
 *   1 = legacy Airtable photo via /api/member-legacy-photo
 *   0 = no displayable headshot
 * @returns {object}
 */
function memberPhotoSortTierExpr() {
  const resolved = memberMapPhotoCoalesceExpr();
  const legacyRec = trimmedTopLevelFieldExpr("legacyAvatarAirtableRecordId");
  return {
    $switch: {
      branches: [
        { case: { $regexMatch: { input: resolved, regex: /^https?:\/\// } }, then: 2 },
        { case: { $gt: [{ $strLenCP: legacyRec }, 0] }, then: 1 },
        {
          case: {
            $regexMatch: { input: resolved, regex: /^\/api\/member-legacy-photo/ },
          },
          then: 1,
        },
      ],
      default: 0,
    },
  };
}

/**
 * @param {string | null | undefined} url
 * @returns {0 | 1 | 2}
 */
function photoSortTierFromUrl(url) {
  if (!url || typeof url !== "string") return 0;
  const t = url.trim();
  if (!t.length) return 0;
  if (t.startsWith(LEGACY_PHOTO_API_PATH)) return 1;
  if (t.startsWith("http://") || t.startsWith("https://")) return 2;
  return 0;
}

module.exports = {
  LEGACY_PHOTO_API_PATH,
  memberMapPhotoCoalesceExpr,
  memberHasProfilePhotoExpr,
  memberPhotoSortTierExpr,
  photoSortTierFromUrl,
  getMemberMapPhotoUrl,
  legacyPhotoProxyUrlExpr,
  legacyMemberPhotoProxyPath,
  isValidAirtableRecordId,
};
