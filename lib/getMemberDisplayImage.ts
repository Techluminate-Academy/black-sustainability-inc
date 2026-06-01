/** Default BSN/BSI platform icon when no member headshot or org logo is available. */
export const BSN_PLATFORM_ICON = "/png/LOGO.png";

const HEADSHOT_FIELD_KEYS = [
  "userphoto",
  "headshot",
  "Headshot",
  "User Photo",
  "Profile Photo",
  "Profile Image",
  "PHOTO",
] as const;

const LOGO_FIELD_KEYS = [
  "logo",
  "Logo",
  "LOGO",
  "Organization Logo",
  "Company Logo",
  "logoUrl",
] as const;

type AttachmentLike = {
  url?: unknown;
  thumbnails?: {
    full?: { url?: unknown };
    large?: { url?: unknown };
    small?: { url?: unknown };
  };
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Normalize Airtable attachments, plain URLs, and local asset paths to a single URL string. */
export function extractMemberImageUrl(value: unknown): string | null {
  if (value == null) return null;

  if (isNonEmptyString(value)) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractMemberImageUrl(item);
      if (url) return url;
    }
    return null;
  }

  if (typeof value === "object") {
    const attachment = value as AttachmentLike;
    if (isNonEmptyString(attachment.url)) return attachment.url.trim();
    if (isNonEmptyString(attachment.thumbnails?.full?.url)) {
      return String(attachment.thumbnails.full.url).trim();
    }
    if (isNonEmptyString(attachment.thumbnails?.large?.url)) {
      return String(attachment.thumbnails.large.url).trim();
    }
    if (isNonEmptyString(attachment.thumbnails?.small?.url)) {
      return String(attachment.thumbnails.small.url).trim();
    }
  }

  return null;
}

function pickFirstFromFields(
  fields: Record<string, unknown> | null | undefined,
  keys: readonly string[]
): string | null {
  if (!fields) return null;
  for (const key of keys) {
    const url = extractMemberImageUrl(fields[key]);
    if (url) return url;
  }
  return null;
}

/** True when the member has a headshot/profile photo (fill the teardrop with cover). */
export function hasMemberHeadshot(
  fields: Record<string, unknown> | null | undefined
): boolean {
  return pickFirstFromFields(fields, HEADSHOT_FIELD_KEYS) != null;
}

/** True when the resolved image is the default BSN/BSI platform logo (wide asset). */
export function isPlatformIconUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  return src === BSN_PLATFORM_ICON || src.endsWith(BSN_PLATFORM_ICON);
}

function normalizeImageUrl(url: string): string {
  try {
    return new URL(url, "http://local").pathname.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Wide brand/org logos stored in avatar fields should not use portrait cover-crop. */
export function isLikelyWideBrandImageUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  if (isPlatformIconUrl(src)) return true;

  const path = normalizeImageUrl(src);
  if (path.includes("black-sustainability") || path.includes("blacksustainability")) {
    return true;
  }
  if (/\/logo[\d._-]*\.(png|jpe?g|webp|gif)$/i.test(path)) return true;
  if (path.endsWith("/logo.png") || path.endsWith("/logo.jpg")) return true;

  return false;
}

/** Member has a real headshot URL (not a logo stored in avatar fields). */
export function isPortraitHeadshotUrl(
  fields: Record<string, unknown> | null | undefined
): boolean {
  const headshot = pickFirstFromFields(fields, HEADSHOT_FIELD_KEYS);
  if (!headshot) return false;
  if (isPlatformIconUrl(headshot) || isLikelyWideBrandImageUrl(headshot)) return false;

  const logo = pickFirstFromFields(fields, LOGO_FIELD_KEYS);
  if (logo && normalizeImageUrl(headshot) === normalizeImageUrl(logo)) return false;

  return true;
}

/** Markers use cover for portrait headshots; contain for logos and platform icon. */
export function shouldUseContainedMarkerImage(
  fields: Record<string, unknown> | null | undefined
): boolean {
  const headshot = pickFirstFromFields(fields, HEADSHOT_FIELD_KEYS);
  if (!headshot) return true;

  if (isPlatformIconUrl(headshot) || isLikelyWideBrandImageUrl(headshot)) return true;

  const logo = pickFirstFromFields(fields, LOGO_FIELD_KEYS);
  if (logo && normalizeImageUrl(headshot) === normalizeImageUrl(logo)) return true;

  return false;
}

/**
 * Resolve the image shown on map markers and sidebar/gallery cards.
 * Order: headshot/user photo → organization logo → BSN platform icon.
 */
export function getMemberDisplayImage(
  fields: Record<string, unknown> | null | undefined
): string {
  return (
    pickFirstFromFields(fields, HEADSHOT_FIELD_KEYS) ??
    pickFirstFromFields(fields, LOGO_FIELD_KEYS) ??
    BSN_PLATFORM_ICON
  );
}

export function getMarkerImageLayoutMode(
  fields: Record<string, unknown> | null | undefined
): "cover" | "contain" {
  return shouldUseContainedMarkerImage(fields) ? "contain" : "cover";
}
