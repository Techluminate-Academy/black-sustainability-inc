// features/freeSignup/freeSignupService.ts

import axios from "axios";
import AirtableUtils from "@/features/freeSignup/airtableUtils";

export interface FreeSubmissionPayload {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  primaryIndustry: string;
  organizationName?: string;
  bio?: string;
  photoUrl?: string;
  logoUrl?: string;
}

/**
 * Sends a "free sign-up" record to Airtable.
 * We must pass the exact single-select option name for the "Featured" field.
 */
export async function sendToAirtable(data: FreeSubmissionPayload): Promise<void> {
  const airtableFields: Record<string, any> = {
    "FIRST NAME": data.firstName,
    "LAST NAME": data.lastName,
    "EMAIL ADDRESS": data.email,
    "PRIMARY INDUSTRY HOUSE": data.primaryIndustry,
    Address: data.address,
    Latitude: data.latitude !== undefined && data.latitude !== null ? String(data.latitude) : "",
    Longitude: data.longitude !== undefined && data.longitude !== null ? String(data.longitude) : "",
    "Membership Status Notes": "Free",
  };

  if (data.organizationName) {
    airtableFields["ORGANIZATION NAME"] = data.organizationName;
  }
  if (data.bio) {
    airtableFields["BIO"] = data.bio;
  }
  if (data.photoUrl) {
    airtableFields["PHOTO"] = [{ url: data.photoUrl }];
  }
  if (data.logoUrl) {
    airtableFields["LOGO"] = [{ url: data.logoUrl }];
  }

  await AirtableUtils.submitToAirtable(airtableFields);
}

export const uploadFile = async (file: File): Promise<string> => {
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
};
