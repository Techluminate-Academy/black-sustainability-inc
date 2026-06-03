import { getMemberMapProfileView } from "@/lib/domain/members/memberMapProfileView.service";

const mockUpdateOne = jest.fn(async () => ({ matchedCount: 1 }));
const mockFindOne = jest.fn(async () => ({
  firstName: "Jerry",
  lastName: "Bony",
  email: "jerry@example.com",
  fields: { BIO: "bio from airtable-shaped mongo fields" },
  organizationName: null,
}));

const mockAirtableLookup = jest.fn(async () => null);
jest.mock("@/lib/airtableMightyMembers", () => ({
  findAirtableMightyMemberByEmail: (...args: unknown[]) => mockAirtableLookup(...args),
}));

jest.mock("@/lib/domain/members/memberSessionProfile.service", () => ({
  buildSessionMemberProfile: jest.fn(async () => ({
    email: "jerry@example.com",
    mightyId: 99,
    firstName: "Jerry",
    lastName: "Bony",
    avatarUrl: "",
  })),
}));

jest.mock("@/lib/domain/members/memberMightyCustomFields", () => ({
  fetchMightyProfileCustomFields: jest.fn(async () => ({
    bio: "from mighty custom field",
    bioLoaded: true,
    organizationName: "Acme",
    organizationLoaded: true,
  })),
}));

jest.mock("@/lib/mightyAdmin", () => ({
  fetchMightyMemberById: jest.fn(async () => ({
    bio: "from mighty mini bio",
    avatar_url: "https://cdn.example/new-avatar.jpg",
  })),
}));

describe("getMemberMapProfileView", () => {
  const session = { email: "jerry@example.com", mightyId: 99, firstName: "Jerry", lastName: "Bony" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads bio from nested fields.BIO when top-level bio is missing", async () => {
    const db = {
      collection: () => ({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
      }),
    } as unknown as import("mongodb").Db;

    const { fetchMightyProfileCustomFields } = await import(
      "@/lib/domain/members/memberMightyCustomFields"
    );
    (fetchMightyProfileCustomFields as jest.Mock).mockResolvedValueOnce({
      bio: null,
      bioLoaded: false,
      organizationName: null,
      organizationLoaded: false,
    });

    const { fetchMightyMemberById } = await import("@/lib/mightyAdmin");
    (fetchMightyMemberById as jest.Mock).mockResolvedValueOnce({ bio: "", avatar_url: "" });

    const view = await getMemberMapProfileView(db, session);
    expect(view.bio).toBe("bio from airtable-shaped mongo fields");
  });

  it("prefers cleared Mighty Extended Bio over stale Mongo", async () => {
    const db = {
      collection: () => ({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
      }),
    } as unknown as import("mongodb").Db;

    const { fetchMightyProfileCustomFields } = await import(
      "@/lib/domain/members/memberMightyCustomFields"
    );
    (fetchMightyProfileCustomFields as jest.Mock).mockResolvedValueOnce({
      bio: null,
      bioLoaded: true,
      organizationName: null,
      organizationLoaded: false,
    });

    const view = await getMemberMapProfileView(db, session);
    expect(view.bio).toBeNull();
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ bio: null }),
      })
    );
  });

  it("uses Mighty Mini Bio when Extended Bio custom field is unset", async () => {
    const db = {
      collection: () => ({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
      }),
    } as unknown as import("mongodb").Db;

    const { fetchMightyProfileCustomFields } = await import(
      "@/lib/domain/members/memberMightyCustomFields"
    );
    (fetchMightyProfileCustomFields as jest.Mock).mockResolvedValueOnce({
      bio: null,
      bioLoaded: false,
      organizationName: null,
      organizationLoaded: false,
    });

    const view = await getMemberMapProfileView(db, session);
    expect(view.bio).toBe("from mighty mini bio");
    expect(view.photoUrl).toBe("https://cdn.example/new-avatar.jpg");
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ bio: "from mighty mini bio" }),
      })
    );
  });

  it("prefers Mighty custom field bio over stale Mongo", async () => {
    const db = {
      collection: () => ({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
      }),
    } as unknown as import("mongodb").Db;

    const view = await getMemberMapProfileView(db, session);
    expect(view.bio).toBe("from mighty custom field");
    expect(view.organizationName).toBe("Acme");
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ bio: "from mighty custom field" }),
      })
    );
  });
});
