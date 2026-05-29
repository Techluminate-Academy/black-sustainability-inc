import { createMocks } from "node-mocks-http";

const mockVerifyAdminRequest = jest.fn();
jest.mock("@/lib/adminAuth", () => ({
  verifyAdminRequest: (...args: unknown[]) => mockVerifyAdminRequest(...args),
}));

const mockListSupportTickets = jest.fn();
const mockGetSupportTicketCounts = jest.fn();
const mockUpdateSupportTicketStatus = jest.fn();
jest.mock("@/lib/domain/support/supportTicket.service", () => ({
  listSupportTickets: (...args: unknown[]) => mockListSupportTickets(...args),
  getSupportTicketCounts: (...args: unknown[]) => mockGetSupportTicketCounts(...args),
  updateSupportTicketStatus: (...args: unknown[]) => mockUpdateSupportTicketStatus(...args),
  isSupportTicketStatus: (v: unknown) =>
    ["open", "in_progress", "resolved", "closed"].includes(v as string),
}));

describe("/api/admin/support-tickets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAdminRequest.mockResolvedValue({ id: "1", email: "a@x.com", name: "A", role: "admin" });
    mockListSupportTickets.mockResolvedValue([{ ticketNumber: "BSN-000001", status: "open" }]);
    mockGetSupportTicketCounts.mockResolvedValue({
      open: 1,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      total: 1,
    });
    mockUpdateSupportTicketStatus.mockResolvedValue(true);
  });

  it("returns 401 when not an admin", async () => {
    mockVerifyAdminRequest.mockResolvedValueOnce(null);
    const handler = (await import("@/pages/api/admin/support-tickets")).default;
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it("lists tickets and counts for an admin", async () => {
    const handler = (await import("@/pages/api/admin/support-tickets")).default;
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.ok).toBe(true);
    expect(body.tickets).toHaveLength(1);
    expect(body.counts.total).toBe(1);
  });

  it("filters by valid status", async () => {
    const handler = (await import("@/pages/api/admin/support-tickets")).default;
    const { req, res } = createMocks({ method: "GET", query: { status: "resolved" } });
    await handler(req, res);
    expect(mockListSupportTickets).toHaveBeenCalledWith({ status: "resolved" });
  });

  it("updates a ticket status via PATCH", async () => {
    const handler = (await import("@/pages/api/admin/support-tickets")).default;
    const { req, res } = createMocks({
      method: "PATCH",
      body: { ticketNumber: "BSN-000001", status: "resolved" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(mockUpdateSupportTicketStatus).toHaveBeenCalledWith("BSN-000001", "resolved");
  });

  it("rejects invalid status on PATCH", async () => {
    const handler = (await import("@/pages/api/admin/support-tickets")).default;
    const { req, res } = createMocks({
      method: "PATCH",
      body: { ticketNumber: "BSN-000001", status: "nope" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(mockUpdateSupportTicketStatus).not.toHaveBeenCalled();
  });

  it("returns 404 when ticket not found", async () => {
    mockUpdateSupportTicketStatus.mockResolvedValueOnce(false);
    const handler = (await import("@/pages/api/admin/support-tickets")).default;
    const { req, res } = createMocks({
      method: "PATCH",
      body: { ticketNumber: "BSN-999999", status: "closed" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it("405 for unsupported methods", async () => {
    const handler = (await import("@/pages/api/admin/support-tickets")).default;
    const { req, res } = createMocks({ method: "DELETE" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
