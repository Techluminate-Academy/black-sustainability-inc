"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import GooglePlacesAutocomplete, {
  geocodeByPlaceId,
  getLatLng,
} from "react-google-places-autocomplete";

type SessionResp =
  | { authenticated: false; user: null }
  | { authenticated: true; user: { email: string; mightyId: number; firstName?: string | null; lastName?: string | null } };

export default function UpdateLocationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const [selection, setSelection] = useState<any>(null);

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = (await res.json()) as SessionResp;
        if (!cancelled) setSession(data);
      } catch {
        if (!cancelled) setSession({ authenticated: false, user: null });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(() => {
    if (!session || !("authenticated" in session) || !session.authenticated) return "";
    const f = session.user?.firstName ? String(session.user.firstName).trim() : "";
    return f || session.user.email;
  }, [session]);

  const nextPath = useMemo(() => {
    const raw = searchParams?.get("next") || "/";
    // Only allow relative paths for safety.
    return raw.startsWith("/") ? raw : "/";
  }, [searchParams]);

  const isForced = useMemo(() => {
    return (searchParams?.get("forced") || "") === "1";
  }, [searchParams]);

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
      router.push(nextPath || "/");
    } catch (e: any) {
      toast.error(e?.message || "Could not update location.");
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
      router.push(nextPath || "/");
    } catch (e: any) {
      toast.error(e?.message || "Could not save preference.");
    } finally {
      setSkipping(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f4]">
        <div className="text-gray-700 text-sm">Loading…</div>
      </div>
    );
  }

  if (!session || !session.authenticated) {
    return (
      <>
        <Head>
          <title>Update Location — BSN Member Map</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-[#f6f7f4] px-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Update your location</h1>
            <p className="text-sm text-gray-600 mb-6">
              Please sign in first so we can verify your membership.
            </p>
            <Link
              href="/signin?next=/update-location"
              className="inline-flex w-full justify-center py-3 rounded-lg font-semibold uppercase text-xs tracking-wide bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Sign in
            </Link>
            <p className="mt-6 text-center text-sm text-gray-500">
              <Link href="/" className="text-green-700 font-medium hover:underline">
                ← Back to map
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Update Location — BSN Member Map</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f4] px-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Update your location</h1>
          <p className="text-sm text-gray-600 mb-4">
            Signed in as <span className="font-semibold">{displayName}</span>.
          </p>

          {isForced && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-sm font-semibold text-amber-900">
                Action needed: add your location
              </div>
              <div className="mt-1 text-sm text-amber-800">
                To appear correctly on the BSN map/directory, please confirm your location.
                You can also choose “Don’t ask again” if you’d rather skip this.
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <GooglePlacesAutocomplete
            apiKey={googleApiKey}
            selectProps={{
              value: selection,
              onChange: setSelection,
              placeholder: "Start typing your city…",
              isClearable: true,
            }}
          />

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-lg font-semibold uppercase text-xs tracking-wide bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save location"}
            </button>
            {isForced ? (
              <button
                type="button"
                onClick={handleDontAskAgain}
                disabled={skipping || saving}
                className="py-3 px-4 rounded-lg font-semibold uppercase text-xs tracking-wide bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                {skipping ? "Saving…" : "Don’t ask again"}
              </button>
            ) : (
              <Link
                href={nextPath || "/"}
                className="py-3 px-4 rounded-lg font-semibold uppercase text-xs tracking-wide bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

