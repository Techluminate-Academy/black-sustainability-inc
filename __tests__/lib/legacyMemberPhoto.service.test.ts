import { resolveLegacyMemberPhotoUrl } from "@/lib/domain/members/legacyMemberPhoto.service";

jest.mock("@/lib/domain/members/legacyProfileBackfill", () => ({
  fetchPhotoUrlFromAirtableRecord: jest.fn(),
  getMightyMembersSourceConfig: jest.fn(() => ({
    apiKey: "pat",
    baseId: "base",
    table: "tbl",
  })),
}));

jest.mock("@/lib/redis", () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => null),
    setex: jest.fn(async () => "OK"),
  },
}));

const { fetchPhotoUrlFromAirtableRecord } = jest.requireMock(
  "@/lib/domain/members/legacyProfileBackfill"
) as { fetchPhotoUrlFromAirtableRecord: jest.Mock };

describe("resolveLegacyMemberPhotoUrl", () => {
  beforeEach(() => {
    fetchPhotoUrlFromAirtableRecord.mockReset();
  });

  it("rejects invalid record ids", async () => {
    const result = await resolveLegacyMemberPhotoUrl("not-a-record", { useCache: false });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid recordId" });
  });

  it("fetches a fresh URL from Airtable", async () => {
    fetchPhotoUrlFromAirtableRecord.mockResolvedValue("https://cdn.airtable/fresh.jpg");

    const result = await resolveLegacyMemberPhotoUrl("recABCDEF123456", { useCache: false });
    expect(result).toEqual({
      ok: true,
      url: "https://cdn.airtable/fresh.jpg",
      fromCache: false,
    });
    expect(fetchPhotoUrlFromAirtableRecord).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "pat" }),
      "recABCDEF123456"
    );
  });
});
