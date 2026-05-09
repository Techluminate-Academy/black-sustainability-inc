import { useEffect, useState } from "react";
import { reloadPage } from "@/lib/reloadPage";

type Mode = "paid" | "unpaid" | null;
type StatusResponse = { ok: true; allowed: boolean; mode: Mode };

export default function ImpersonationToolbar() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState<"paid" | "unpaid" | "clear" | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me/impersonation-status", {
          method: "GET",
          credentials: "same-origin",
        });
        if (!r.ok) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const json: StatusResponse = await r.json();
        if (!cancelled) {
          setAllowed(Boolean(json.allowed));
          setMode(json.mode ?? null);
        }
      } catch {
        if (!cancelled) setAllowed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (allowed !== true) return null;

  const trigger = async (next: "paid" | "unpaid" | "clear") => {
    if (busy) return;
    setBusy(next);
    try {
      const r = await fetch("/api/test/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ mode: next }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json?.ok) {
        // eslint-disable-next-line no-alert
        alert(
          `Impersonation request failed (${r.status}): ${
            json?.error || "Unknown error"
          }`
        );
        setBusy(null);
        return;
      }
      reloadPage();
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert(`Network error: ${err?.message || err}`);
      setBusy(null);
    }
  };

  const badge = mode
    ? mode === "paid"
      ? "PAID"
      : "UNPAID"
    : "OFF";

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Open tester impersonation toolbar"
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 9999,
          background: "#111827",
          color: "#fff",
          border: "1px solid #374151",
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          opacity: 0.85,
        }}
      >
        Tester · {badge}
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Tester impersonation toolbar"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        background: "#111827",
        color: "#fff",
        border: "1px solid #374151",
        borderRadius: 10,
        padding: "10px 12px",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 220,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontWeight: 600 }}>Tester impersonation</strong>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse toolbar"
          style={{
            background: "transparent",
            color: "#9ca3af",
            border: "none",
            cursor: "pointer",
            padding: "0 4px",
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ color: "#9ca3af" }}>
        Current mode: <strong style={{ color: mode ? "#10b981" : "#9ca3af" }}>{badge}</strong>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <ToolbarButton
          label="View as Paid"
          active={mode === "paid"}
          loading={busy === "paid"}
          disabled={!!busy}
          onClick={() => trigger("paid")}
          tone="success"
        />
        <ToolbarButton
          label="View as Unpaid"
          active={mode === "unpaid"}
          loading={busy === "unpaid"}
          disabled={!!busy}
          onClick={() => trigger("unpaid")}
          tone="warn"
        />
        <ToolbarButton
          label="Clear"
          active={false}
          loading={busy === "clear"}
          disabled={!!busy || !mode}
          onClick={() => trigger("clear")}
          tone="neutral"
        />
      </div>
    </div>
  );
}

function ToolbarButton(props: {
  label: string;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  tone: "success" | "warn" | "neutral";
}) {
  const { label, active, loading, disabled, onClick, tone } = props;
  const palette = {
    success: { bg: active ? "#10b981" : "#064e3b", fg: "#fff", border: "#065f46" },
    warn: { bg: active ? "#f59e0b" : "#78350f", fg: "#fff", border: "#92400e" },
    neutral: { bg: "#374151", fg: "#fff", border: "#4b5563" },
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        padding: "6px 10px",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled && !loading ? 0.6 : 1,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}
