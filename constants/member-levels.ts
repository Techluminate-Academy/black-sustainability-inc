// These IDs match the linked records in Airtable's MEMBER LEVEL table
export const HARDCODED_MEMBER_LEVELS = [
  { id: "recGP35SbgqyZ4FQN", name: "🏢 Entity - Black & Green Organization" },
  { id: "recgWTcJQnfOQW0Dm", name: "👓 Enthusiast -Excited to Learn" },
  { id: "rectzSiMASJ9OcN52", name: "🥋 Expert - Experienced Professional" },
  { id: "recEqcQWORWPnOh3d", name: "Young Environmental Scholar" },
] as const;

// Type for member level
export type MemberLevel = typeof HARDCODED_MEMBER_LEVELS[number]['id']; 