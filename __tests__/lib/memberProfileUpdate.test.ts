import {
  MemberProfileUpdateError,
  updateMemberProfileFromSession,
} from "@/lib/domain/members/memberProfileUpdate.service";

const mockUpdateOne = jest.fn(async () => ({ matchedCount: 1 }));
const mockGetProfile = jest.fn(async () => ({
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  photoUrl: "",
  location: null,
  organizationName: null,
  bio: "Hello",
  memberLevelLabel: null,
}));

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: async () => ({
    db: { collection: () => ({ updateOne: mockUpdateOne }) },
  }),
}));

const mockPatch = jest.fn();
const mockFetchMember = jest.fn();
const mockCustomField = jest.fn(async () => ({ ok: true }));
jest.mock("@/lib/mightyAdmin", () => ({
  patchMightyMemberProfile: (...args: unknown[]) => mockPatch(...args),
  fetchMightyMemberById: (...args: unknown[]) => mockFetchMember(...args),
  upsertMightyCustomFieldAnswer: (...args: unknown[]) => mockCustomField(...args),
}));

const mockEnsureAccess = jest.fn(async () => ({ mightyId: 99, repaired: false }));
jest.mock("@/lib/domain/members/ensureMightyMemberAccess.service", () => ({
  MightyMemberAccessError: class MightyMemberAccessError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 502) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  ensureMightyMemberAccess: (...args: unknown[]) => mockEnsureAccess(...args),
}));

const mockAirtable = jest.fn(async () => ({ skipped: false }));
jest.mock("@/lib/airtableMightyMembers", () => ({
  upsertAirtableMightyMember: (...args: unknown[]) => mockAirtable(...args),
}));

jest.mock("@/lib/mightyCacheInvalidate", () => ({
  invalidateMightyMemberCaches: jest.fn(async () => ({})),
}));

jest.mock("@/lib/domain/members/memberMapProfileView.service", () => ({
  getMemberMapProfileView: (...args: unknown[]) => mockGetProfile(...args),
}));

const session = { mightyId: 99, email: "jane@example.com", firstName: "J", lastName: "D" };

describe("updateMemberProfileFromSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureAccess.mockResolvedValue({ mightyId: 99, repaired: false });
    mockPatch.mockResolvedValue({
      ok: true,
      member: {
        email: "jane@example.com",
        first_name: "Jane",
        last_name: "Doe",
        bio: "Hello",
        avatar_url: "https://cdn.mn.co/a.jpg",
      },
    });
  });

  it("rejects empty first name", async () => {
    const db = { collection: () => ({ updateOne: mockUpdateOne }) } as any;
    await expect(
      updateMemberProfileFromSession(db, session, { firstName: "  ", lastName: "Doe" })
    ).rejects.toBeInstanceOf(MemberProfileUpdateError);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("updates Mighty first then Mongo and Airtable", async () => {
    const db = { collection: () => ({ updateOne: mockUpdateOne }) } as any;
    const { profile, mightyId } = await updateMemberProfileFromSession(db, session, {
      firstName: "Jane",
      lastName: "Doe",
      bio: "Hello",
      organizationName: "Tech Co",
    });

    expect(mightyId).toBe(99);
    expect(mockEnsureAccess).toHaveBeenCalled();
    expect(mockPatch).toHaveBeenCalledWith({
      mightyMemberId: 99,
      patch: { first_name: "Jane", last_name: "Doe" },
    });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { $or: [{ mightyId: 99 }, { email: session.email }] },
      expect.objectContaining({
        $set: expect.objectContaining({
          firstName: "Jane",
          lastName: "Doe",
          bio: "Hello",
          organizationName: "Tech Co",
          avatarUrl: "https://cdn.mn.co/a.jpg",
          source: "member:profile-update",
        }),
      }),
      { upsert: true }
    );
    expect(mockAirtable).toHaveBeenCalledWith(
      expect.objectContaining({
        mightyId: 99,
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        bio: "Hello",
        organizationName: "Tech Co",
      })
    );
    expect(profile.firstName).toBe("Jane");
  });

  it("sanitizes raw Mighty not-found errors", async () => {
    const rawError = JSON.stringify({
      error: 'Couldn\'t find User with \'id\'="38964271" [WHERE "users"."deleted_at" IS NULL]',
    });
    mockPatch.mockResolvedValue({ ok: false, status: 404, message: rawError });
    const db = { collection: () => ({ updateOne: mockUpdateOne }) } as any;
    await expect(
      updateMemberProfileFromSession(db, session, {
        firstName: "Jane",
        lastName: "Doe",
      })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/sign out and sign back in/i),
    });
  });

  it("throws when Mighty patch fails", async () => {
    mockPatch.mockResolvedValueOnce({ ok: false, status: 422, message: "Invalid" });
    const db = { collection: () => ({ updateOne: mockUpdateOne }) } as any;
    await expect(
      updateMemberProfileFromSession(db, session, {
        firstName: "Jane",
        lastName: "Doe",
      })
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});
