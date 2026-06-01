import type { SupportTicket } from "@/lib/domain/support/supportTicket.service";

const mockSendMail = jest.fn().mockResolvedValue({});

jest.mock("@/lib/notifications/gmailTransport", () => ({
  getGmailTransport: jest.fn(() => ({
    authUser: "jerry@techluminateacademy.com",
    transporter: { sendMail: mockSendMail },
  })),
  gmailFromHeader: (name: string, user: string) => `"${name}" <${user}>`,
}));

jest.mock("@/lib/mapSupportConfig", () => ({
  getSupportTicketRecipients: () => ["staff@blacksustainability.org"],
  getSupportTicketCcRecipients: () => ["raina@blacksustainability.org"],
}));

import { sendSupportTicketEmails } from "@/lib/notifications/sendSupportTicketEmails";
import { getGmailTransport } from "@/lib/notifications/gmailTransport";

const baseTicket: SupportTicket = {
  ticketNumber: "BSN-000001",
  seq: 1,
  message: "Map pin missing",
  submitterEmail: "member@example.com",
  submitterName: "Test Member",
  mightyId: null,
  status: "open",
  pageUrl: "https://map.test/",
  userAgent: null,
  source: "map-help",
  createdAt: new Date("2026-01-01T12:00:00.000Z"),
  updatedAt: new Date("2026-01-01T12:00:00.000Z"),
};

describe("sendSupportTicketEmails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGmailTransport as jest.Mock).mockReturnValue({
      authUser: "jerry@techluminateacademy.com",
      transporter: { sendMail: mockSendMail },
    });
  });

  it("sends staff and member emails via EMAIL_USER transport", async () => {
    const result = await sendSupportTicketEmails(baseTicket);

    expect(result).toEqual({ staffNotified: true, submitterNotified: true });
    expect(mockSendMail).toHaveBeenCalledTimes(2);

    const staffMail = mockSendMail.mock.calls[0][0];
    expect(staffMail.from).toBe(
      '"Black Sustainability Member Map" <jerry@techluminateacademy.com>'
    );
    expect(staffMail.to).toBe("staff@blacksustainability.org");
    expect(staffMail.cc).toBe("raina@blacksustainability.org");
    expect(staffMail.subject).toContain("BSN-000001");

    const memberMail = mockSendMail.mock.calls[1][0];
    expect(memberMail.to).toBe("member@example.com");
    expect(memberMail.cc).toBe("raina@blacksustainability.org");
    expect(memberMail.from).toContain("jerry@techluminateacademy.com");
  });

  it("skips email when Gmail is not configured", async () => {
    (getGmailTransport as jest.Mock).mockReturnValueOnce(null);

    const result = await sendSupportTicketEmails(baseTicket);

    expect(result).toEqual({ staffNotified: false, submitterNotified: false });
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
