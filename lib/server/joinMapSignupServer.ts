import { connectToDatabase } from "../mongodb";
import { invalidateMightyMemberCaches } from "../mightyCacheInvalidate";

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function mapJoinMapFieldsToMongoMember(
  fields: Record<string, unknown>,
  airtableRecordId: string
): Record<string, unknown> {
  const email = normalizeEmail(fields["EMAIL ADDRESS"]);
  const latitude = toFiniteNumber(fields.Latitude);
  const longitude = toFiniteNumber(fields.Longitude);
  const hasCoordinates = latitude !== null && longitude !== null;
  const photo = fields.PHOTO;
  const logo = fields.LOGO;

  return {
    email,
    firstName: String(fields["FIRST NAME"] ?? ""),
    lastName: String(fields["LAST NAME"] ?? ""),
    location: String(fields.Address ?? ""),
    bio: String(fields.BIO ?? ""),
    avatarUrl:
      Array.isArray(photo) && typeof photo[0]?.url === "string" ? photo[0].url : "",
    industry: String(fields["PRIMARY INDUSTRY HOUSE"] ?? ""),
    organizationName: String(fields["ORGANIZATION NAME"] ?? ""),
    affiliatedEntity: String(fields["AFFILIATED ENTITY"] ?? ""),
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    geo: hasCoordinates
      ? { type: "Point", coordinates: [longitude, latitude] }
      : null,
    presentInMightyNetworks: false,
    needsReview: true,
    source: "join_map",
    airtable: { recordId: airtableRecordId },
    fields: Array.isArray(logo) ? { LOGO: logo } : {},
    updatedAt: new Date(),
  };
}

export async function upsertJoinMapMongoMember(
  fields: Record<string, unknown>,
  airtableRecordId: string
): Promise<void> {
  const email = normalizeEmail(fields["EMAIL ADDRESS"]);
  if (!email) throw new Error("Join Map Mongo upsert requires an email address.");

  const { db } = await connectToDatabase();
  const member = mapJoinMapFieldsToMongoMember(fields, airtableRecordId);

  await db.collection("mightyMembers").updateOne(
    { email },
    {
      $set: member,
      $setOnInsert: {
        createdAt: new Date(),
        "subscription.isPaidActive": false,
        "subscription.planNames": [],
        "subscription.planIds": [],
        "subscription.syncSource": "join_map",
        "subscription.updatedAt": new Date(),
      },
    },
    { upsert: true }
  );

  await invalidateMightyMemberCaches().catch((error) => {
    console.warn(
      "[join-map-signup] cache invalidation failed:",
      error instanceof Error ? error.message : String(error)
    );
  });
}
