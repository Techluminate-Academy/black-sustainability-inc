import { getMemberMapProfileView } from "@/lib/domain/members/memberMapProfileView.service";

const mockUpdateOne = jest.fn(async () => ({ matchedCount: 1 }));
const mockFindOne = jest.fn(async () => ({
  firstName: "Jerry",
  lastName: "Bony",
  email: "jerry@example.com",
  bio: "stale mongo bio",
  organizationName: null,
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
    organizationName: "Acme",
  })),
}));

describe("getMemberMapProfileView", () => {
  const session = { email: "jerry@example.com", mightyId: 99, firstName: "Jerry", lastName: "Bony" };

  beforeEach(() => {
    jest.clearAllMocks();
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
