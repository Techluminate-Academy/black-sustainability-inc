/**
 * Comprehensive tests for `lib/mapViewerGating.js` — the shared gate that
 * decides whether to hide the viewer's own record on the map/list pages.
 *
 * Gating MUST be fail-closed: any ambiguous subscription state should
 * exclude the viewer from seeing themselves. The four list/map endpoints
 * (`getMarkers`, `getData`, `filterData`, `searchData`) all rely on this.
 */

const mockGetBsnSession = jest.fn();
const mockGetImpersonationMode = jest.fn();
const mockGetServerSession = jest.fn();

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: (...args: any[]) => mockGetBsnSession(...args),
}));

jest.mock("@/lib/impersonation", () => ({
  getImpersonationModeFromReq: (...args: any[]) => mockGetImpersonationMode(...args),
}));

jest.mock("next-auth/next", () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({ authOptions: {} }));

const importGating = async () => {
  jest.resetModules();
  return await import("@/lib/mapViewerGating");
};

const makeReq = (cookie = ""): any => ({ headers: { cookie } });

beforeEach(() => {
  mockGetBsnSession.mockReset();
  mockGetImpersonationMode.mockReset();
  mockGetServerSession.mockReset();

  // Sensible defaults: no bsn session, no impersonation, no nextauth session.
  // Tests override what they exercise.
  mockGetBsnSession.mockReturnValue(null);
  mockGetImpersonationMode.mockReturnValue(null);
  mockGetServerSession.mockResolvedValue(null);
});

