import {
  extractMemberImageUrl,
  getMemberDisplayImage,
  isLikelyWideBrandImageUrl,
  isPlatformIconUrl,
} from "@/lib/getMemberDisplayImage";
import { photoSortTierFromUrl } from "@/lib/memberMapPhotoUrl";

const HEADSHOT_KEYS = [
  "userphoto",
  "headshot",
  "Headshot",
  "User Photo",
  "Profile Photo URL",
  "Profile Photo",
  "Profile Image",
  "PHOTO",
] as const;

function isRealHeadshotUrl(url: string | null): boolean {
  if (!url) return false;
  if (isPlatformIconUrl(url) || isLikelyWideBrandImageUrl(url)) return false;
  return true;
}

/** True when the card would show a real headshot (not the default BSN icon). */
export function memberHasDisplayPhoto(
  fields: Record<string, unknown> | null | undefined
): boolean {
  return getMemberPhotoSortTier({ fields: fields ?? undefined }) > 0;
}

/** Directory/marker record (getData, getMarkers, search). */
export type MemberDirectoryRecord = {
  fields?: Record<string, unknown>;
  userphoto?: unknown;
};

/**
 * Sort tier for directory cards (higher = closer to top):
 * 2 = https avatar already on the member doc
 * 1 = legacy Airtable photo (proxy path)
 * 0 = platform icon / no headshot
 */
export function getMemberPhotoSortTier(record: MemberDirectoryRecord | null | undefined): number {
  if (!record) return 0;

  let tier = 0;
  const fields = record.fields;

  const topUrl = extractMemberImageUrl(record.userphoto);
  if (isRealHeadshotUrl(topUrl)) {
    tier = Math.max(tier, photoSortTierFromUrl(topUrl));
  }

  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    for (const key of HEADSHOT_KEYS) {
      const url = extractMemberImageUrl(fields[key]);
      if (isRealHeadshotUrl(url)) {
        tier = Math.max(tier, photoSortTierFromUrl(url));
      }
    }
  }

  const resolved = getMemberDisplayImage(fields);
  if (isRealHeadshotUrl(resolved)) {
    tier = Math.max(tier, photoSortTierFromUrl(resolved));
  }

  return tier;
}

export function memberHasDisplayPhotoForRecord(record: MemberDirectoryRecord | null | undefined): boolean {
  return getMemberPhotoSortTier(record) > 0;
}

/**
 * Stable sort: visible https photos first, then legacy Airtable, then logos.
 */
export function sortMembersPhotosFirst<T extends MemberDirectoryRecord>(
  items: readonly T[]
): T[] {
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const aTier = getMemberPhotoSortTier(a.item);
    const bTier = getMemberPhotoSortTier(b.item);
    if (aTier !== bTier) return bTier - aTier;
    return a.index - b.index;
  });
  return indexed.map((x) => x.item);
}
