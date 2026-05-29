import React from "react";

/** Circle help icon for map support entry point. */
export default function MapHelpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.5 9.25a2.75 2.75 0 0 1 5.07 1.37c0 1.38-1.07 1.88-1.82 2.38-.58.38-.75.63-.75 1.12v.13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.75" r="1" fill="currentColor" />
    </svg>
  );
}
