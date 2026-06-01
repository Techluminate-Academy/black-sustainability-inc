import {
  MAP_HELP_INTRO,
  formatSupportTicketNumber,
  getSupportTicketCcRecipients,
  getSupportTicketRecipients,
} from "@/lib/mapSupportConfig";

describe("mapSupportConfig", () => {
  const originalRecipients = process.env.SUPPORT_TICKET_RECIPIENTS;
  const originalCc = process.env.SUPPORT_TICKET_CC;

  afterEach(() => {
    if (originalRecipients === undefined) {
      delete process.env.SUPPORT_TICKET_RECIPIENTS;
    } else {
      process.env.SUPPORT_TICKET_RECIPIENTS = originalRecipients;
    }
    if (originalCc === undefined) {
      delete process.env.SUPPORT_TICKET_CC;
    } else {
      process.env.SUPPORT_TICKET_CC = originalCc;
    }
  });

  it("exposes approved help intro copy", () => {
    expect(MAP_HELP_INTRO).toBe("Running into any issues? Let us know here:");
  });

  it("formats ticket numbers with a zero-padded prefix", () => {
    expect(formatSupportTicketNumber(1)).toBe("BSN-000001");
    expect(formatSupportTicketNumber(42)).toBe("BSN-000042");
    expect(formatSupportTicketNumber(1234567)).toBe("BSN-1234567");
  });

  it("defaults ticket To recipients without Raina (she is CC)", () => {
    delete process.env.SUPPORT_TICKET_RECIPIENTS;
    expect(getSupportTicketRecipients()).toEqual([
      "jerry@techluminateacademy.com",
      "kelyce@blacksustainability.org",
    ]);
  });

  it("always CCs Raina by default on support ticket emails", () => {
    delete process.env.SUPPORT_TICKET_CC;
    expect(getSupportTicketCcRecipients()).toEqual(["raina@blacksustainability.org"]);
  });

  it("allows overriding recipients via env (comma-separated)", () => {
    process.env.SUPPORT_TICKET_RECIPIENTS = "a@x.com, B@X.com\nc@x.com";
    expect(getSupportTicketRecipients()).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });
});
