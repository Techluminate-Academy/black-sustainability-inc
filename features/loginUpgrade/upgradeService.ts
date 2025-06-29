import axios from "axios";
import AirtableUtils from "@/pages/api/submitForm";
import { UpgradeFormData } from "./types";

export interface UpgradeAirtableFields {
  "EMAIL ADDRESS": string;
  "FIRST NAME": string;
  "LAST NAME": string;
  "MEMBER LEVEL": string[];
  "BIO": string;
  "ORGANIZATION NAME": string;
  "IDENTIFICATION": string;
  "GENDER": string;
  "WEBSITE": string;
  "PHONE US/CAN ONLY": string;
  "PRIMARY INDUSTRY HOUSE": string;
  "ADDITIONAL FOCUS AREAS": string[];
  "AFFILIATED ENTITY": string;
  "Zip/Postal Code": number;
  "YOUTUBE": string;
  "Location (Nearest City)": string;
  "Name (from Location)": string;
  "FUNDING GOAL": string;
  "Similar Categories": string[];
  "NAICS Code": string;
  "Featured": boolean;
  "Latitude": string;
  "Longitude": string;
  "Address": string;
  "MembershipType": string;
  "PHOTO"?: { url: string; filename: string }[];
  "LOGO"?: { url: string; filename: string }[];
}

/**
 * Maps form data to Airtable fields for paid membership submission
 */
export function mapUpgradeFormToAirtableFields(formData: UpgradeFormData): UpgradeAirtableFields {
  // Extract the dial code from the stored value (e.g., from "+1-us" get "+1")
  const dialCode = formData.phoneCountryCode.split("-")[0];
  const fullPhone = dialCode + formData.phone;

  const airtableFields: UpgradeAirtableFields = {
    "EMAIL ADDRESS": formData.email,
    "FIRST NAME": formData.firstName,
    "LAST NAME": formData.lastName,
    "MEMBER LEVEL": [formData.memberLevel],
    "BIO": formData.bio,
    "ORGANIZATION NAME": formData.organizationName,
    "IDENTIFICATION": formData.identification,
    "GENDER": formData.gender,
    "WEBSITE": formData.website,
    "PHONE US/CAN ONLY": fullPhone,
    "PRIMARY INDUSTRY HOUSE": formData.primaryIndustry,
    "ADDITIONAL FOCUS AREAS": formData.additionalFocus,
    "AFFILIATED ENTITY": formData.affiliatedEntity,
    "Zip/Postal Code": formData.zipCode,
    "YOUTUBE": formData.youtube,
    "Location (Nearest City)": formData.nearestCity,
    "Name (from Location)": formData.nameFromLocation,
    "FUNDING GOAL": formData.fundingGoal,
    "Similar Categories": formData.similarCategories.filter(
      (cat) => cat && cat.trim() !== ""
    ),
    "NAICS Code": formData.naicsCode,
    "Featured": formData.includeOnMap,
    "Latitude": formData.latitude !== null ? formData.latitude.toString() : "",
    "Longitude": formData.longitude !== null ? formData.longitude.toString() : "",
    "Address": formData.address,
    "MembershipType": "Paid", // This distinguishes from free signups
  };

  return airtableFields;
}

/**
 * Submits upgraded membership data to the main Airtable
 */
export async function submitUpgrade(formData: UpgradeFormData, photoUrl?: string, logoUrl?: string): Promise<void> {
  const airtableFields = mapUpgradeFormToAirtableFields(formData);

  // Add photo if available
  if (photoUrl) {
    airtableFields["PHOTO"] = [{
      url: photoUrl,
      filename: formData.photo?.name || "profile-photo.jpg"
    }];
  }

  // Add logo if available
  if (logoUrl) {
    airtableFields["LOGO"] = [{
      url: logoUrl,
      filename: formData.logo?.name || "organization-logo.jpg"
    }];
  }

  await AirtableUtils.submitToAirtable(airtableFields);
}

/**
 * Uploads file to Cloudinary
 */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    const response = await axios.post("/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
} 