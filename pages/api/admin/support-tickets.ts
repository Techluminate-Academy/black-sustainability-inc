import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  listSupportTickets,
  getSupportTicketCounts,
  updateSupportTicketStatus,
  isSupportTicketStatus,
  type SupportTicketStatus,
} from "@/lib/domain/support/supportTicket.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const statusParam = req.query.status;
      const status =
        typeof statusParam === "string" && isSupportTicketStatus(statusParam)
          ? (statusParam as SupportTicketStatus)
          : undefined;
      const [tickets, counts] = await Promise.all([
        listSupportTickets({ status }),
        getSupportTicketCounts(),
      ]);
      return res.status(200).json({ ok: true, tickets, counts });
    } catch (e) {
      console.warn("[admin/support-tickets] list failed:", (e as Error)?.message);
      return res.status(500).json({ ok: false, error: "Failed to load tickets" });
    }
  }

  if (req.method === "PATCH") {
    const body = (req.body ?? {}) as { ticketNumber?: unknown; status?: unknown };
    const ticketNumber =
      typeof body.ticketNumber === "string" ? body.ticketNumber.trim() : "";
    if (!ticketNumber) {
      return res.status(400).json({ ok: false, error: "ticketNumber is required" });
    }
    if (!isSupportTicketStatus(body.status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }
    try {
      const updated = await updateSupportTicketStatus(ticketNumber, body.status);
      if (!updated) {
        return res.status(404).json({ ok: false, error: "Ticket not found" });
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.warn("[admin/support-tickets] update failed:", (e as Error)?.message);
      return res.status(500).json({ ok: false, error: "Failed to update ticket" });
    }
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
