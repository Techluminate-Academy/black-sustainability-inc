import {
  ensureSupportTicketCollections,
  resetSupportTicketCollectionEnsureForTests,
} from "@/lib/domain/support/ensureSupportTicketCollections";
import { SUPPORT_TICKETS_COLLECTION } from "@/lib/mapSupportConfig";

const mockCreateCollection = jest.fn();
const mockCreateIndex = jest.fn();
const mockListCollectionsToArray = jest.fn();

jest.mock("@/lib/integrations/mongodb", () => ({
  connectToDatabase: jest.fn(async () => ({
    db: {
      listCollections: () => ({
        toArray: mockListCollectionsToArray,
      }),
      createCollection: mockCreateCollection,
      collection: () => ({
        createIndex: mockCreateIndex,
      }),
    },
  })),
}));

describe("ensureSupportTicketCollections", () => {
  beforeEach(() => {
    resetSupportTicketCollectionEnsureForTests();
    jest.clearAllMocks();
    mockCreateIndex.mockResolvedValue(undefined);
  });

  it("creates the supportTickets collection when missing", async () => {
    mockListCollectionsToArray.mockResolvedValue([]);

    await ensureSupportTicketCollections();

    expect(mockListCollectionsToArray).toHaveBeenCalled();
    expect(mockCreateCollection).toHaveBeenCalledWith(SUPPORT_TICKETS_COLLECTION);
    expect(mockCreateIndex).toHaveBeenCalledTimes(4);
  });

  it("skips createCollection when supportTickets already exists", async () => {
    mockListCollectionsToArray.mockResolvedValue([{ name: SUPPORT_TICKETS_COLLECTION }]);

    await ensureSupportTicketCollections();

    expect(mockCreateCollection).not.toHaveBeenCalled();
    expect(mockCreateIndex).toHaveBeenCalledTimes(4);
  });

  it("runs ensure only once per process (cached)", async () => {
    mockListCollectionsToArray.mockResolvedValue([]);

    await ensureSupportTicketCollections();
    await ensureSupportTicketCollections();

    expect(mockListCollectionsToArray).toHaveBeenCalledTimes(1);
  });
});
