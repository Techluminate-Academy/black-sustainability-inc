import {
  canAccessTesterTools,
  DEFAULT_QA_TESTER_EMAILS,
  getQaTesterEmailAllowlist,
} from "@/lib/qaTesterAllowlist";

describe("qaTesterAllowlist", () => {
  const orig = process.env.BSN_IMPERSONATE_ALLOWLIST;

  afterEach(() => {
    if (orig === undefined) delete process.env.BSN_IMPERSONATE_ALLOWLIST;
    else process.env.BSN_IMPERSONATE_ALLOWLIST = orig;
  });

  it("includes built-in QA testers when env allowlist is unset", () => {
    delete process.env.BSN_IMPERSONATE_ALLOWLIST;
    for (const email of DEFAULT_QA_TESTER_EMAILS) {
      expect(canAccessTesterTools(email)).toBe(true);
      expect(canAccessTesterTools(email.toUpperCase())).toBe(true);
    }
  });

  it("denies non-tester emails", () => {
    delete process.env.BSN_IMPERSONATE_ALLOWLIST;
    expect(canAccessTesterTools("stranger@example.com")).toBe(false);
    expect(canAccessTesterTools(null)).toBe(false);
    expect(canAccessTesterTools("")).toBe(false);
  });

  it("merges BSN_IMPERSONATE_ALLOWLIST with built-in testers", () => {
    process.env.BSN_IMPERSONATE_ALLOWLIST = "Extra.QA@Example.com";
    const allow = getQaTesterEmailAllowlist();
    expect(allow.has("jerry@techluminateacademy.com")).toBe(true);
    expect(allow.has("kelyce@blacksustainability.org")).toBe(true);
    expect(allow.has("alexis.vidot@gmail.com")).toBe(true);
    expect(allow.has("research@blacksustainability.org")).toBe(true);
    expect(allow.has("extra.qa@example.com")).toBe(true);
    expect(canAccessTesterTools("extra.qa@example.com")).toBe(true);
  });
});
