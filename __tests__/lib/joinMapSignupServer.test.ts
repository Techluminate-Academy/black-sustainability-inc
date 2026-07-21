import { connectToDatabase } from "@/lib/mongodb";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";
import {
  mapJoinMapFieldsToMongoMember,
  upsertJoinMapMongoMember,
} from "@/lib/server/joinMapSignupServer";

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn(),
}));

jest.mock("@/lib/mightyCacheInvalidate", () => ({
  invalidateMightyMemberCaches: jest.fn(),
}));

describe("mapJoinMapFieldsToMongoMember", () => {
  it("creates a map-visible, non-Mighty member with numeric coordinates", () => {
    const result = mapJoinMapFieldsToMongoMember(
      {
        "FIRST NAME": "Amina",
        "LAST NAME": "Jones",
        "EMAIL ADDRESS": " Amina@Example.com ",
        Address: "Atlanta, GA",
        Latitude: 33.749,
        Longitude: -84.388,
        "PRIMARY INDUSTRY HOUSE": "☀️ Alternative Energy",
        BIO: "Community solar organizer",
        PHOTO: [{ url: "https://example.com/photo.jpg" }],
        LOGO: [{ url: "https://example.com/logo.jpg" }],
        "ORGANIZATION NAME": "Solar Collective",
        "AFFILIATED ENTITY": "BSN Atlanta",
      },
      "recTest123"
    );

    expect(result).toMatchObject({
      email: "amina@example.com",
      firstName: "Amina",
      lastName: "Jones",
      location: "Atlanta, GA",
      latitude: 33.749,
      longitude: -84.388,
      geo: { type: "Point", coordinates: [-84.388, 33.749] },
      presentInMightyNetworks: false,
      needsReview: true,
      source: "join_map",
      airtable: { recordId: "recTest123" },
      fields: { LOGO: [{ url: "https://example.com/logo.jpg" }] },
    });
    expect(result).not.toHaveProperty("mightyId");
  });

  it("upserts an explicitly unpaid Mongo member and invalidates map caches", async () => {
    const updateOne = jest.fn().mockResolvedValue({ upsertedCount: 1 });
    (connectToDatabase as jest.Mock).mockResolvedValue({
      db: { collection: jest.fn(() => ({ updateOne })) },
    });
    (invalidateMightyMemberCaches as jest.Mock).mockResolvedValue({ totalDeleted: 1 });

    await upsertJoinMapMongoMember(
      {
        "FIRST NAME": "Amina",
        "LAST NAME": "Jones",
        "EMAIL ADDRESS": "amina@example.com",
        Address: "Atlanta, GA",
        Latitude: 33.749,
        Longitude: -84.388,
      },
      "recTest123"
    );

    expect(updateOne).toHaveBeenCalledWith(
      { email: "amina@example.com" },
      expect.objectContaining({
        $set: expect.objectContaining({
          airtable: { recordId: "recTest123" },
          presentInMightyNetworks: false,
          geo: { type: "Point", coordinates: [-84.388, 33.749] },
        }),
        $setOnInsert: expect.objectContaining({
          "subscription.isPaidActive": false,
          "subscription.syncSource": "join_map",
        }),
      }),
      { upsert: true }
    );
    expect(invalidateMightyMemberCaches).toHaveBeenCalled();
  });
});
