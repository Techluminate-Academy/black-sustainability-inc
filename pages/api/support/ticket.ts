import type { NextApiRequest, NextApiResponse } from "next";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import { createSupportTicket } from "@/lib/domain/support/supportTicket.service";
import { sendSupportTicketEmails } from "@/lib/notifications/sendSupportTicketEmails";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = (req.body ?? {}) as {
    message?: unknown;
    email?: unknown;
    name?: unknown;
    pageUrl?: unknown;
    source?: unknown;
  };

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 3) {
    return res
      .status(400)
      .json({ ok: false, error: "Please describe the issue you're running into." });
  }

  // Public endpoint — no login required. Session identity used when present.
  const session = getBsnSessionFromReq(req);
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const source =
    typeof body.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, 100)
      : "map-help";

  // Public /support form always uses the email the user entered (even when logged in).
  const submitterEmail =
    source === "support-page" && rawEmail
      ? rawEmail
      : session?.email ?? (rawEmail || null);

  if (source === "support-page" && !submitterEmail) {
    return res.status(400).json({
      ok: false,
      error: "Please enter your email so we can confirm your ticket and follow up.",
    });
  }
  if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }

  const sessionName = session
    ? [session.firstName, session.lastName].filter(Boolean).join(" ").trim()
    : "";
  const submitterName =
    (sessionName || (typeof body.name === "string" ? body.name : "")) || null;

  try {
    const ticket = await createSupportTicket({
      message,
      submitterEmail,
      submitterName,
      mightyId: session?.mightyId ?? null,
      pageUrl: typeof body.pageUrl === "string" ? body.pageUrl : null,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
      source,
    });

    // Email is best-effort; the ticket is already saved if this fails.
    const emailResult = await sendSupportTicketEmails(ticket);

    return res.status(201).json({
      ok: true,
      ticketNumber: ticket.ticketNumber,
      confirmationSent: emailResult.submitterNotified,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to submit ticket";
    console.warn("[support/ticket]", msg);
    // Surface validation-style messages, keep infra errors generic.
    const isValidation = /describe|few words|email/i.test(msg);
    return res
      .status(isValidation ? 400 : 500)
      .json({ ok: false, error: isValidation ? msg : "Failed to submit ticket. Please try again." });
  }
}
