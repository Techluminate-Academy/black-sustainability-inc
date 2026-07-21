import { mapJoinMapFieldsToMightyMembers } from "@/lib/server/airtableFreeSignupServer";

jest.mock("@/lib/redis", () => ({
  __esModule: true,
  default: { get: jest.fn(), setex: jest.fn() },
}));

describe("mapJoinMapFieldsToMightyMembers", () => {
  it("maps the Join Map form into the new Mighty Members Airtable schema", () => {
    expect(
      mapJoinMapFieldsToMightyMembers({
        "FIRST NAME": "Amina",
        "LAST NAME": "Jones",
        "EMAIL ADDRESS": "amina@example.com",
        Address: "Atlanta, GA",
        Latitude: "33.749",
        Longitude: "-84.388",
        "PRIMARY INDUSTRY HOUSE": "☀️ Alternative Energy",
        BIO: "Community solar organizer",
        PHOTO: [{ url: "https://example.com/photo.jpg" }],
        LOGO: [{ url: "https://example.com/logo.jpg" }],
        "ORGANIZATION NAME": "Solar Collective",
        "AFFILIATED ENTITY": "BSN Atlanta",
      })
    ).toEqual({
      "First Name": "Amina",
      "Last Name": "Jones",
      "Primary Email": "amina@example.com",
      City: "Atlanta, GA",
      Latitude: "33.749",
      Longitude: "-84.388",
      "Industry / Sector": "☀️ Alternative Energy",
      "Extended Bio": "Community solar organizer",
      "Profile Photo URL": "https://example.com/photo.jpg",
      "Present in Mighty Networks": false,
      "Needs Review": true,
      "Internal Notes": [
        "Source: Join Map form",
        "Organization: Solar Collective",
        "Affiliated Entity: BSN Atlanta",
        "Logo URL: https://example.com/logo.jpg",
      ].join("\n"),
    });
  });
});
