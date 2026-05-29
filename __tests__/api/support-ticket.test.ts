import { createMocks } from "node-mocks-http";

const mockSession = {
  email: "member@example.com",
  mightyId: 123,
  firstName: "Member",
  lastName: "Example",
};

jest.mock("@/lib/bsnSession", () => ({
  getBsnSessionFromReq: jest.fn(() => mockSession),
}));

const mockCreateSupportTicket = jest.fn();
jest.mock("@/lib/domain/support/supportTicket.service", () => ({
  createSupportTicket: (...args: unknown[]) => mockCreateSupportTicket(...args),
}));

const mockSendSupportTicketEmails = jest.fn();
jest.mock("@/lib/notifications/sendSupportTicketEmails", () => ({
  sendSupportTicketEmails: (...args: unknown[]) => mockSendSupportTicketEmails(...args),
}));

describe("/api/support/ticket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSupportTicket.mockResolvedValue({
      ticketNumber: "BSN-000007",
      submitterEmail: "member@example.com",
    });
    mockSendSupportTicketEmails.mockResolvedValue({
      staffNotified: true,
      submitterNotified: true,
    });
  });

  it("returns 405 for non-POST", async () => {
    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it("returns 400 when message is missing or too short", async () => {
    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({ method: "POST", body: { message: "x" } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(mockCreateSupportTicket).not.toHaveBeenCalled();
  });

  it("creates a ticket and returns the ticket number", async () => {
    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({
      method: "POST",
      body: { message: "My pin is not showing", pageUrl: "https://map.test/" },
      headers: { "user-agent": "jest" },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const body = JSON.parse(res._getData());
    expect(body).toMatchObject({ ok: true, ticketNumber: "BSN-000007", confirmationSent: true });

    expect(mockCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "My pin is not showing",
        submitterEmail: "member@example.com",
        submitterName: "Member Example",
        mightyId: 123,
        pageUrl: "https://map.test/",
        userAgent: "jest",
      })
    );
    expect(mockSendSupportTicketEmails).toHaveBeenCalled();
  });

  it("returns 400 when support-page submit has no email", async () => {
    const { getBsnSessionFromReq } = await import("@/lib/bsnSession");
    (getBsnSessionFromReq as jest.Mock).mockReturnValueOnce(null);

    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({
      method: "POST",
      body: { message: "Issue report", source: "support-page" },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(mockCreateSupportTicket).not.toHaveBeenCalled();
  });

  it("uses typed email on support-page even when session exists", async () => {
    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({
      method: "POST",
      body: {
        message: "Need help with map",
        email: "notify@example.com",
        source: "support-page",
      },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(mockCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        submitterEmail: "notify@example.com",
        source: "support-page",
      })
    );
  });

  it("allows anonymous map-help tickets without email", async () => {
    const { getBsnSessionFromReq } = await import("@/lib/bsnSession");
    (getBsnSessionFromReq as jest.Mock).mockReturnValueOnce(null);

    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({
      method: "POST",
      body: { message: "Map won't load for me" },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(mockCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        submitterEmail: null,
        source: "map-help",
      })
    );
  });

  it("falls back to a typed-in email when no session", async () => {
    const { getBsnSessionFromReq } = await import("@/lib/bsnSession");
    (getBsnSessionFromReq as jest.Mock).mockReturnValueOnce(null);

    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({
      method: "POST",
      body: {
        message: "Anonymous issue report",
        email: "guest@example.com",
        name: "Guest",
        source: "support-page",
      },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(mockCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        submitterEmail: "guest@example.com",
        submitterName: "Guest",
        mightyId: null,
        source: "support-page",
      })
    );
  });

  it("returns 500 when ticket creation fails (infra)", async () => {
    mockCreateSupportTicket.mockRejectedValueOnce(new Error("mongo down"));
    const handler = (await import("@/pages/api/support/ticket")).default;
    const { req, res } = createMocks({ method: "POST", body: { message: "valid message here" } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
  });
});
