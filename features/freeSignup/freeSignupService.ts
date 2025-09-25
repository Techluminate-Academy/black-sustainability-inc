// features/freeSignup/freeSignupService.ts

import axios from "axios";
import AirtableUtils from "@/features/freeSignup/airtableUtils";
import { FreeSubmissionPayload } from "./types";

/**
 * Sends a "free sign-up" record to Airtable.
 * We must pass the exact single-select option name for the "Featured" field.
 */
export async function sendToAirtable(data: FreeSubmissionPayload): Promise<void> {
  const airtableFields: Record<string, any> = {
    "FIRST NAME": data.firstName,
    "LAST NAME": data.lastName,
    "EMAIL ADDRESS": data.email,
    Address: data.address,
    Latitude: data.latitude !== undefined && data.latitude !== null ? data.latitude.toString() : undefined,
    Longitude: data.longitude !== undefined && data.longitude !== null ? data.longitude.toString() : undefined,
  };

  // Only add primaryIndustry if it's not empty
  if (data.primaryIndustry && data.primaryIndustry.trim() !== "") {
    airtableFields["PRIMARY INDUSTRY HOUSE"] = data.primaryIndustry;
  }

  if (data.organizationName && data.organizationName.trim() !== "") {
    airtableFields["ORGANIZATION NAME"] = data.organizationName;
  }
  if (data.bio && data.bio.trim() !== "") {
    airtableFields["BIO"] = data.bio;
  }
  if (data.photoUrl) {
    airtableFields["PHOTO"] = [{ url: data.photoUrl }];
  }
  if (data.logoUrl) {
    airtableFields["LOGO"] = [{ url: data.logoUrl }];
  }
  if (data.affiliatedEntity && data.affiliatedEntity.trim() !== "") {
    airtableFields["AFFILIATED ENTITY"] = data.affiliatedEntity;
  }
  
  airtableFields["Membership Status Notes"] = "Free";

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
