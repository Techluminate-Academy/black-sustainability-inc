"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import type { MemberMapProfileView } from "@/lib/domain/members/memberMapProfileView.service";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onOpenUpdateLocation?: () => void;
  sessionUser: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type SessionResp =
  | { authenticated: false; user: null }
  | {
      authenticated: true;
      user: { email: string; mightyId: number; firstName?: string | null; lastName?: string | null };
    };

export default function UpdateProfileModal({
  isOpen,
  onClose,
  onSaved,
  onOpenUpdateLocation,
  sessionUser,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setLoading(true);
      return;
    }
    setLoading(true);
    let cancelled = false;

    (async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        const sessionData = (await sessionRes.json()) as SessionResp;
        if (!sessionData.authenticated) {
          if (!cancelled) setLoading(false);
          return;
        }
        if (!cancelled) setEmail(sessionData.user.email);

        const profileRes = await fetch("/api/member/map-profile", { credentials: "include" });
        const profileJson = await profileRes.json();
        if (!cancelled && profileRes.ok && profileJson?.ok && profileJson.profile) {
          const p = profileJson.profile as MemberMapProfileView;
          setFirstName(p.firstName || sessionData.user.firstName || sessionUser?.firstName || "");
          setLastName(p.lastName || sessionData.user.lastName || sessionUser?.lastName || "");
          setOrganizationName(p.organizationName || "");
          setBio(p.bio || "");
        } else if (!cancelled) {
          setFirstName(sessionData.user.firstName || sessionUser?.firstName || "");
          setLastName(sessionData.user.lastName || sessionUser?.lastName || "");
        }
      } catch {
        if (!cancelled) {
          setEmail(sessionUser?.email || "");
          setFirstName(sessionUser?.firstName || "");
          setLastName(sessionUser?.lastName || "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionUser?.email, sessionUser?.firstName, sessionUser?.lastName]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/member/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, organizationName, bio }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Could not save profile");
      }
      if (json?.profile) {
        const p = json.profile as MemberMapProfileView;
        setFirstName(p.firstName || firstName);
        setLastName(p.lastName || lastName);
        setBio(p.bio || "");
        setOrganizationName(p.organizationName || "");
      }
      toast.success("Profile saved. Your map listing will update in a few seconds.");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error((err as Error)?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-profile-title"
      className="fixed inset-0 z-[100001] flex items-end sm:items-center justify-center sm:p-6"
      data-testid="update-profile-overlay"
    >
      <div
        className="absolute inset-0 bg-black/60"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        aria-hidden="true"
        data-testid="update-profile-backdrop"
        onClick={onClose}
      />
      <div
        data-testid="update-profile-modal"
        className="relative z-10 w-full sm:max-w-lg max-h-[min(88dvh,90vh)] overflow-y-auto rounded-t-2xl sm:rounded-lg bg-white shadow-2xl sm:mx-0 mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 id="update-profile-title" className="text-lg font-semibold text-gray-900 pr-2">
              Update your profile
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close profile editor"
            >
              Close
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-600 py-8 text-center" data-testid="update-profile-loading">
              Loading…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="update-profile-form">
              <div
                className="rounded-lg border border-green-100 bg-green-50/90 px-4 py-3 text-sm text-gray-700 leading-relaxed space-y-2"
                data-testid="update-profile-guidance"
              >
                <p className="font-semibold text-gray-900">How to update your map listing</p>
                <ol className="list-decimal list-outside ml-4 space-y-1.5">
                  <li>
                    Edit your <strong className="font-semibold text-gray-800">name</strong>,{" "}
                    <strong className="font-semibold text-gray-800">organization</strong>, and{" "}
                    <strong className="font-semibold text-gray-800">bio</strong> below, then tap{" "}
                    <strong className="font-semibold text-gray-800">Save profile</strong>. Changes
                    save to your Black Sustainability Network profile first, then sync to this map.
                  </li>
                  <li>
                    Your <strong className="font-semibold text-gray-800">map pin</strong> is updated
                    separately—open{" "}
                    {onOpenUpdateLocation ? (
                      <button
                        type="button"
                        className="font-semibold text-green-700 underline underline-offset-2 hover:text-green-800"
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
                    in the menu and choose your city from the suggestions.
                  </li>
                  <li>
                    Write an extended bio members can scan quickly: your focus, who you serve, and how to
                    connect. Member level and profile photo are not changed here.
                  </li>
                </ol>
                {email ? (
                  <p className="text-xs text-gray-600 pt-0.5">
                    Signed in as <span className="font-semibold text-gray-800">{email}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    First name
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[44px]"
                    data-testid="update-profile-first-name"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Last name
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[44px]"
                    data-testid="update-profile-last-name"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Organization
                </span>
                <input
                  type="text"
                  maxLength={200}
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[44px]"
                  placeholder="Company, collective, or project name"
                  data-testid="update-profile-organization"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Bio
                </span>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="What you do, your sustainability focus, and how members can connect with you"
                  data-testid="update-profile-bio"
                />
              </label>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-green-600 px-5 py-3 text-sm font-semibold uppercase text-white hover:bg-green-700 disabled:opacity-60 min-h-[44px]"
                  data-testid="update-profile-submit"
                >
                  {saving ? "Saving…" : "Save profile"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold uppercase text-gray-800 hover:bg-gray-50 min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
