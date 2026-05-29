import {
  getGmailTransport,
  gmailFromHeader,
  isGmailConfigured,
} from "@/lib/notifications/gmailTransport";

describe("gmailTransport", () => {
  const originalUser = process.env.EMAIL_USER;
  const originalPass = process.env.EMAIL_PASSWORD;

  afterEach(() => {
    if (originalUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = originalUser;
    if (originalPass === undefined) delete process.env.EMAIL_PASSWORD;
    else process.env.EMAIL_PASSWORD = originalPass;
  });

  it("is configured when EMAIL_USER and EMAIL_PASSWORD are set", () => {
    process.env.EMAIL_USER = "jerry@techluminateacademy.com";
    process.env.EMAIL_PASSWORD = "app-password-here";
    expect(isGmailConfigured()).toBe(true);
    expect(getGmailTransport()?.authUser).toBe("jerry@techluminateacademy.com");
  });

  it("returns null when EMAIL_PASSWORD is missing", () => {
    process.env.EMAIL_USER = "jerry@techluminateacademy.com";
    delete process.env.EMAIL_PASSWORD;
    expect(isGmailConfigured()).toBe(false);
    expect(getGmailTransport()).toBeNull();
  });

  it("builds From header from EMAIL_USER", () => {
    process.env.EMAIL_USER = "jerry@techluminateacademy.com";
    expect(gmailFromHeader("Black Sustainability Member Map")).toBe(
      '"Black Sustainability Member Map" <jerry@techluminateacademy.com>'
    );
  });
});
