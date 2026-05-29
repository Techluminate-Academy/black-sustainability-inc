"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MAP_HELP_INTRO } from "@/lib/mapSupportConfig";

export type SupportTicketSessionUser = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null;

type SubmitResult = { ticketNumber: string; confirmationSent: boolean };

type Props = {
  sessionUser?: SupportTicketSessionUser;
  /** Optional callback after a successful submission. */
  onSubmitted?: (result: SubmitResult) => void;
  /** Show the approved intro line above the form. Default true. */
  showIntro?: boolean;
  /** Label for the submit button. Default "Submit ticket". */
  submitLabel?: string;
  /** Render a "Done"/close action in the success state. */
  onDone?: () => void;
  doneLabel?: string;
  /** When true, a valid email is required before submit. */
  requireEmail?: boolean;
  /** Always show the email field (e.g. public /support page), even when signed in. */
  showEmailField?: boolean;
  /** Stored on the ticket as `source` (e.g. map-help, support-page). */
  ticketSource?: string;
};

/**
 * Member-facing support ticket form. Shared by the in-map MapHelpModal and the
 * standalone /support page. Posts to /api/support/ticket and shows the ticket
 * number on success.
 */
export default function SupportTicketForm({
  sessionUser,
  onSubmitted,
  showIntro = true,
  submitLabel = "Submit ticket",
  onDone,
  doneLabel = "Done",
  requireEmail = false,
  showEmailField = false,
  ticketSource = "map-help",
}: Props) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const sessionEmail = sessionUser?.email?.trim() || "";
  const sessionName = useMemo(
    () =>
      [sessionUser?.firstName, sessionUser?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim(),
    [sessionUser?.firstName, sessionUser?.lastName]
  );

  useEffect(() => {
    setEmail(sessionEmail);
  }, [sessionEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      setError("Please describe the issue you're running into.");
      return;
    }
    const outboundEmail = showEmailField ? email.trim() : sessionEmail || email.trim();
    if (requireEmail && !outboundEmail) {
      setError("Please enter your email so we can confirm your ticket and follow up.");
      return;
    }
    if (requireEmail && outboundEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(outboundEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: trimmed,
          email: outboundEmail || undefined,
          name: sessionName || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
          source: ticketSource,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        ticketNumber?: string;
        confirmationSent?: boolean;
      };
      if (!res.ok || !data.ok || !data.ticketNumber) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      const next = {
        ticketNumber: data.ticketNumber,
        confirmationSent: Boolean(data.confirmationSent),
      };
      setResult(next);
      onSubmitted?.(next);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div data-testid="map-help-success" className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4">
          <p className="text-sm font-semibold text-green-800">Thanks — we&apos;re on it.</p>
          <p className="mt-1 text-sm text-gray-700 leading-relaxed">
            Your ticket{" "}
            <span
              className="font-mono font-semibold text-gray-900"
              data-testid="map-help-ticket-number"
            >
              {result.ticketNumber}
            </span>{" "}
            has been created and our team is working on resolving the issue.
          </p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {result.confirmationSent
            ? "A confirmation email is on its way. Please keep your ticket number for reference."
            : "Please keep your ticket number for reference."}
        </p>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="inline-flex w-full items-center justify-center rounded-md bg-green-600 px-5 py-3 text-sm font-semibold uppercase text-white hover:bg-green-700 transition-colors min-h-[44px]"
          >
            {doneLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="map-help-form">
      {showIntro && (
        <p className="text-sm text-gray-700 leading-relaxed" data-testid="map-help-intro">
          {MAP_HELP_INTRO}
        </p>
      )}

      <div>
        <label
          htmlFor="map-help-message"
          className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
        >
          Describe the issue
        </label>
        <textarea
          id="map-help-message"
          data-testid="map-help-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={5000}
          required
          placeholder="Tell us what's happening — e.g. your pin isn't showing, the map won't load, or a profile detail is wrong."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {(showEmailField || !sessionEmail) && (
        <div>
          <label
            htmlFor="map-help-email"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
          >
            Your email{" "}
            {requireEmail ? (
              <span className="text-red-600">*</span>
            ) : (
              <span className="font-normal text-gray-400">(optional)</span>
            )}
          </label>
          <input
            id="map-help-email"
            data-testid="map-help-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required={requireEmail}
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            {requireEmail
              ? "We’ll email your ticket number and any updates to this address."
              : "Add your email so we can send a confirmation and follow up."}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert" data-testid="map-help-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        data-testid="map-help-submit"
        className="inline-flex w-full items-center justify-center rounded-md bg-green-600 px-5 py-3 text-sm font-semibold uppercase text-white hover:bg-green-700 transition-colors min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending…" : submitLabel}
      </button>

      <p className="text-xs text-gray-500 leading-relaxed">
        Your message creates a support ticket that BSN staff review. You&apos;ll get a ticket
        number
        {(showEmailField && requireEmail) || sessionEmail
          ? " and an email confirmation"
          : ""}{" "}
        once it&apos;s submitted.
      </p>
    </form>
  );
}
