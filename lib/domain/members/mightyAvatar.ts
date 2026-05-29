/** Extract a profile image URL from a Mighty Admin API or webhook member object. */
export function extractMightyAvatarUrl(member: Record<string, unknown> | null | undefined): string | null {
  if (!member || typeof member !== "object") return null;

  const candidates: unknown[] = [
    member.avatar_url,
    member.avatarUrl,
    (member.profile as Record<string, unknown> | undefined)?.avatar_url,
    (member.profile as Record<string, unknown> | undefined)?.avatarUrl,
    (member.user as Record<string, unknown> | undefined)?.avatar_url,
    (member.user as Record<string, unknown> | undefined)?.avatarUrl,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return c.trim();
    }
  }

  return null;
}
