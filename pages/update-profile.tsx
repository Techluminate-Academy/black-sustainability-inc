// pages/updateProfilePage.tsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
// Make sure this path matches your project structure
import BSNUpdateProfileForm, { InitialData } from "@/pages/BSNUpdateProfileForm";

export default function UpdateProfilePage() {
  // Form’s initial data (once loaded)
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Helper to read & decode a cookie by name
  function getCookie(name: string): string {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
    return match ? decodeURIComponent(match[2]) : "";
  }

  useEffect(() => {
    // ── 1) MOCK YOUR LOGGED-IN USER COOKIE ────────────────────────────────
    const mockUser = {
      _id:         "e10efef3-e3ce-455a-bb6f-18f711f04b8f",
      contactId:   "e10efef3-e3ce-455a-bb6f-18f711f04b8f",
      loginEmail:  "jerry@techluminateacademy.com",
      profile: {
        nickname:     "Jerry Bony",
        slug:         "jerry",
        profilePhoto: {
          id:  "",
          url: "https://img.icons8.com/ios-filled/50/000000/user-male-circle.png",
          height: 0,
          width:  0,
        },
      },
      contactDetails: {
        contactId:   "e10efef3-e3ce-455a-bb6f-18f711f04b8f",
        firstName:   "Jerry",
        lastName:    "Bony",
        phones:      [],
        emails:      [],
        addresses:   [],
        customFields:{},
      },
      activityStatus:  "ACTIVE",
      privacyStatus:   "PUBLIC",
      status:          "APPROVED",
      lastLoginDate:   "2025-04-26T19:27:44Z",
      _createdDate:    "2024-12-12T23:43:07Z",
      _updatedDate:    "2024-12-12T23:43:07.711Z",
    };

    document.cookie = `bsn_user=${encodeURIComponent(
      JSON.stringify(mockUser)
    )}; path=/; max-age=${60 * 60 * 24 * 7}`; // valid for 7 days

    // ── 2) NOW FETCH THE USER’S RECORD ─────────────────────────────────
    (async () => {
      try {
        const rawCookie = getCookie("bsn_user");
        if (!rawCookie) {
          throw new Error("bsn_user cookie not found");
        }

        // You could JSON.parse(rawCookie) here to double-check,
        // but your API on the server re-reads and parses it itself.

        const resp = await axios.get("/api/getRecordByEmail");
        if (!resp.data.success) {
          throw new Error(resp.data.message || "Unknown API error");
        }

        const record = resp.data.data;
        const f = record.fields || {};

        // ── TRANSFORM INTO YOUR FORM’S INITIAL SHAPE ────────────────
        // Strip all '+' characters and then split off leading '1' if US
        const rawPhone = (f["PHONE US/CAN ONLY"] ?? "")
          .toString()
          .replace(/\+/g, "");
        const isUS = rawPhone.startsWith("1");
        const phoneCountryCode = isUS ? "+1-us" : "+1-us";
        const phone = isUS ? rawPhone.slice(1) : rawPhone;

        const transformed: InitialData = {
          email:            f["EMAIL ADDRESS"]           ?? "",
          firstName:        f["FIRST NAME"]              ?? "",
          lastName:         f["LAST NAME"]               ?? "",
          memberLevel:      (f["MEMBER LEVEL"]?.[0] as string) ?? "",
          bio:              f["BIO"]                     ?? "",
          organizationName: f["ORGANIZATION NAME"]       ?? "",
          affiliatedEntity: f["AFFILIATED ENTITY"]       ?? "",
          photo:            null,
          photoUrl: Array.isArray(f.PHOTO) ? f.PHOTO[0].url : "",
          logo:             null,
          logoUrl:          Array.isArray(f.LOGO) ? f.LOGO[0].url : "",
          identification:   f["IDENTIFICATION"]          ?? "",
          gender:           f["GENDER"]                  ?? "",
          website:          f["WEBSITE"]                 ?? "",
          phoneCountryCode,
          phone,
          additionalFocus:  f["ADDITIONAL FOCUS AREAS"]  ?? [],
          primaryIndustry:  f["PRIMARY INDUSTRY HOUSE"]  ?? "",
          address:          f["Address"]                 ?? "",
          zipCode:          f["Zip/Postal Code"]         ?? 0,
          youtube:          f["YOUTUBE"]                 ?? "",
          nearestCity:      f["Location (Nearest City)"] ?? "",
          nameFromLocation: f["Name (from Location)"]    ?? "",
          fundingGoal:      f["FUNDING GOAL"]            ?? "",
          similarCategories:f["Similar Categories"]      ?? [],
          naicsCode:        f["NAICS Code"]              ?? "",
          includeOnMap:     Boolean(f["Featured"]),
          latitude:         f["Latitude"]  ? parseFloat(f["Latitude"])  : null,
          longitude:        f["Longitude"] ? parseFloat(f["Longitude"]) : null,
          showDropdown:     false,
          phoneCountryCodeTouched: false,

          // The two IDs your form needs:
          id:         record.airtableId as string,
          airtableId: record.airtableId as string,
        };

        setInitialData(transformed);
      } catch (err: any) {
        console.error("load record error:", err);
        setError(err.message || "Failed to load record");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div>Loading profile data…</div>;
  }
  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }
  if (!initialData) {
    return <div>No profile data found.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav isAuthenticated={true} authenticatedUser={initialData.email} />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-100 py-12">
        <h1 className="text-3xl font-bold mb-6">Update Your Profile</h1>
        <div className="w-full max-w-3xl">
          <BSNUpdateProfileForm initialData={initialData} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
