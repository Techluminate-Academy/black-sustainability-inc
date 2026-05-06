import { upsertAirtableMightyMember } from "../lib/airtableMightyMembers";

describe("upsertAirtableMightyMember", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ records: [] }),
      text: async () => "",
      status: 200,
      statusText: "OK",
    }));
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("skips when airtable env vars are missing", async () => {
    delete process.env.AIRTABLE_PAT;
    delete process.env.AIRTABLE_ACCESS_TOKEN;
    delete process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
    delete process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID;
    delete process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

    const r = await upsertAirtableMightyMember({ mightyId: 1, email: "a@b.com" });
    expect(r.skipped).toBe(true);
  });

  it("creates when no existing record found", async () => {
    process.env.AIRTABLE_PAT = "pat";
    process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID = "base";
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME = "Mighty Members";

    // First call: search -> no records. Second call: create -> returns record.
    (global as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [] }),
        text: async () => "",
        status: 200,
        statusText: "OK",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: [{ id: "rec_new", fields: {} }] }),
        text: async () => "",
        status: 200,
        statusText: "OK",
      });

    const r = await upsertAirtableMightyMember({
      mightyId: 123,
      email: "Test@Example.com",
      firstName: "Test",
      lastName: "User",
      subscription: { isPaidActive: true, statuses: ["MemberPurchased"], updatedAt: new Date().toISOString() },
    });

    expect(r.skipped).toBe(false);
    expect(r.action).toBe("created");
    expect(r.recordId).toBe("rec_new");
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
  });
});

