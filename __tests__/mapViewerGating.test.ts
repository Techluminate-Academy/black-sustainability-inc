jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: () => ({ email: "paid@example.com" }),
}));

jest.mock("@/lib/impersonation", () => ({
  getImpersonationModeFromReq: jest.fn(() => null),
}));

jest.mock("next-auth/next", () => ({
  getServerSession: async () => null,
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

describe("mapViewerGating self-visibility", () => {
  it("excludes self when not paid (fail-closed)", async () => {
    const { getExcludeViewerMighty } = await import("@/lib/mapViewerGating");
    const collection = {
      findOne: async () => ({ _id: "oid1", mightyId: 1, subscription: { isPaidActive: false } }),
    };
    const req: any = { headers: { cookie: "" } };

    const out = await getExcludeViewerMighty(req, collection as any);
    expect(out.excludeMongoId).toBe("oid1");
    expect(out.excludeMightyId).toBe(1);
  });

  it("does not exclude self when paid", async () => {
    const { getExcludeViewerMighty } = await import("@/lib/mapViewerGating");
    const collection = {
      findOne: async () => ({ _id: "oid1", mightyId: 1, subscription: { isPaidActive: true } }),
    };
    const req: any = { headers: { cookie: "" } };

    const out = await getExcludeViewerMighty(req, collection as any);
    expect(out.excludeMongoId).toBeNull();
    expect(out.excludeMightyId).toBeNull();
  });

  it("does not exclude self when impersonating paid", async () => {
    const { getImpersonationModeFromReq } = await import("@/lib/impersonation");
    (getImpersonationModeFromReq as any).mockImplementationOnce(() => "paid");

    const { getExcludeViewerMighty } = await import("@/lib/mapViewerGating");
    const collection = {
      findOne: async () => ({ _id: "oid1", mightyId: 1, subscription: { isPaidActive: false } }),
    };
    const req: any = { headers: { cookie: "" } };

    const out = await getExcludeViewerMighty(req, collection as any);
    expect(out.excludeMongoId).toBeNull();
    expect(out.excludeMightyId).toBeNull();
  });
});

