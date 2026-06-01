"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  MEMBER_LEVEL_VISIBILITY_ICON_SRC,
  MEMBER_LEVEL_VISIBILITY_TOOLTIP,
} from "@/constants/memberLevelVisibility";

function QuestionMarkInCircleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-gray-600"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
      <text
        x="8"
        y="11.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
      >
        ?
      </text>
    </svg>
  );
}

export default function MemberLevelVisibilityHint() {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [useFallbackIcon, setUseFallbackIcon] = useState(false);

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
        data-testid="member-level-visibility-hint"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-label="How member level affects map visibility"
        onClick={() => setOpen((v) => !v)}
      >
        {useFallbackIcon ? (
          <QuestionMarkInCircleIcon />
        ) : (
          <Image
            src={MEMBER_LEVEL_VISIBILITY_ICON_SRC}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            onError={() => setUseFallbackIcon(true)}
          />
        )}
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        data-testid="member-level-visibility-tooltip"
        className={[
          "absolute left-1/2 z-50 w-[min(16rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-[11px] leading-snug text-white shadow-lg",
          "bottom-full mb-1.5 sm:mb-2",
          open ? "block" : "hidden",
          "md:group-hover:block",
        ].join(" ")}
      >
        <p>{MEMBER_LEVEL_VISIBILITY_TOOLTIP}</p>
      </div>
    </span>
  );
}
