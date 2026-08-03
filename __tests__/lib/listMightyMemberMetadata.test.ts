import { listMightyMemberMetadata } from "@/lib/mightyAdmin";

describe("listMightyMemberMetadata", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.MIGHTY_API_KEY = "test-key";
    process.env.MIGHTY_NETWORK_ID = "123";
    process.env.MIGHTY_ADMIN_API_BASE_URL = "https://api.example.test";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.MIGHTY_API_KEY;
    delete process.env.MIGHTY_NETWORK_ID;
    delete process.env.MIGHTY_ADMIN_API_BASE_URL;
  });

  it("pages until an empty items array and keeps only discovery fields", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 11,
              email: "A@Example.com",
              updated_at: "2026-08-03T12:00:00Z",
              first_name: "A",
            },
          ],
          links: { next: "/admin/v1/networks/123/members?page=2" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: "22", email: "b@example.com", updated_at: "2026-08-01T00:00:00Z" }],
          links: { next: "/admin/v1/networks/123/members?page=3" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          links: { next: "/admin/v1/networks/123/members?page=4" },
        }),
      }) as unknown as typeof fetch;

    const rows = await listMightyMemberMetadata();
    expect(rows).toEqual([
      { mightyId: 11, email: "a@example.com", updatedAt: "2026-08-03T12:00:00Z" },
      { mightyId: 22, email: "b@example.com", updatedAt: "2026-08-01T00:00:00Z" },
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/admin/v1/networks/123/members?per_page=100&page=1",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      })
    );
  });
});
