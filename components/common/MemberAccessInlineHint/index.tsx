"use client";

import React from "react";
import Link from "next/link";
import {
  MEMBER_ACCESS_CTA_LABEL,
  MEMBER_ACCESS_JOIN_URL,
  MEMBER_ACCESS_SIGNIN_ROUTE,
  MEMBER_ACCESS_TITLE,
} from "@/constants/memberAccess";

type Props = {
  className?: string;
};

/** Compact member-access guidance for cards and map popups. */
export default function MemberAccessInlineHint({ className = "" }: Props) {
  return (
    <div
      className={`rounded-lg border border-[#FFBF23]/40 bg-[#FFF8E5] p-2.5 text-left ${className}`}
      data-testid="member-access-inline-hint"
    >
      <p className="text-xs font-semibold text-gray-900">{MEMBER_ACCESS_TITLE}</p>
      <p className="mt-1 text-xs leading-snug text-gray-700">
        Log in to view full profiles and connection options.{" "}
        <Link
          href={MEMBER_ACCESS_JOIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-green-700 underline underline-offset-2"
        >
          Join the network
        </Link>
      </p>
      <Link
        href={MEMBER_ACCESS_SIGNIN_ROUTE}
        className="mt-2 inline-flex min-h-[36px] items-center justify-center rounded-full bg-[#FFBF23] px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-400"
      >
        {MEMBER_ACCESS_CTA_LABEL}
      </Link>
    </div>
  );
}
