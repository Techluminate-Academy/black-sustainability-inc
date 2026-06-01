"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import SupportTicketForm, {
  type SupportTicketSessionUser,
} from "@/features/memberMap/SupportTicketForm";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sessionUser?: SupportTicketSessionUser;
};

export default function MapHelpModal({ isOpen, onClose, sessionUser }: Props) {
  const [mounted, setMounted] = useState(false);
  // Remount the form each time the modal opens so it resets to a clean state.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setFormKey((k) => k + 1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-help-title"
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center sm:p-6"
      data-testid="map-help-overlay"
    >
      <div
        className="absolute inset-0 bg-black/60"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        aria-hidden="true"
        data-testid="map-help-backdrop"
        onClick={onClose}
      />
      <div
        data-testid="map-help-modal"
        className="relative z-10 w-full sm:max-w-md max-h-[min(88dvh,90vh)] overflow-y-auto rounded-t-2xl sm:rounded-lg bg-white shadow-2xl sm:mx-0 mx-0"
      >
        <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 id="map-help-title" className="text-lg font-semibold text-gray-900 pr-2">
              Map help
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close help"
            >
              Close
            </button>
          </div>

          <SupportTicketForm
            key={formKey}
            sessionUser={sessionUser}
            onDone={onClose}
            doneLabel="Done"
          />
          <p className="mt-4 text-center text-xs text-gray-500">
            Prefer a full-page form?{" "}
            <Link
              href="/support"
              className="font-semibold text-green-700 underline underline-offset-2 hover:text-green-800"
              onClick={onClose}
            >
              Open public support page
            </Link>
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
