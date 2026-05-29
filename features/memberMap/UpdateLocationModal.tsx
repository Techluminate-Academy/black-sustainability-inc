"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import GooglePlacesAutocomplete, {
  geocodeByPlaceId,
  getLatLng,
} from "react-google-places-autocomplete";
import { buildMapFocusAfterSaveUrl } from "@/lib/domain/location/memberLocationPrompt";

type SessionResp =
  | { authenticated: false; user: null }
  | {
      authenticated: true;
      user: {
        email: string;
        mightyId: number;
        firstName?: string | null;
        lastName?: string | null;
      };
    };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  forced?: boolean;
  nextPath?: string;
  sessionUser?: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export default function UpdateLocationModal({
  isOpen,
  onClose,
  forced = false,
  nextPath = "/",
  sessionUser,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [selection, setSelection] = useState<any>(null);

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setLoading(true);
      setSelection(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = (await res.json()) as SessionResp;
        if (cancelled) return;
        if (!data.authenticated) {
          setAuthenticated(false);
          setDisplayName("");
          return;
        }
        setAuthenticated(true);
        const f = data.user.firstName ? String(data.user.firstName).trim() : "";
        setDisplayName(
          f || sessionUser?.firstName?.trim() || data.user.email || sessionUser?.email || ""
        );
      } catch {
        if (!cancelled) {
          setAuthenticated(Boolean(sessionUser?.email));
          setDisplayName(
            sessionUser?.firstName?.trim() || sessionUser?.email?.trim() || ""
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionUser?.email, sessionUser?.firstName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !skipping) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, saving, skipping]);

  const signInNext = useMemo(() => {
    const params = new URLSearchParams();
    params.set("updateLocation", "1");
    if (forced) params.set("forced", "1");
    if (safeNextPath !== "/") params.set("next", safeNextPath);
    return `/?${params.toString()}`;
  }, [forced, safeNextPath]);

  async function handleSave() {
    if (!selection?.value?.place_id) {
      toast.error("Please select a location from the suggestions.");
      return;
    }
    setSaving(true);
    try {
      const results = await geocodeByPlaceId(selection.value.place_id);
      const { lat, lng } = await getLatLng(results[0]);
      const label = results?.[0]?.formatted_address || selection.label;

      const res = await fetch("/api/member/update-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          location: label,
          latitude: lat,
          longitude: lng,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to update location");
      toast.success("Location updated.");
      onClose();
      void router.push(buildMapFocusAfterSaveUrl(safeNextPath, lat, lng));
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Could not update location.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDontAskAgain() {
    setSkipping(true);
    try {
      const res = await fetch("/api/member/location-prompt-optout", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Could not save preference");
      toast.success("Got it — we won’t prompt you again.");
      onClose();
      void router.push(safeNextPath);
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Could not save preference.");
    } finally {
      setSkipping(false);
    }
  }

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-location-title"
      className="fixed inset-0 z-[100001] flex items-end sm:items-center justify-center sm:p-6"
      data-testid="update-location-overlay"
    >
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        data-testid="update-location-backdrop"
        onClick={() => {
          if (!saving && !skipping) onClose();
        }}
      />
      <div
        data-testid="update-location-modal"
        className="relative z-10 w-full sm:max-w-lg max-h-[min(88dvh,90vh)] overflow-y-auto rounded-t-2xl sm:rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 id="update-location-title" className="text-lg font-semibold text-gray-900 pr-2">
              Update your location
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || skipping}
              className="shrink-0 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
              aria-label="Close location editor"
            >
              Close
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-600 py-8 text-center" data-testid="update-location-loading">
              Loading…
            </p>
          ) : !authenticated ? (
            <div data-testid="update-location-signin-prompt">
              <p className="text-sm text-gray-600 mb-6">
                Please sign in first so we can verify your membership.
              </p>
              <Link
                href={`/signin?next=${encodeURIComponent(signInNext)}`}
                className="inline-flex w-full justify-center py-3 rounded-lg font-semibold uppercase text-xs tracking-wide bg-green-600 text-white hover:bg-green-700 transition-colors"
                onClick={onClose}
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              {displayName ? (
                <p className="text-sm text-gray-600 mb-4">
                  Signed in as <span className="font-semibold">{displayName}</span>.
                </p>
              ) : null}

              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                <p className="font-semibold text-gray-900">Set your map pin</p>
                <p className="mt-1">
                  Search for your city or region and pick a match from the list—do not type a
                  custom address unless it appears as a suggestion. This updates where you appear on
                  the map; name, bio, and organization are edited under{" "}
                  <strong className="font-semibold text-gray-800">My profile</strong>.
                </p>
              </div>

              {forced && (
                <div
                  data-testid="update-location-forced-banner"
                  className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                >
                  <div className="text-sm font-semibold text-amber-900">
                    Action needed: add your location
                  </div>
                  <div className="mt-1 text-sm text-amber-800">
                    Members need a confirmed location to find you on the map. Choose “Don’t ask
                    again” only if you prefer not to be prompted.
                  </div>
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <GooglePlacesAutocomplete
                apiKey={googleApiKey}
                selectProps={{
                  value: selection,
                  onChange: setSelection,
                  placeholder: "Start typing your city…",
                  isClearable: true,
                  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
                  styles: {
                    menuPortal: (base) => ({ ...base, zIndex: 100002 }),
                  },
                }}
              />

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  data-testid="save-location-btn"
                  onClick={handleSave}
                  disabled={saving || skipping}
                  className="flex-1 py-3 rounded-lg font-semibold uppercase text-xs tracking-wide bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  {saving ? "Saving…" : "Save location"}
                </button>
                {forced ? (
                  <button
                    type="button"
                    data-testid="dont-ask-again-btn"
                    onClick={handleDontAskAgain}
                    disabled={skipping || saving}
                    className="py-3 px-4 rounded-lg font-semibold uppercase text-xs tracking-wide bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors disabled:opacity-60 min-h-[44px]"
                  >
                    {skipping ? "Saving…" : "Don’t ask again"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving || skipping}
                    className="py-3 px-4 rounded-lg font-semibold uppercase text-xs tracking-wide bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors disabled:opacity-60 min-h-[44px]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
