"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import BioWithReadMore from "@/components/common/BioWithReadMore";
import MemberLevelVisibilityHint from "@/components/common/MemberLevelVisibilityHint";
import icons from "@/icons";
import type { MemberMapProfileView } from "@/lib/domain/members/memberMapProfileView.service";
import { BLACK_SUSTAINABILITY_NETWORK_HOME_URL } from "@/lib/mapSupportConfig";

const DEFAULT_PHOTO = "/png/default.png";
const NOT_PROVIDED = "Not provided";

type FetchStatus = "idle" | "loading" | "success" | "error";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile?: () => void;
  onOpenUpdateLocation?: () => void;
  sessionUser: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    profile?: { profilePhoto?: { url?: string } };
  } | null;
};

function displayName(profile: MemberMapProfileView, sessionUser: Props["sessionUser"]): string {
  const fromProfile = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  if (fromProfile) return fromProfile;
  const fromSession = [sessionUser?.firstName, sessionUser?.lastName].filter(Boolean).join(" ").trim();
  return fromSession || NOT_PROVIDED;
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  const text = value?.trim() || "";
  return (
    <div className="flex items-start gap-x-3">
      <span className="mt-0.5 shrink-0 text-gray-600">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{text || NOT_PROVIDED}</p>
      </div>
    </div>
  );
}

export default function MemberMapProfileModal({
  isOpen,
  onClose,
  onEditProfile,
  onOpenUpdateLocation,
  sessionUser,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<MemberMapProfileView | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setProfile(null);
      setError(null);
      return;
    }
    setStatus("loading");
    setProfile(null);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || status !== "loading") return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/member/map-profile", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load profile");
        }
        setProfile(json.profile as MemberMapProfileView);
        setStatus("success");
      } catch (e) {
        if (!cancelled) {
          setError((e as Error)?.message || "Could not load profile");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, status]);

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

  const showLoading = status === "loading" || status === "idle";
  const showContent = status === "success" && profile != null;

  const rawPhotoUrl = profile?.photoUrl?.trim() || "";
  const photoSrc = rawPhotoUrl
    ? rawPhotoUrl.startsWith("/")
      ? rawPhotoUrl
      : decodeURIComponent(rawPhotoUrl)
    : DEFAULT_PHOTO;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-map-profile-title"
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center sm:p-6"
      data-testid="member-map-profile-overlay"
    >
      <div
        className="absolute inset-0 bg-black/60"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        aria-hidden="true"
        data-testid="member-map-profile-backdrop"
        onClick={onClose}
      />
      <div
        data-testid="member-map-profile-modal"
        className="relative z-10 w-full sm:max-w-md max-h-[min(88dvh,90vh)] overflow-y-auto rounded-t-2xl sm:rounded-lg bg-white shadow-2xl sm:mx-0 mx-0"
      >
        <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2
              id="member-map-profile-title"
              className="text-lg font-semibold text-gray-900 pr-2"
            >
              Your map profile
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close profile"
            >
              Close
            </button>
          </div>

          <p
            className="text-xs text-gray-600 mb-4 leading-relaxed"
            data-testid="member-map-profile-guidance"
          >
            Preview of what members see on the map. Update your{" "}
            <strong className="font-semibold text-gray-800">name, organization, and bio</strong> with{" "}
            {onEditProfile ? (
              <button
                type="button"
                className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
                data-testid="member-map-profile-edit-link"
                onClick={() => {
                  onClose();
                  onEditProfile();
                }}
              >
                Edit profile
              </button>
            ) : (
              <span className="font-semibold text-gray-800">Edit profile</span>
            )}
            . Move your{" "}
            <strong className="font-semibold text-gray-800">map pin</strong> with{" "}
            {onOpenUpdateLocation ? (
              <button
                type="button"
                className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
                data-testid="member-map-profile-location-link"
                onClick={() => {
                  onClose();
                  onOpenUpdateLocation();
                }}
              >
                My location
              </button>
            ) : (
              <span className="font-semibold text-gray-800">My location</span>
            )}{" "}
            in the menu. Member level is set by BSN and cannot be edited here.
          </p>

          {showLoading && (
            <p className="text-sm text-gray-600 py-8 text-center" data-testid="member-map-profile-loading">
              Loading profile…
            </p>
          )}

          {status === "error" && error && (
            <p className="text-sm text-red-600 py-4" role="alert">
              {error}
            </p>
          )}

          {showContent && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md overflow-hidden bg-gray-100 mx-auto sm:mx-0">
                  <Image
                    src={photoSrc}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={!photoSrc.startsWith("/")}
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0 sm:pt-1 w-full text-center sm:text-left">
                  <p className="text-base font-semibold text-gray-900" data-testid="member-map-profile-name">
                    {displayName(profile, sessionUser)}
                  </p>
                  <div
                    className="flex flex-wrap items-center justify-center sm:justify-start gap-x-1 gap-y-0.5 mt-1"
                    data-testid="member-map-profile-level"
                  >
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold text-gray-800">Member level:</span>{" "}
                      <span className={profile.memberLevelLabel ? "text-gray-700" : "text-gray-500"}>
                        {profile.memberLevelLabel || NOT_PROVIDED}
                      </span>
                    </p>
                    <MemberLevelVisibilityHint />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4">
                <ProfileField icon={<icons.email />} label="Email" value={profile.email} />
                <ProfileField icon={<icons.location />} label="Location" value={profile.location} />
                <ProfileField
                  icon={<icons.organization />}
                  label="Organization"
                  value={profile.organizationName}
                />
              </div>

              <div className="border-t border-gray-200 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Bio
                </p>
                {profile.bio ? (
                  <BioWithReadMore bio={profile.bio} isAuthenticated />
                ) : (
                  <p className="text-sm text-gray-900">{NOT_PROVIDED}</p>
                )}
              </div>
            </div>
          )}

          <footer className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={BLACK_SUSTAINABILITY_NETWORK_HOME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-sm text-green-700 hover:text-green-800 underline underline-offset-2 decoration-green-700/40 hover:decoration-green-800"
              data-testid="member-map-profile-bsn-link"
            >
              Visit the Black Sustainability Network
            </a>
          </footer>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
