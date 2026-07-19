const mockAxiosGet = jest.fn();
const mockConnect = jest.fn();
const mockClose = jest.fn(async () => {});

jest.mock("axios", () => ({ get: (...args) => mockAxiosGet(...args) }));
jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: (...args) => mockConnect(...args),
    close: (...args) => mockClose(...args),
  })),
}));

describe("scheduled Airtable to Mongo synchronization", () => {
  beforeEach(() => {
    jest.resetModules();
    mockAxiosGet.mockReset();
    mockConnect.mockReset();
    mockClose.mockClear();
  });

  test("rejects instead of reporting success when Mongo cannot connect", async () => {
    mockAxiosGet.mockResolvedValue({
      data: { records: [{ id: "rec1234567890", fields: { "Mighty Member ID": 123 } }] },
    });
    mockConnect.mockRejectedValue(new Error("Atlas unavailable"));

    const { syncAirtableToMongoDB } = require("../utils/sync-airtable.js");
    await expect(syncAirtableToMongoDB()).rejects.toThrow("Atlas unavailable");
  });

  test("rejects a partial Airtable pagination failure", async () => {
    mockAxiosGet
      .mockResolvedValueOnce({
        data: {
          records: [{ id: "rec1234567890", fields: { "Mighty Member ID": 123 } }],
          offset: "next-page",
        },
      })
      .mockRejectedValueOnce(new Error("Airtable unavailable"));

    const { getAllRecordsFromAirtable } = require("../utils/sync-airtable.js");
    await expect(getAllRecordsFromAirtable()).rejects.toThrow(
      "Airtable Mighty Members fetch failed before pagination completed"
    );
  });

  test("supports explicit cache skipping for the composed pipeline", () => {
    const { parseSyncCliArgs } = require("../utils/sync-airtable.js");
    expect(parseSyncCliArgs(["--skip-mighty", "--skip-cache"])).toMatchObject({
      skipMighty: true,
      skipCache: true,
    });
  });
});
