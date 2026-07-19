import type { NextApiRequest, NextApiResponse } from "next";
import httpMocks from "node-mocks-http";

jest.mock("@/lib/domain/members/legacyMemberPhoto.service", () => ({
  resolveLegacyMemberPhotoUrl: jest.fn(),
}));

const { resolveLegacyMemberPhotoUrl } = jest.requireMock(
  "@/lib/domain/members/legacyMemberPhoto.service"
) as { resolveLegacyMemberPhotoUrl: jest.Mock };

describe("/api/member-legacy-photo", () => {
  beforeEach(() => {
    resolveLegacyMemberPhotoUrl.mockReset();
  });

  it("redirects to a fresh Airtable photo URL", async () => {
    resolveLegacyMemberPhotoUrl.mockResolvedValue({
      ok: true,
      url: "https://cdn.airtable/fresh.jpg",
      fromCache: false,
    });

    const req = httpMocks.createRequest<NextApiRequest>({
      method: "GET",
      query: { recordId: "recABCDEF123456" },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member-legacy-photo")).default;
    await handler(req, res);

    expect(res.statusCode).toBe(302);
    expect(res.getHeader("Location")).toBe("https://cdn.airtable/fresh.jpg");
    expect(resolveLegacyMemberPhotoUrl).toHaveBeenCalledWith("recABCDEF123456");
  });

  it("returns 404 when the record has no photo", async () => {
    resolveLegacyMemberPhotoUrl.mockResolvedValue({
      ok: false,
      status: 404,
      error: "No legacy photo on record",
    });

    const req = httpMocks.createRequest<NextApiRequest>({
      method: "GET",
      query: { recordId: "recABCDEF123456" },
    });
    const res = httpMocks.createResponse<NextApiResponse>();
    const handler = (await import("@/pages/api/member-legacy-photo")).default;
    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });
});
