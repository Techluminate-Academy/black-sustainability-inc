"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { MEMBER_MAP_PROFILE_INFO_TOOLTIP } from "@/constants/memberMapProfileInfo";

function InfoCircleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-gray-600"
    >
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        fill="currentColor"
        d="M9.25 8.5h1.5V14h-1.5V8.5Zm.75-3.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
      />
    </svg>
  );
}

type Props = {
  /** Optional test id prefix when multiple hints on one page */
  testIdPrefix?: string;
};

/** ℹ hover/tap hint for updating profile details in the Black Sustainability Network. */
export default function MapProfileInfoHint({ testIdPrefix = "member-map-profile" }: Props) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const hintTestId = `${testIdPrefix}-info-hint`;
  const tooltipTestId = `${testIdPrefix}-info-tooltip`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <span ref={rootRef} className="group relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        data-testid={hintTestId}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-label="How to update your profile in the Network"
        onClick={() => setOpen((v) => !v)}
      >
        <InfoCircleIcon />
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        data-testid={tooltipTestId}
        className={[
          "absolute left-1/2 z-50 w-[min(16rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-[11px] leading-snug text-white shadow-lg",
          "top-full mt-1.5 sm:mt-2",
          open ? "block" : "hidden",
          "md:group-hover:block",
        ].join(" ")}
      >
        <p>{MEMBER_MAP_PROFILE_INFO_TOOLTIP}</p>
      </div>
    </span>
  );
}
