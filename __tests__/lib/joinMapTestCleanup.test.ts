import { deleteJoinMapTestMongoMember } from "@/lib/server/joinMapSignupServer";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";

const mockDeleteOne = jest.fn();

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue({
    db: { collection: jest.fn(() => ({ deleteOne: mockDeleteOne })) },
  }),
}));
jest.mock("@/lib/mightyCacheInvalidate", () => ({
  invalidateMightyMemberCaches: jest.fn().mockResolvedValue({ totalDeleted: 1 }),
}));

describe("deleteJoinMapTestMongoMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes only an exact Join Map test record", async () => {
    mockDeleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    await expect(
      deleteJoinMapTestMongoMember({
        email: " TEST@example.com ",
        firstName: "CURSOR-E2E-TEST",
        lastName: "DELETE-ME",
        mightyId: 123,
        airtableRecordId: "recTest",
      })
    ).resolves.toBe(true);

    expect(mockDeleteOne).toHaveBeenCalledWith({
      email: "test@example.com",
      firstName: "CURSOR-E2E-TEST",
      lastName: "DELETE-ME",
      mightyId: 123,
      source: "join_map",
      "airtable.recordId": "recTest",
    });
    expect(invalidateMightyMemberCaches).toHaveBeenCalled();
  });

  it("does not invalidate caches when no exact record matches", async () => {
    mockDeleteOne.mockResolvedValueOnce({ deletedCount: 0 });

    await expect(
      deleteJoinMapTestMongoMember({
        email: "test@example.com",
        firstName: "CURSOR-E2E-TEST",
        lastName: "DELETE-ME",
        mightyId: 123,
        airtableRecordId: "recTest",
      })
    ).resolves.toBe(false);

    expect(invalidateMightyMemberCaches).not.toHaveBeenCalled();
  });
});
