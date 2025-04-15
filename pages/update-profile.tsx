"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Nav from "@/components/layouts/Nav";
import Footer from "@/components/layouts/Footer";
import BSNUpdateProfileForm from "@/pages/BSNUpdateProfileForm"; // Ensure this path matches your project structure

// Define the FormData interface (should match what BSNUpdateProfileForm expects)
export interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  memberLevel: string;
  bio: string;
  organizationName: string;
  affiliatedEntity: string;
  photo: File | null;
  photoUrl?: string;
  logo: File | null;
  logoUrl?: string;
  identification: string;
  gender: string;
  website: string;
  phoneCountryCode: string;
  phone: string;
  additionalFocus: string[];
  primaryIndustry: string;
  address: string;
  zipCode: number;
  youtube: string;
  nearestCity: string;
  nameFromLocation: string;
  fundingGoal: string;
  similarCategories: string[];
  naicsCode: string;
  includeOnMap: boolean;
  latitude: number | null;
  longitude: number | null;
  showDropdown?: boolean;
  phoneCountryCodeTouched: boolean;
}

export default function UpdateProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Use a dummy Airtable record id for testing
  const airtableId = "recyBLdfpSIMTFV8J";
  const [initialData, setInitialData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await axios.get(
          `/api/getSingleRecord?airtableId=${airtableId}`
        );
        if (response.data.success) {
          // 'data' is the entire record from MongoDB
          // The actual user properties are nested in record.fields
          const record = response.data.data;  // The entire document
          const fields = record.fields || {};
  
          // Transform into the shape your form expects:
          const transformed: FormData = {
            email: fields["EMAIL ADDRESS"] || "",
            firstName: fields["FIRST NAME"] || "",
            lastName: fields["LAST NAME"] || "",
            memberLevel: "",
            bio: fields["BIO"] || "",
            organizationName: fields["ORGANIZATION NAME"] || "",
            affiliatedEntity: fields["AFFILIATED ENTITY"] || "",
            photo: null,
            photoUrl: "",         // You could parse photo attachments if you want
            logo: null,
            logoUrl: "",
            identification: fields["IDENTIFICATION"] || "",
            gender: fields["GENDER"] || "",
            website: fields["WEBSITE"] || "",
            phoneCountryCode: "+1-us", // Or parse from fields["PHONE US/CAN ONLY"] if you want
            phone: fields["PHONE US/CAN ONLY"] || "",
            additionalFocus: fields["ADDITIONAL FOCUS AREAS"] || [],
            primaryIndustry: fields["PRIMARY INDUSTRY HOUSE"] || "",
            address: fields["Address"] || "",
            zipCode: fields["Zip/Postal Code"] || 0,
            youtube: fields["YOUTUBE"] || "",
            nearestCity: fields["Location (Nearest City)"] || "",
            nameFromLocation: fields["Name (from Location)"] || "",
            fundingGoal: fields["FUNDING GOAL"] || "",
            similarCategories: fields["Similar Categories"] || [],
            naicsCode: fields["NAICS Code"] || "",
            includeOnMap: !!fields["Featured"],
            latitude: fields["Latitude"] ? parseFloat(fields["Latitude"]) : null,
            longitude: fields["Longitude"] ? parseFloat(fields["Longitude"]) : null,
            showDropdown: false,
            phoneCountryCodeTouched: false,
          };
  
          setInitialData(transformed);
        } else {
          console.error("Record not found:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching record:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchRecord();
  }, [airtableId]);
  
  if (loading) {
    return <div>Loading profile data...</div>;
  }
  if (!initialData) {
    return (
      <div>Error loading profile. Please try again later or contact support.</div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* <Nav isAuthenticated={true} authenticatedUser={initialData.email} /> */}
      <main className="flex flex-col items-center justify-center flex-1 bg-gray-100 py-12">
        <h1 className="text-3xl font-bold mb-6">Update Your Profile</h1>
        {/* Pass the initialData to the update form component */}
        <BSNUpdateProfileForm initialData={initialData} />
      </main>
      <Footer />
    </div>
  );
}
