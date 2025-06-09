// features/freeSignup/freeSignupService.ts

import axios from "axios";
import AirtableUtils from "@/features/freeSignup/airtableUtils";

export interface FreeSubmissionPayload {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  primaryIndustry: string;
  organizationName?: string;
  bio?: string;
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
    Latitude: data.latitude,      // still a number
    Longitude: data.longitude,    // still a number

    // Since Featured is defined as a "Single select" in your base, 
    // use exactly the option label (e.g. "checked" or whatever your option is called).
    "Featured": "checked",
  };

  if (data.organizationName) {
    airtableFields["ORGANIZATION NAME"] = data.organizationName;
  }
  if (data.bio) {
    airtableFields["BIO"] = data.bio;
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
