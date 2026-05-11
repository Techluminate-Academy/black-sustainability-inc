import {
  FREE_SIGNUP_PUBLIC_WRITABLE_FIELD_NAMES,
  pickPublicWritableFreeSignupFields,
} from "@/lib/server/airtableFreeSignupServer";

describe("pickPublicWritableFreeSignupFields", () => {
  it("keeps only allowlisted Airtable field names", () => {
    const picked = pickPublicWritableFreeSignupFields({
      "FIRST NAME": "A",
      "Evil Admin Field": "pwned",
      BIO: "x",
    });
    expect(picked).toEqual({ "FIRST NAME": "A", BIO: "x" });
    expect(FREE_SIGNUP_PUBLIC_WRITABLE_FIELD_NAMES.has("Evil Admin Field")).toBe(false);
  });

  it("returns empty object when nothing is allowlisted", () => {
    expect(pickPublicWritableFreeSignupFields({ admin: true })).toEqual({});
  });
});
