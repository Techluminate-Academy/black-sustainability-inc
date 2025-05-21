"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
import BSNUpdateProfileForm, { InitialData } from "@/pages/BSNUpdateProfileForm";

export default function UpdateProfilePage() {
  const router = useRouter();
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [parsedUser, setParsedUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
  }

  useEffect(() => {
    // 1) Read & parse the user cookie
    const rawCookie = getCookie("bsn_user_data");
    if (!rawCookie) {
      router.replace("/");
      return;
    }

    let user;
    try {
      user = JSON.parse(rawCookie);
    } catch {
      router.replace("/");
      return;
    }

    setParsedUser(user);
    setIsAuthenticated(true);

    // 2) Fetch the user’s Airtable record
    (async () => {
      try {
        const resp = await axios.get("/api/getRecordByEmail");
        if (!resp.data.success) {
          throw new Error(resp.data.message || "Unknown API error");
        }

        const record = resp.data.data;
        const f = record.fields || {};

        // Transform into InitialData shape
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
          photoUrl:         Array.isArray(f.PHOTO) ? f.PHOTO[0].url : "",
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
  }, [router]);

  // ← Replace the plain text loader with this spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <svg
          className="animate-spin h-12 w-12 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }
  if (!initialData) {
    return <div>No profile data found.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav isAuthenticated={isAuthenticated} authenticatedUser={parsedUser} />
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
