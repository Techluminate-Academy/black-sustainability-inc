// pages/updateProfilePage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
// Import the shared form component and its InitialData type
import BSNUpdateProfileForm, { InitialData } from "@/pages/BSNUpdateProfileForm";

export default function UpdateProfilePage() {
  const router = useRouter();
  // useSearchParams() can be null, so we use optional chaining + a fallback
  const searchParams = useSearchParams();
  const airtableId = searchParams?.get("airtableId") ?? "recyBLdfpSIMTFV8J";

  // State now typed to the superset InitialData (includes id & airtableId)
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchRecord() {
      setLoading(true);
      try {
        const response = await axios.get(
          `/api/getSingleRecord?airtableId=${airtableId}`
        );
        if (!response.data.success) {
          console.error("Record not found:", response.data.message);
          return;
        }

        const record = response.data.data;
        const fields = record.fields || {};

        // Build an InitialData object: all your FormData fields + the two IDs
        const transformed: InitialData = {
          email:            fields["EMAIL ADDRESS"]           ?? "",
          firstName:        fields["FIRST NAME"]              ?? "",
          lastName:         fields["LAST NAME"]               ?? "",
          memberLevel:      (fields["MEMBER LEVEL"]?.[0] as string) ?? "",
          bio:              fields["BIO"]                     ?? "",
          organizationName: fields["ORGANIZATION NAME"]       ?? "",
          affiliatedEntity: fields["AFFILIATED ENTITY"]       ?? "",
          photo:            null,
          photoUrl:         "",
          logo:             null,
          logoUrl:          "",
          identification:   fields["IDENTIFICATION"]          ?? "",
          gender:           fields["GENDER"]                  ?? "",
          website:          fields["WEBSITE"]                 ?? "",
          phoneCountryCode: "+1-us",
          phone:            `${fields["PHONE US/CAN ONLY"] ?? ""}`.replace(/^\+/, ""),
          additionalFocus:  fields["ADDITIONAL FOCUS AREAS"]  ?? [],
          primaryIndustry:  fields["PRIMARY INDUSTRY HOUSE"]  ?? "",
          address:          fields["Address"]                 ?? "",
          zipCode:          fields["Zip/Postal Code"]         ?? 0,
          youtube:          fields["YOUTUBE"]                 ?? "",
          nearestCity:      fields["Location (Nearest City)"] ?? "",
          nameFromLocation: fields["Name (from Location)"]    ?? "",
          fundingGoal:      fields["FUNDING GOAL"]            ?? "",
          similarCategories:fields["Similar Categories"]      ?? [],
          naicsCode:        fields["NAICS Code"]              ?? "",
          includeOnMap:     Boolean(fields["Featured"]),
          latitude:         fields["Latitude"]
                               ? parseFloat(fields["Latitude"])
                               : null,
          longitude:        fields["Longitude"]
                               ? parseFloat(fields["Longitude"])
                               : null,
          showDropdown:     false,
          phoneCountryCodeTouched: false,

          // **The two record IDs** required by the form
          id:           record.id,
          airtableId:   record.id,
        };

        setInitialData(transformed);
      } catch (error) {
        console.error("Error fetching record:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecord();
  }, [airtableId]);

  if (loading) {
    return <div>Loading profile data…</div>;
  }
  if (!initialData) {
    return <div>Error loading profile. Please try again later.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* You can wire up Nav with the user’s email */}
      <Nav isAuthenticated={true} authenticatedUser={initialData.email} />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-100 py-12">
        <h1 className="text-3xl font-bold mb-6">Update Your Profile</h1>
        <div className="w-full max-w-3xl">
          {/* Pass the fully-typed InitialData into your form */}
          <BSNUpdateProfileForm initialData={initialData} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