describe("getViewerEmail — auth source priority", () => {
  it("uses bsn_session email when present (highest priority)", async () => {
    mockGetBsnSession.mockReturnValue({ email: "Bsn@Example.COM" });
    mockGetServerSession.mockResolvedValue({ user: { email: "ignored@x.com" } });

    const { getViewerEmail } = await importGating();
    const email = await getViewerEmail(makeReq());
    expect(email).toBe("bsn@example.com");
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it("trims and lowercases bsn_session email", async () => {
    mockGetBsnSession.mockReturnValue({ email: "  PAID@Foo.COM  " });
    const { getViewerEmail } = await importGating();
    expect(await getViewerEmail(makeReq())).toBe("paid@foo.com");
  });

  it("falls through to NextAuth session when bsn_session has no email", async () => {
    mockGetBsnSession.mockReturnValue({}); // empty session, no email
    mockGetServerSession.mockResolvedValue({ user: { email: "Auth@Example.com" } });

    const { getViewerEmail } = await importGating();
    expect(await getViewerEmail(makeReq())).toBe("auth@example.com");
  });

  it("falls through to NextAuth session when bsnSession throws (SESSION_SECRET missing)", async () => {
    mockGetBsnSession.mockImplementation(() => {
      throw new Error("SESSION_SECRET missing");
    });
    mockGetServerSession.mockResolvedValue({ user: { email: "auth@example.com" } });

    const { getViewerEmail } = await importGating();
    expect(await getViewerEmail(makeReq())).toBe("auth@example.com");
  });

  it("returns null when no auth source has an email (anonymous user)", async () => {
    const { getViewerEmail } = await importGating();
    expect(await getViewerEmail(makeReq())).toBeNull();
  });

  it("treats NextAuth session errors as 'no session' rather than crashing the request", async () => {
    mockGetServerSession.mockRejectedValue(new Error("network blip"));
    const { getViewerEmail } = await importGating();
    expect(await getViewerEmail(makeReq())).toBeNull();
  });

  it("falls back to legacy bsn_user_data cookie when nothing else has an email", async () => {
    const cookieValue = encodeURIComponent(
      JSON.stringify({ email: "Legacy@Example.com" })
    );
    const { getViewerEmail } = await importGating();
    const email = await getViewerEmail(makeReq(`bsn_user_data=${cookieValue}`));
    expect(email).toBe("legacy@example.com");
  });

  it("prefers loginEmail over email in bsn_user_data (login-as semantics)", async () => {
    const cookieValue = encodeURIComponent(
      JSON.stringify({ loginEmail: "Persona@Example.com", email: "real@example.com" })
    );
    const { getViewerEmail } = await importGating();
    expect(await getViewerEmail(makeReq(`bsn_user_data=${cookieValue}`))).toBe(
      "persona@example.com"
    );
  });

  it("returns null on malformed bsn_user_data cookie JSON (does not throw)", async () => {
    const { getViewerEmail } = await importGating();
    expect(
      await getViewerEmail(makeReq("bsn_user_data=%7Bnot-json%7D"))
    ).toBeNull();
  });

  it("returns null when bsn_user_data has no usable email field", async () => {
    const cookieValue = encodeURIComponent(JSON.stringify({ name: "no email" }));
    const { getViewerEmail } = await importGating();
    expect(await getViewerEmail(makeReq(`bsn_user_data=${cookieValue}`))).toBeNull();
  });

  it("uses dev-only login-as cookie ahead of NextAuth in development", async () => {
    const prev = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = "development";
    try {
      const cookieValue = encodeURIComponent(
        JSON.stringify({ loginEmail: "DevPersona@Example.com" })
      );
      mockGetServerSession.mockResolvedValue({
        user: { email: "real-session@example.com" },
      });
      const { getViewerEmail } = await importGating();
      expect(
        await getViewerEmail(makeReq(`bsn_user_data=${cookieValue}`))
      ).toBe("devpersona@example.com");
      // dev shortcut should bypass NextAuth read entirely
      expect(mockGetServerSession).not.toHaveBeenCalled();
    } finally {
      (process.env as any).NODE_ENV = prev;
    }
  });

  it("does NOT use the dev shortcut in production (security)", async () => {
    const prev = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = "production";
    try {
      const cookieValue = encodeURIComponent(
        JSON.stringify({ loginEmail: "AttackerPersona@Example.com" })
      );
      mockGetServerSession.mockResolvedValue({
        user: { email: "real-session@example.com" },
      });
      const { getViewerEmail } = await importGating();
      // Should fall through to NextAuth, NOT use the cookie persona
      expect(
        await getViewerEmail(makeReq(`bsn_user_data=${cookieValue}`))
      ).toBe("real-session@example.com");
    } finally {
      (process.env as any).NODE_ENV = prev;
    }
  });
});

describe("getExcludeViewerMighty — fail-closed self-visibility gate", () => {
  it("returns no exclusion for an anonymous (logged-out) viewer", async () => {
    const findOne = jest.fn();
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: null, excludeMightyId: null });
    expect(findOne).not.toHaveBeenCalled();
  });

  it("returns no exclusion when viewer's email is not in mightyMembers", async () => {
    mockGetBsnSession.mockReturnValue({ email: "ghost@example.com" });
    const findOne = jest.fn().mockResolvedValue(null);
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: null, excludeMightyId: null });
  });

  it("does not exclude paid-active viewers", async () => {
    mockGetBsnSession.mockReturnValue({ email: "paid@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: 1,
      subscription: { isPaidActive: true },
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: null, excludeMightyId: null });
  });

  it("EXCLUDES viewer when isPaidActive is false", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: 7,
      subscription: { isPaidActive: false },
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: "oid", excludeMightyId: 7 });
  });

  it("EXCLUDES viewer when isPaidActive is missing entirely (fail-closed)", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: 7,
      subscription: {}, // no isPaidActive key at all
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out.excludeMongoId).toBe("oid");
  });

  it("EXCLUDES viewer when subscription object is entirely missing (fail-closed)", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    const findOne = jest.fn().mockResolvedValue({ _id: "oid", mightyId: 7 });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out.excludeMongoId).toBe("oid");
  });

  it("EXCLUDES viewer when isPaidActive is the string 'true' (only strict boolean true opens gate)", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: 7,
      subscription: { isPaidActive: "true" }, // string, not boolean
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out.excludeMongoId).toBe("oid");
  });

  it("EXCLUDES viewer when isPaidActive is the number 1 (only strict boolean true opens gate)", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: 7,
      subscription: { isPaidActive: 1 },
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out.excludeMongoId).toBe("oid");
  });

  it("returns mightyId=null when mightyId is non-numeric, but still excludes by _id", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: "not-a-number" as any,
      subscription: { isPaidActive: false },
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: "oid", excludeMightyId: null });
  });

  it("returns _id=null when _id is missing, but still excludes by mightyId", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      _id: null,
      mightyId: 42,
      subscription: { isPaidActive: false },
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: null, excludeMightyId: 42 });
  });

  it("looks up viewer by case-insensitive anchored email regex", async () => {
    mockGetBsnSession.mockReturnValue({ email: "Free@Example.COM" });
    const findOne = jest.fn().mockResolvedValue(null);
    const { getExcludeViewerMighty } = await importGating();
    await getExcludeViewerMighty(makeReq(), { findOne } as any);

    expect(findOne).toHaveBeenCalledTimes(1);
    const [filter, options] = findOne.mock.calls[0];
    const re: RegExp = filter.email.$regex;
    expect(re).toBeInstanceOf(RegExp);
    expect(re.flags).toContain("i");
    expect(re.source).toBe("^free@example\\.com$");
    expect(options?.projection).toMatchObject({
      _id: 1,
      mightyId: 1,
      subscription: 1,
    });
  });

  it("escapes regex metacharacters in viewer emails (defense-in-depth)", async () => {
    mockGetBsnSession.mockReturnValue({ email: "a.b+c$d@example.com" });
    const findOne = jest.fn().mockResolvedValue(null);
    const { getExcludeViewerMighty } = await importGating();
    await getExcludeViewerMighty(makeReq(), { findOne } as any);

    const re: RegExp = findOne.mock.calls[0][0].email.$regex;
    expect(re.source).toBe("^a\\.b\\+c\\$d@example\\.com$");
  });
});

