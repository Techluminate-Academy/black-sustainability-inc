import { getAdminJwtSecret } from "@/lib/adminJwtSecret";

describe("getAdminJwtSecret", () => {
  const original = process.env.JWT_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it("returns trimmed secret when set", () => {
    process.env.JWT_SECRET = "  my-secret  ";
    expect(getAdminJwtSecret()).toBe("my-secret");
  });

  it("throws when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    expect(() => getAdminJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it("throws when JWT_SECRET is blank", () => {
    process.env.JWT_SECRET = "   ";
    expect(() => getAdminJwtSecret()).toThrow(/JWT_SECRET/);
  });
});
