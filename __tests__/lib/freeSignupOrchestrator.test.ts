import {
  createFreeSignupRecord,
  deleteFreeSignupRecord,
} from "@/lib/server/airtableFreeSignupServer";
import { upsertJoinMapMongoMember } from "@/lib/server/joinMapSignupServer";
import { createMightyMember } from "@/lib/mightyAdmin";
import {
  createFreeSignupAcrossPlatforms,
  FreeSignupDuplicateEmailError,
} from "@/lib/server/freeSignupOrchestrator";

jest.mock("@/lib/server/airtableFreeSignupServer", () => ({
  createFreeSignupRecord: jest.fn(),
  deleteFreeSignupRecord: jest.fn(),
}));
jest.mock("@/lib/server/joinMapSignupServer", () => ({
  upsertJoinMapMongoMember: jest.fn(),
}));
jest.mock("@/lib/server/joinMapSignupLock", () => ({
  beginJoinMapSignup: jest.fn().mockResolvedValue(true),
  endJoinMapSignup: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/mightyAdmin", () => ({
  createMightyMember: jest.fn(),
}));

const fields = {
  "FIRST NAME": "Amina",
  "LAST NAME": "Jones",
  "EMAIL ADDRESS": " AMINA@EXAMPLE.COM ",
  "Membership Status Notes": "Free",
};

describe("createFreeSignupAcrossPlatforms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createMightyMember as jest.Mock).mockResolvedValue({
      ok: true,
      id: 12345,
      email: "amina@example.com",
    });
    (createFreeSignupRecord as jest.Mock).mockResolvedValue({ id: "recTest123" });
    (upsertJoinMapMongoMember as jest.Mock).mockResolvedValue(undefined);
    (deleteFreeSignupRecord as jest.Mock).mockResolvedValue(undefined);
  });

  it("provisions Mighty with its welcome email, then Airtable and Mongo", async () => {
    await expect(createFreeSignupAcrossPlatforms(fields)).resolves.toEqual({
      airtableRecordId: "recTest123",
      mightyId: 12345,
    });

    expect(createMightyMember).toHaveBeenCalledWith({
      email: "amina@example.com",
      first_name: "Amina",
      last_name: "Jones",
      send_welcome_email: true,
    });
    expect(createFreeSignupRecord).toHaveBeenCalledWith(fields, 12345);
    expect(upsertJoinMapMongoMember).toHaveBeenCalledWith(
      fields,
      "recTest123",
      12345
    );
  });

  it("does not write Airtable or Mongo when Mighty provisioning fails", async () => {
    (createMightyMember as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      error: "unavailable",
    });

    await expect(createFreeSignupAcrossPlatforms(fields)).rejects.toThrow(
      "Mighty member provisioning failed (503)."
    );
    expect(createFreeSignupRecord).not.toHaveBeenCalled();
    expect(upsertJoinMapMongoMember).not.toHaveBeenCalled();
  });

  it("does not write Airtable or Mongo when the email already belongs to a Mighty member", async () => {
    (createMightyMember as jest.Mock).mockResolvedValue({
      ok: true,
      id: 12345,
      email: "amina@example.com",
      alreadyExisted: true,
    });

    await expect(createFreeSignupAcrossPlatforms(fields)).rejects.toBeInstanceOf(
      FreeSignupDuplicateEmailError
    );
    expect(createFreeSignupRecord).not.toHaveBeenCalled();
    expect(upsertJoinMapMongoMember).not.toHaveBeenCalled();
  });

  it("rolls back Airtable when Mongo fails", async () => {
    (upsertJoinMapMongoMember as jest.Mock).mockRejectedValue(
      new Error("Mongo unavailable")
    );

    await expect(createFreeSignupAcrossPlatforms(fields)).rejects.toThrow(
      "Mongo unavailable"
    );
    expect(deleteFreeSignupRecord).toHaveBeenCalledWith("recTest123");
  });
});
