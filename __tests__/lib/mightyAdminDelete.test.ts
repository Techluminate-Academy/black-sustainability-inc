import { deleteMightyMember } from "@/lib/mightyAdmin";

describe("deleteMightyMember", () => {
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

  it("deletes the supplied member ID", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
    }) as unknown as typeof fetch;

    await expect(deleteMightyMember(42)).resolves.toEqual({
      deleted: true,
      status: 204,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.test/admin/v1/networks/123/members/42/",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("returns the API error without treating a failed delete as success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: jest.fn().mockResolvedValue("not allowed"),
    }) as unknown as typeof fetch;

    await expect(deleteMightyMember(42)).resolves.toEqual({
      deleted: false,
      status: 403,
      error: "not allowed",
    });
  });
});
