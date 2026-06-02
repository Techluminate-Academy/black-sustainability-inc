import {
  ensureMightyMemberAccess,
  MightyMemberAccessError,
} from "@/lib/domain/members/ensureMightyMemberAccess.service";

const mockByEmail = jest.fn();
const mockFetchById = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/lib/mightyAdmin", () => ({
  mightyGetMemberByEmail: (...args: unknown[]) => mockByEmail(...args),
  fetchMightyMemberById: (...args: unknown[]) => mockFetchById(...args),
  createMightyMember: (...args: unknown[]) => mockCreate(...args),
}));

describe("ensureMightyMemberAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchById.mockResolvedValue({ id: 99, email: "jane@example.com" });
  });

  it("returns email lookup id when it differs from session", async () => {
    mockByEmail.mockResolvedValueOnce({ id: 200, email: "jane@example.com" });

    const result = await ensureMightyMemberAccess({
      email: "jane@example.com",
      mightyId: 99,
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result).toEqual({ mightyId: 200, repaired: true });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("re-provisions when email and id lookups both fail", async () => {
    mockByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 38964271, email: "kelyce@example.com" });
    mockFetchById.mockRejectedValueOnce(new Error("404"));
    mockCreate.mockResolvedValueOnce({
      ok: true,
      id: 38964271,
      email: "kelyce@example.com",
    });

    const result = await ensureMightyMemberAccess({
      email: "kelyce@example.com",
      mightyId: 38964271,
      firstName: "Kelyce",
      lastName: "Allen",
    });

    expect(result.mightyId).toBe(38964271);
    expect(result.repaired).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "kelyce@example.com",
        send_welcome_email: false,
      })
    );
  });

  it("throws when member cannot be resolved", async () => {
    mockByEmail.mockResolvedValue(null);
    mockFetchById.mockRejectedValue(new Error("404"));
    mockCreate.mockResolvedValue({ ok: false, status: 500, error: "fail" });

    await expect(
      ensureMightyMemberAccess({
        email: "missing@example.com",
        mightyId: 1,
        firstName: "A",
        lastName: "B",
      })
    ).rejects.toBeInstanceOf(MightyMemberAccessError);
  });
});
