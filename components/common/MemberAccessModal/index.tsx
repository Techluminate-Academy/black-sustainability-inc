"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import icons from "@/icons";
import {
  MEMBER_ACCESS_BODY,
  MEMBER_ACCESS_CTA_LABEL,
  MEMBER_ACCESS_JOIN_URL,
  MEMBER_ACCESS_SECONDARY_LINK_LABEL,
  MEMBER_ACCESS_SECONDARY_PREFIX,
  MEMBER_ACCESS_SECONDARY_SUFFIX,
  MEMBER_ACCESS_SIGNIN_ROUTE,
  MEMBER_ACCESS_TITLE,
} from "@/constants/memberAccess";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** When false, omits the BSN logo header (e.g. nested in another surface). */
  showLogo?: boolean;
};

export default function MemberAccessModal({
  isOpen,
  onClose,
  showLogo = true,
}: Props) {
  const router = useRouter();

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-filter flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-access-title"
      data-testid="member-access-modal"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl px-5 py-7 sm:px-10 sm:py-8 mx-auto relative w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 sm:right-4 sm:top-4 min-h-[44px] min-w-[44px] rounded-full p-2 flex items-center justify-center bg-[#EB4335] font-bold"
          onClick={onClose}
          aria-label="Close"
          data-testid="member-access-close"
        >
          <icons.close />
        </button>

        <div className="flex flex-col gap-y-3 justify-center items-center text-center pt-2">
          {showLogo ? (
            <Image
              src="/png/LOGO.png"
              alt="Black Sustainability Network"
              width={286}
              height={92}
              className="w-[220px] sm:w-[286px] h-auto"
            />
          ) : null}

          <h2
            id="member-access-title"
            className="text-lg sm:text-xl font-bold text-black max-w-md"
          >
            {MEMBER_ACCESS_TITLE}
          </h2>

          <p className="max-w-md w-full text-sm sm:text-base text-black leading-relaxed">
            {MEMBER_ACCESS_BODY}
          </p>

          <p className="max-w-md w-full text-sm sm:text-base text-gray-700 leading-relaxed">
            {MEMBER_ACCESS_SECONDARY_PREFIX}
            <Link
              href={MEMBER_ACCESS_JOIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 font-medium underline underline-offset-2 hover:text-green-800"
            >
              {MEMBER_ACCESS_SECONDARY_LINK_LABEL}
            </Link>
            {MEMBER_ACCESS_SECONDARY_SUFFIX}
          </p>

          <button
            type="button"
            onClick={() => router.push(MEMBER_ACCESS_SIGNIN_ROUTE)}
            className="mt-2 flex gap-x-2 items-center justify-center w-full min-h-[44px] px-5 py-3 bg-[#FFBF23] text-black font-semibold rounded-full hover:bg-yellow-400 transition-colors text-sm sm:text-base"
            data-testid="member-access-cta"
          >
            {MEMBER_ACCESS_CTA_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
