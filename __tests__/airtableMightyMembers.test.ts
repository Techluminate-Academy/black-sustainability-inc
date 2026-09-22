import {
  getAirtableMightyBioFieldName,
  upsertAirtableMightyMember,
} from "../lib/airtableMightyMembers";

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

  it.each([null, undefined, "", "   "])("omits an absent email (%j) while retaining member identity", async (email) => {
    const { buildAirtableMightyMemberFields } = await import("../lib/airtableMightyMembers");
    const fields = buildAirtableMightyMemberFields({ mightyId: 123, email });
    expect(fields["Mighty Member ID"]).toBe(123);
    expect(fields).not.toHaveProperty("Primary Email");
  });

  it.each(["upsert", "patch"])("supports null email in the %s path", async (mode) => {
    process.env.AIRTABLE_PAT = "pat";
    process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID = "base";
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME = "Mighty Members";
    const { upsertAirtableMightyMember, patchAirtableMightyMemberFromPayload } = await import("../lib/airtableMightyMembers");
    const member = { mightyId: 123, email: null, firstName: "Member" };
    if (mode === "upsert") await upsertAirtableMightyMember(member);
    else await patchAirtableMightyMemberFromPayload("rec_known", member);
    const write = (global.fetch as jest.Mock).mock.calls.find(([, options]) => options.method === "POST" || options.method === "PATCH");
    expect(write).toBeDefined();
    const fields = JSON.parse(write[1].body).records[0].fields;
    expect(fields["Mighty Member ID"]).toBe(123);
    expect(fields).not.toHaveProperty("Primary Email");
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
      touchLastSyncDate: true,
      subscription: { isPaidActive: true, statuses: ["MemberPurchased"], updatedAt: new Date().toISOString() },
    });

    expect(r.skipped).toBe(false);
    expect(r.action).toBe("created");
    expect(r.recordId).toBe("rec_new");
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    const createBody = JSON.parse((global as any).fetch.mock.calls[1][1].body);
    expect(createBody.records[0].fields["Present in Mighty Networks"]).toBe(true);
    expect(createBody.records[0].fields["Needs Review"]).toBe(false);
  });

  it("patches a known record without a formula lookup", async () => {
    process.env.AIRTABLE_PAT = "pat";
    process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID = "base";
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME = "Mighty Members";

    const { patchAirtableMightyMemberFromPayload } = await import("../lib/airtableMightyMembers");
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [{ id: "rec_known", fields: {} }] }),
      text: async () => "",
      status: 200,
      statusText: "OK",
    });

    const r = await patchAirtableMightyMemberFromPayload("rec_known", {
      mightyId: 99,
      email: "known@example.com",
      touchLastSyncDate: true,
    });
    expect(r).toEqual({ skipped: false, action: "updated", recordId: "rec_known" });
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global as any).fetch.mock.calls[0][1].body);
    expect(body.records[0].id).toBe("rec_known");
    expect(body.records[0].fields["Present in Mighty Networks"]).toBe(true);
    expect(body.records[0].fields["Needs Review"]).toBe(false);
  });

  it("writes bio to Extended Bio by default", async () => {
    delete process.env.AIRTABLE_MIGHTY_BIO_FIELD;
    delete process.env.AIRTABLE_MIGHTY_BIO_ALSO_WRITE;
    expect(getAirtableMightyBioFieldName()).toBe("Extended Bio");

    process.env.AIRTABLE_PAT = "pat";
    process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID = "base";
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME = "Mighty Members";

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
        json: async () => ({ records: [{ id: "rec_bio", fields: {} }] }),
        text: async () => "",
        status: 200,
        statusText: "OK",
      });

    await upsertAirtableMightyMember({
      mightyId: 1,
      email: "a@b.com",
      bio: "Hello extended",
    });

    const createCall = (global as any).fetch.mock.calls[1];
    const body = JSON.parse(createCall[1].body as string);
    const fields = body.records[0].fields;
    expect(fields["Extended Bio"]).toBe("Hello extended");
    expect(fields["Short Bio"]).toBeUndefined();
  });

  it("writes bio to Extended Bio when AIRTABLE_MIGHTY_BIO_FIELD is set", async () => {
    process.env.AIRTABLE_MIGHTY_BIO_FIELD = "Extended Bio";
    process.env.AIRTABLE_PAT = "pat";
    process.env.AIRTABLE_MIGHTY_SYNC_BASE_ID = "base";
    process.env.AIRTABLE_MIGHTY_SYNC_TABLE_NAME = "Mighty Members";

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
        json: async () => ({ records: [{ id: "rec_bio2", fields: {} }] }),
        text: async () => "",
        status: 200,
        statusText: "OK",
      });

    await upsertAirtableMightyMember({ mightyId: 2, email: "b@b.com", bio: "New label" });

    const body = JSON.parse((global as any).fetch.mock.calls[1][1].body);
    expect(body.records[0].fields["Extended Bio"]).toBe("New label");
  });
});

