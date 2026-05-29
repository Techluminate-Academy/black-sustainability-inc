"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

type Ticket = {
  id: string;
  ticketNumber: string;
  message: string;
  submitterEmail: string | null;
  submitterName: string | null;
  mightyId: number | null;
  status: TicketStatus;
  pageUrl: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type Counts = Record<TicketStatus, number> & { total: number };

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-200 text-gray-700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
      if (!token) {
        setError("Not signed in. Please log in to the admin dashboard.");
        setLoading(false);
        return;
      }
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/admin/support-tickets${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to load tickets.");
        setLoading(false);
        return;
      }
      setTickets(data.tickets || []);
      setCounts(data.counts || null);
    } catch {
      setError("Network error while loading tickets.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (ticket: Ticket, status: TicketStatus) => {
    if (status === ticket.status) return;
    setUpdatingId(ticket.id);
    const prev = tickets;
    setTickets((list) =>
      list.map((t) => (t.id === ticket.id ? { ...t, status } : t))
    );
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticketNumber: ticket.ticketNumber, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTickets(prev);
        setError(data.error || "Failed to update status.");
        return;
      }
      // Refresh counts after a successful change.
      void load();
    } catch {
      setTickets(prev);
      setError("Network error while updating status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout currentSection="support-tickets">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
            <p className="text-sm text-gray-500">
              Member-submitted issues from the map help form.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="self-start rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {counts && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryCard label="Total" value={counts.total} active={filter === "all"} onClick={() => setFilter("all")} />
            {STATUS_OPTIONS.map((s) => (
              <SummaryCard
                key={s.value}
                label={s.label}
                value={counts[s.value]}
                active={filter === s.value}
                onClick={() => setFilter(s.value)}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-green-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
            No tickets {filter === "all" ? "yet" : `with status "${filter}"`}.
          </div>
        ) : (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[ticket.status]}`}
                      >
                        {STATUS_OPTIONS.find((s) => s.value === ticket.status)?.label ??
                          ticket.status}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">
                      {ticket.message}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        {ticket.submitterName ? `${ticket.submitterName} · ` : ""}
                        {ticket.submitterEmail ? (
                          <a
                            href={`mailto:${ticket.submitterEmail}`}
                            className="text-green-700 underline underline-offset-2"
                          >
                            {ticket.submitterEmail}
                          </a>
                        ) : (
                          "No email provided"
                        )}
                      </span>
                      {ticket.pageUrl && (
                        <a
                          href={ticket.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-gray-400 underline underline-offset-2 hover:text-gray-600"
                        >
                          {ticket.pageUrl}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label className="sr-only" htmlFor={`status-${ticket.id}`}>
                      Update status
                    </label>
                    <select
                      id={`status-${ticket.id}`}
                      value={ticket.status}
                      disabled={updatingId === ticket.id}
                      onChange={(e) => changeStatus(ticket, e.target.value as TicketStatus)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:opacity-60 sm:w-40"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
        active
          ? "border-green-600 bg-green-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
    </button>
  );
}