describe("getExcludeViewerMighty — impersonation override", () => {
  it("'paid' impersonation short-circuits exclusion regardless of real subscription", async () => {
    mockGetBsnSession.mockReturnValue({ email: "tester@example.com" });
    mockGetImpersonationMode.mockReturnValue("paid");
    const findOne = jest.fn(); // should never be called
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: null, excludeMightyId: null });
    expect(findOne).not.toHaveBeenCalled();
  });

  it("'unpaid' impersonation does NOT short-circuit — real DB lookup still runs", async () => {
    mockGetBsnSession.mockReturnValue({ email: "tester@example.com" });
    mockGetImpersonationMode.mockReturnValue("unpaid");
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: 7,
      subscription: { isPaidActive: true }, // would normally allow self-view
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    // 'unpaid' impersonation only matters at the cookie level for OTHER gates;
    // here, the real subscription is still queried, and only paid:true opens the gate
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ excludeMongoId: null, excludeMightyId: null });
  });

  it("null impersonation falls through to normal logic", async () => {
    mockGetBsnSession.mockReturnValue({ email: "free@example.com" });
    mockGetImpersonationMode.mockReturnValue(null);
    const findOne = jest.fn().mockResolvedValue({
      _id: "oid",
      mightyId: 7,
      subscription: { isPaidActive: false },
    });
    const { getExcludeViewerMighty } = await importGating();
    const out = await getExcludeViewerMighty(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeMongoId: "oid", excludeMightyId: 7 });
  });
});

describe("getExcludeViewerId — legacy Airtable variant", () => {
  it("returns null exclusion when viewer is anonymous", async () => {
    const findOne = jest.fn();
    const { getExcludeViewerId } = await importGating();
    const out = await getExcludeViewerId(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeViewerId: null });
    expect(findOne).not.toHaveBeenCalled();
  });

  it("returns null exclusion when no Airtable record matches", async () => {
    mockGetBsnSession.mockReturnValue({ email: "ghost@example.com" });
    const findOne = jest.fn().mockResolvedValue(null);
    const { getExcludeViewerId } = await importGating();
    expect(await getExcludeViewerId(makeReq(), { findOne } as any)).toEqual({
      excludeViewerId: null,
    });
  });

  it.each([
    ["true", true],
    ["True", true],
    [true, true],
    [1, true],
    ["false", false],
    ["TRUE", false], // ALL-CAPS isn't accepted by isPaying — only "true"/"True"
    ["yes", false],
    [0, false],
    [null, false],
    [undefined, false],
  ])(
    "isPaying treats %p as %p (governs whether legacy paying members see themselves)",
    async (input, expectedPaying) => {
      mockGetBsnSession.mockReturnValue({ email: "viewer@example.com" });
      const findOne = jest.fn().mockResolvedValue({
        id: "rec-airtable-1",
        airtableId: "rec-airtable-1",
        fields: { "Paying Member (keep current)": input },
      });
      const { getExcludeViewerId } = await importGating();
      const out = await getExcludeViewerId(makeReq(), { findOne } as any);
      if (expectedPaying) {
        expect(out).toEqual({ excludeViewerId: null });
      } else {
        expect(out).toEqual({ excludeViewerId: "rec-airtable-1" });
      }
    }
  );

  it("falls back to airtableId if id is missing", async () => {
    mockGetBsnSession.mockReturnValue({ email: "viewer@example.com" });
    const findOne = jest.fn().mockResolvedValue({
      id: undefined,
      airtableId: "rec-fallback",
      fields: { "Paying Member (keep current)": false },
    });
    const { getExcludeViewerId } = await importGating();
    const out = await getExcludeViewerId(makeReq(), { findOne } as any);
    expect(out).toEqual({ excludeViewerId: "rec-fallback" });
  });

  it("looks up by EMAIL ADDRESS field with case-insensitive anchored regex", async () => {
    mockGetBsnSession.mockReturnValue({ email: "Viewer@Example.com" });
    const findOne = jest.fn().mockResolvedValue(null);
    const { getExcludeViewerId } = await importGating();
    await getExcludeViewerId(makeReq(), { findOne } as any);

    const [filter, options] = findOne.mock.calls[0];
    const re: RegExp = filter["fields.EMAIL ADDRESS"].$regex;
    expect(re.source).toBe("^viewer@example\\.com$");
    expect(re.flags).toContain("i");
    expect(options?.projection).toMatchObject({
      id: 1,
      airtableId: 1,
      "fields.Paying Member (keep current)": 1,
    });
  });
});
