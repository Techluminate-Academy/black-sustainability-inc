"use client";

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import axios from "axios";
import GooglePlacesAutocomplete, {
  geocodeByPlaceId,
  getLatLng,
} from "react-google-places-autocomplete";
import { geocodeAddress } from "@/utils/geocode.js"; // <-- Our geocoding helper
import AirtableUtils from "@/pages/api/submitForm";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
// Import allCountries from country-telephone-data
import Image from 'next/image';
import { allCountries } from "country-telephone-data";
import logo from '@/public/png/bsn-logo.png'
import CountryCodeDropdown from "../../components/CountryCodeDropdown/CountryCodeDropdown";
import { HARDCODED_MEMBER_LEVELS } from '@/constants/member-levels';
import MembershipOptions from '@/features/loginUpgrade/MembershipOptions';

// 1. TYPES & INTERFACES
interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  memberLevel: string;
  bio: string;
  organizationName: string;
  affiliatedEntity: string;
  photo: File | null;
  photoUrl?: string; // URL returned from Cloudinary
  logo: File | null;
  logoUrl?: string;  // URL returned from Cloudinary
  identification: string;
  gender: string;
  website: string;
  // New fields for phone international code and number
  phoneCountryCode: string;
  phone: string;
  additionalFocus: string[];
  primaryIndustry: string;
  // locationCountry: string;  // e.g. "United States"
  // locationCity: string;     // e.g. "Chicago, IL, USA"
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
  showDropdown?: boolean; // For dropdown visibility
  phoneCountryCodeTouched: boolean,
}

interface AirtableFields {
  "EMAIL ADDRESS": string;
  "FIRST NAME": string;
  "LAST NAME": string;
  "MEMBER LEVEL"?: string[];
  "BIO": string;
  "ORGANIZATION NAME": string;
  "IDENTIFICATION"?: string;
  "GENDER"?: string;
  "WEBSITE"?: string;
  "PHONE US/CAN ONLY": string;
  "PRIMARY INDUSTRY HOUSE"?: string;
  "ADDITIONAL FOCUS AREAS": string[];
  "AFFILIATED ENTITY"?: string;
  "Zip/Postal Code": number;
  "YOUTUBE"?: string;
  "Location (Nearest City)"?: string;
  "Name (from Location)"?: string;
  "FUNDING GOAL"?: string;
  "Similar Categories": string[];
  "NAICS Code": string;
  "Featured": boolean;
  "Latitude": string;
  "Longitude": string;
  "Address": string;
  "PHOTO"?: { url: string; filename: string }[];
  "LOGO"?: { url: string; filename: string }[];
}

interface Country {
  name: string;
  dialCode: string;
  iso2: string;
}

// Helper function to format phone numbers as (XXX) XXX-XXXX
const formatPhoneNumber = (phoneNumber: string) => {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phoneNumber;
};

// 3. Map formData -> Airtable fields
const mapFormDataToAirtableFields = (formData: FormData): AirtableFields => {
  // Format the phone number
  const phoneNumber = formatPhoneNumber(formData.phone);

  const airtableFields: AirtableFields = {
    "EMAIL ADDRESS": formData.email,
    "FIRST NAME": formData.firstName,
    "LAST NAME": formData.lastName,
    "MEMBER LEVEL": formData.memberLevel ? [formData.memberLevel] : undefined,
    "BIO": formData.bio,
    "ORGANIZATION NAME": formData.organizationName,
    "PHONE US/CAN ONLY": phoneNumber,
    "ADDITIONAL FOCUS AREAS": formData.additionalFocus,
    "Zip/Postal Code": formData.zipCode,
    "Similar Categories": formData.similarCategories.filter(
      (cat) => cat && cat.trim() !== ""
    ),
    "NAICS Code": formData.naicsCode,
    "Featured": formData.includeOnMap,
    "Latitude": formData.latitude !== null ? formData.latitude.toString() : "",
    "Longitude": formData.longitude !== null ? formData.longitude.toString() : "",
    "Address": formData.address,
  };

  // Only include select fields if they have valid values (not empty strings)
  if (formData.identification && formData.identification.trim() !== "") {
    airtableFields["IDENTIFICATION"] = formData.identification;
  }
  if (formData.gender && formData.gender.trim() !== "") {
    airtableFields["GENDER"] = formData.gender;
  }
  if (formData.website && formData.website.trim() !== "") {
    airtableFields["WEBSITE"] = formData.website;
  }
  if (formData.primaryIndustry && formData.primaryIndustry.trim() !== "") {
    airtableFields["PRIMARY INDUSTRY HOUSE"] = formData.primaryIndustry;
  }
  if (formData.affiliatedEntity && formData.affiliatedEntity.trim() !== "") {
    airtableFields["AFFILIATED ENTITY"] = formData.affiliatedEntity;
  }
  if (formData.youtube && formData.youtube.trim() !== "") {
    airtableFields["YOUTUBE"] = formData.youtube;
  }
  if (formData.nearestCity && formData.nearestCity.trim() !== "") {
    airtableFields["Location (Nearest City)"] = formData.nearestCity;
  }
  if (formData.nameFromLocation && formData.nameFromLocation.trim() !== "") {
    airtableFields["Name (from Location)"] = formData.nameFromLocation;
  }
  if (formData.fundingGoal && formData.fundingGoal.trim() !== "") {
    airtableFields["FUNDING GOAL"] = formData.fundingGoal;
  }

  // Add photo if available
  if (formData.photoUrl) {
    airtableFields["PHOTO"] = [{
      url: formData.photoUrl,
      filename: formData.photo?.name || "profile-photo.jpg"
    }];
  }

  // Add logo if available
  if (formData.logoUrl) {
    airtableFields["LOGO"] = [{
      url: formData.logoUrl,
      filename: formData.logo?.name || "organization-logo.jpg"
    }];
  }

  return airtableFields;
};

// Helper to map country names to ISO Alpha-2 codes used by Google Places
function getCountryCode(countryName: string): string {
  const lower = countryName.toLowerCase();
  if (lower.includes("united states")) return "us";
  if (lower.includes("united kingdom")) return "gb";
  if (lower.includes("south africa")) return "za";
  if (lower.includes("nigeria")) return "ng";
  return "";
}
// You can source a full list using packages like "country-telephone-data" or "react-phone-input-2"
// Use the full list of countries from country-telephone-data to build dropdown options.
// Each object in allCountries has a "dialCode" and a "name".
// Define an interface for country data (adjust properties as needed)
// Define an interface for country data
interface CountryData {
  dialCode: string;
  iso2: string;
  name: string;
}

// Define the type for our transformed country options
interface CountryOption {
  value: string;
  label: string;
  iso2: string;
}

// Build the international options array with explicit types
const internationalOptions: CountryOption[] = allCountries.map((country: CountryData) => ({
  value: `+${country.dialCode}-${country.iso2}`,
  label: country.name,
  iso2: country.iso2,
}));

console.log(internationalOptions)
//
// 4. SUB-FORMS / STEPS
//

// Step1: Basic Info
const Step1: React.FC<{
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;
  handleFileChange: (field: keyof FormData, file: File | null) => void;
  phoneInputRef: React.RefObject<HTMLInputElement>;
  memberLevelOptions: { id: string; name: string; icon: string | null }[];
}> = ({ formData, handleInputChange, errors, handleFileChange, phoneInputRef, memberLevelOptions }) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email Address *</label>
        <p className="text-xs text-gray-500 mb-2">Please share your primary email address.</p>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">First Name *</label>
        <p className="text-xs text-gray-500 mb-2">What is your first name?</p>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => handleInputChange("firstName", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Last Name *</label>
        <p className="text-xs text-gray-500 mb-2">What is your last name/surname?</p>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => handleInputChange("lastName", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Member Level *</label>
        <p className="text-xs text-gray-500 mb-2">In what capacity are you joining this network?</p>
        <select
          value={formData.memberLevel}
          onChange={(e) => handleInputChange("memberLevel", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select</option>
          {memberLevelOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {errors.memberLevel && <p className="text-red-500 text-sm mt-1">{errors.memberLevel}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Bio / Profile *</label>
        <p className="text-xs text-gray-500 mb-2">Tell us about yourself and/or your organization.</p>
        <textarea
          value={formData.bio}
          onChange={(e) => handleInputChange("bio", e.target.value)}
          rows={4}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Photo *</label>
        <p className="text-xs text-gray-500 mb-2">Share your headshot and/or logo to complete your profile.</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange("photo", e.target.files?.[0] || null)}
          className="mt-1"
        />
        {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
        {formData.photoUrl && (
          <div className="mt-2">
            <img
              src={formData.photoUrl}
              alt="Current profile photo"
              className="w-24 h-24 object-cover rounded"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Logo</label>
        <p className="text-xs text-gray-500 mb-2">Drop files here</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange("logo", e.target.files?.[0] || null)}
          className="mt-1"
        />
        {formData.logoUrl && (
          <div className="mt-2">
            <img
              src={formData.logoUrl}
              alt="Current logo"
              className="w-24 h-24 object-cover rounded"
            />
          </div>
        )}
      </div>
    </>
  );
};

// Step2: Additional Info
const Step2: React.FC<{
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;
  identificationOptions: any[];
  genderOptions: any[];
  primaryIndustryOptions: any[];
  handleToggleFocus: (value: string) => void;
  additionalFocusOpen: boolean;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  phoneInputRef: React.RefObject<HTMLInputElement>;
}> = ({
  formData,
  handleInputChange,
  errors,
  identificationOptions,
  genderOptions,
  primaryIndustryOptions,
  handleToggleFocus,
  additionalFocusOpen,
  setFormData,
  phoneInputRef,
}) => {
  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Identification *</label>
        <select
          value={formData.identification}
          onChange={(e) => handleInputChange("identification", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select</option>
          {identificationOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {errors.identification && <p className="text-red-500 text-sm mt-1">{errors.identification}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Gender *</label>
        <select
          value={formData.gender}
          onChange={(e) => handleInputChange("gender", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select</option>
          {genderOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Website</label>
        <p className="text-xs text-gray-500 mb-2">Do you have a website? Share below.</p>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => handleInputChange("website", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <p className="text-xs text-gray-500 mb-2">
          OPTIONAL: we want to ensure you receive BSN membership info from us via email, then sms/text as a secondary option. 
          By providing your mobile phone number, you are agreeing to receive automated and personalized text messages with varying frequency. 
          Message and data rates may apply. You may opt out of receiving text messages at any time by relying STOP. 
          Please view our Terms & Conditions and Privacy Policy at www.blacksustainability.org/terms-of-use.
        </p>
        <div className="flex w-full">
          <CountryCodeDropdown
            value={formData.phoneCountryCode}
            onChange={(value) => handleInputChange("phoneCountryCode", value)}
            options={internationalOptions}
          />
          <input
            ref={phoneInputRef}
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="13125811589"
            autoComplete="off"
          />
        </div>
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Primary Industry House *</label>
        <p className="text-xs text-gray-500 mb-2">What is your primary field of EXPERTISE?</p>
        <select
          value={formData.primaryIndustry}
          onChange={(e) => handleInputChange("primaryIndustry", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select</option>
          {primaryIndustryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {errors.primaryIndustry && <p className="text-red-500 text-sm mt-1">{errors.primaryIndustry}</p>}
      </div>

      <div className="space-y-2 relative">
        <label className="block text-sm font-medium text-gray-700">Additional Focus Areas</label>
        <p className="text-xs text-gray-500 mb-2">If you have additional areas of expertise/interest, select all below.</p>
        <div
          className="w-full border border-gray-300 rounded-lg p-2 cursor-pointer"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              showDropdown: !prev.showDropdown,
            }))
          }
        >
          <div className="flex flex-wrap gap-2">
            {formData.additionalFocus.map((focus) => (
              <span
                key={focus}
                className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full cursor-pointer"
                onClick={(evt) => {
                  evt.stopPropagation();
                  handleToggleFocus(focus);
                }}
              >
                {focus} ✕
              </span>
            ))}
          </div>
        </div>
        {formData.showDropdown && (
          <div className="absolute z-10 bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-auto w-full">
            {[
              "☀️ Alternative Energy",
              "🌾 Agriculture/Sustainable Food Production / Land Management",
              "🏘 Community Development",
              "🛖 Eco-friendly Building",
              "💰 Alternative Economics",
              "🧑🏾‍🏫 Education & Cultural Preservation",
              "Environmental Justice/Advocacy",
              "♻️ Green Lifestyle",
              "🆘 Survival/Preparedness",
              "🗑 Waste",
              "💧Water",
              "🧘🏿‍♀️ Wholistic Health"
            ].map((focus) => (
              <div
                key={focus}
                className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleToggleFocus(focus)}
              >
                {focus}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// Step3: Location & Categories
const Step3: React.FC<{
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;
  nameFromLocationOptions: any[];
  similarCategoriesOptions: any[];
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleCategory: (field: keyof FormData, value: string) => void;
}> = ({
  formData,
  handleInputChange,
  errors,
  nameFromLocationOptions,
  similarCategoriesOptions,
  showDropdown,
  setShowDropdown,
  handleToggleCategory,
}) => {
  const [googleApiKey, setGoogleApiKey] = useState("");

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      setGoogleApiKey(apiKey);
    } else {
      console.error("Google Maps API key not found.");
    }
  }, []);

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Location (Country) *</label>
        <p className="text-xs text-gray-500 mb-2">Where in the world are you?</p>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => handleInputChange("address", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Location (City) *</label>
        <p className="text-xs text-gray-500 mb-2">Share the name of the city where you live so others can link with you.</p>
        {googleApiKey ? (
          <GooglePlacesAutocomplete
            apiKey={googleApiKey}
            selectProps={{
              value: formData.nearestCity
                ? { label: formData.nearestCity, value: formData.nearestCity }
                : null,
              onChange: async (selection) => {
                if (selection) {
                  handleInputChange("nearestCity", selection.label);
                  try {
                    const placeId = selection.value.place_id;
                    const results = await geocodeByPlaceId(placeId);
                    const { lat, lng } = await getLatLng(results[0]);
                    handleInputChange("latitude", lat);
                    handleInputChange("longitude", lng);
                  } catch (error) {
                    console.error("Error getting lat/lng from address", error);
                  }
                } else {
                  handleInputChange("nearestCity", "");
                  handleInputChange("latitude", null);
                  handleInputChange("longitude", null);
                }
              },
              placeholder: "Start typing your city...",
              styles: {
                input: (provided: any) => ({
                  ...provided,
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                }),
                option: (provided: any, state: any) => ({
                  ...provided,
                  backgroundColor: state.isFocused ? "#e0e7ff" : "white",
                  color: "black",
                }),
              },
            }}
          />
        ) : (
          <div className="mt-1 w-full border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-500">
            Loading map...
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Zip/Postal Code</label>
        <p className="text-xs text-gray-500 mb-2">Enter your zip code/postal code if available. This will allow other members to find you geographically.</p>
        <input
          type="text"
          value={formData.zipCode === 0 ? "" : formData.zipCode}
          onChange={(e) => {
            const numericValue = parseInt(e.target.value, 10);
            handleInputChange("zipCode", isNaN(numericValue) ? 0 : numericValue);
          }}
          placeholder="e.g., 60628"
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.zipCode && <span className="text-red-500 text-sm">{errors.zipCode}</span>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">YouTube</label>
        <p className="text-xs text-gray-500 mb-2">Do you have a video to share/showcase your work with other members?</p>
        <input
          type="url"
          value={formData.youtube}
          onChange={(e) => handleInputChange("youtube", e.target.value)}
          placeholder="Enter YouTube link"
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.youtube && <p className="text-red-500 text-sm mt-1">{errors.youtube}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Location (Nearest City)</label>
        <input
          type="text"
          value={formData.nearestCity}
          onChange={(e) => handleInputChange("nearestCity", e.target.value)}
          placeholder="Enter nearest city"
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.nearestCity && <p className="text-red-500 text-sm mt-1">{errors.nearestCity}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Name (from Location)</label>
        <select
          value={formData.nameFromLocation}
          onChange={(e) => handleInputChange("nameFromLocation", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Find an option</option>
          {nameFromLocationOptions.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Funding Goal</label>
        <p className="text-xs text-gray-500 mb-2">Are you working on a project that needs funding? Share your goal - we may be able to support you!</p>
        <textarea
          value={formData.fundingGoal}
          onChange={(e) => handleInputChange("fundingGoal", e.target.value)}
          placeholder="Any project that needs funding..."
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.fundingGoal && <span className="text-red-500 text-sm">{errors.fundingGoal}</span>}
      </div>

      <div className="space-y-2 relative">
        <label className="block text-sm font-medium text-gray-700">Similar Categories</label>
        <div
          className="w-full border border-gray-300 rounded-lg p-2 cursor-pointer"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div className="flex flex-wrap gap-2">
            {formData.similarCategories.map((category) => (
              <span
                key={category}
                className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full cursor-pointer"
                onClick={(evt) => {
                  evt.stopPropagation();
                  handleToggleCategory("similarCategories", category);
                }}
              >
                {category} ✕
              </span>
            ))}
          </div>
        </div>
        {showDropdown && (
          <div className="absolute z-10 bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-auto w-full">
            {similarCategoriesOptions.map((option) => (
              <div
                key={option.id}
                className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleToggleCategory("similarCategories", option.name)}
              >
                {option.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">NAICS Code</label>
        <p className="text-xs text-gray-500 mb-2">
          If you want to be considered for collaborative opportunities, please share your NAICS code(s). List in order of priority focus.
        </p>
        <input
          type="text"
          value={formData.naicsCode}
          onChange={(e) => handleInputChange("naicsCode", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.naicsCode && <p className="text-red-500 text-sm mt-1">{errors.naicsCode}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Include me on Global BSN Map</label>
        <p className="text-xs text-gray-500 mb-4">Check the box to be included. Leave blank if you do NOT want to be on the map</p>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeOnMap"
            checked={formData.includeOnMap}
            onChange={(e) => handleInputChange("includeOnMap", e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Affiliated Entity</label>
        <p className="text-xs text-gray-500 mb-2">
          If you were referred by another org to use this map, list the name of the organization you are affiliated with. 
          This is SEPARATE from the organization you are representing i.e. if you are a member of a National Black Energy Group 
          and they invited you to join our map and the name of your organization is BlackSolar, list BlackSolar above under 
          Organization and list National Black Energy Group in this section.
        </p>
        <input
          type="text"
          value={formData.affiliatedEntity}
          onChange={(e) => handleInputChange("affiliatedEntity", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter affiliated entity"
        />
      </div>
    </>
  );
};

//
// 5. MAIN MULTI-STEP COMPONENT
//
interface Props {
  initialData?: FormData;
  onSubmitSuccess?: () => void;
}

const BSNRegistrationForm: React.FC<Props> = ({ initialData, onSubmitSuccess }) => {
  // console.log("📥 Initial data received:", initialData);

  const [step, setStep] = useState(1);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const defaultFormData: FormData = {
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    memberLevel: "rectzSiMASJ9OcN52",
    bio: "I am passionate about sustainability and environmental justice.",
    organizationName: "Green Solutions Inc",
    affiliatedEntity: "",
    photo: null,
    logo: null,
    identification: "selr9tieJBEX3COne", // Black/African-American
    gender: "", // Will be selected from dropdown
    website: "https://example.com",
    phoneCountryCode: "+1-us",
    phone: "+1 (555) 123-4567",
    additionalFocus: [],
    primaryIndustry: "", // Will be selected from dropdown
    address: "",
    zipCode: 0,
    youtube: "https://youtube.com/@example",
    nearestCity: "",
    nameFromLocation: "",
    fundingGoal: "",
    similarCategories: [],
    naicsCode: "",
    includeOnMap: false,
    latitude: null,
    longitude: null,
    showDropdown: false,
    phoneCountryCodeTouched: false,
  };

  const [formData, setFormData] = useState<FormData>({
    ...defaultFormData,
    ...(initialData || {}),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // For populating dropdowns
  const [memberLevelOptions, setMemberLevelOptions] = useState<
    { id: string; name: string; icon: string | null }[]
  >(HARDCODED_MEMBER_LEVELS.map((level) => ({ ...level, icon: null })));
  const [identificationOptions, setIdentificationOptions] = useState([]);
  const [genderOptions, setGenderOptions] = useState([]);
  const [primaryIndustryOptions, setPrimaryIndustryOptions] = useState([]);
  const [nameFromLocationOptions, setNameFromLocationOptions] = useState([]);
  const [similarCategoriesOptions, setSimilarCategoriesOptions] = useState([]);
  const [additionalFocusOpen, setAdditionalFocusOpen] = useState(false);

  // On initial render, if we have initialData, we might want to skip to a summary/review step
  // or handle it differently. For now, we start at step 1.

  // Use useEffect to log whenever formData changes, especially memberLevel
  useEffect(() => {
    // console.log("Member level in formData changed to:", formData.memberLevel);
  }, [formData.memberLevel]);

  // Log initial data specifically for memberLevel
  useEffect(() => {
    if (initialData) {
      // console.log("Initial member level from props:", initialData.memberLevel);
    }
  }, [initialData]);

  function stripEmojisAndSpaces(str: string) {
    if (!str) return "";
    // Remove emojis and trim whitespace
    return str.replace(/s/g, "").trim();
  }

  // Effect to update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Fetches dropdown options from Airtable
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const dropdownData = await AirtableUtils.fetchTableMetadata();
        console.log("Airtable Dropdown Data:", JSON.stringify(dropdownData, null, 2));
        
        const countryField = dropdownData.find((f: any) => f.fieldName === "Country");
        if (countryField) {
          // locationCountryOptions.current = countryField.options;
        }
        const identificationField = dropdownData.find((f: any) => f.fieldName === "IDENTIFICATION");
        if (identificationField) {
          // Filter out the unwanted option name
          const filteredIdentifications = identificationField.options.filter(
            (opt: any) => opt.name !== "IDENTIFICATION"
          );

          // 2. Sort alphabetically (ignoring case if desired)
          const sortedIdentifications = filteredIdentifications.slice().sort(
            (a: any, b: any) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })
          );
          // 3. Set state with the cleaned-up sorted array
          setIdentificationOptions(sortedIdentifications);
        }
        const genderField = dropdownData.find((f: any) => f.fieldName === "GENDER");
        setGenderOptions(genderField?.options || []);
        const primaryIndustryField = dropdownData.find((f: any) => f.fieldName === "PRIMARY INDUSTRY HOUSE");
        console.log(primaryIndustryField)
        if (primaryIndustryField) {
          // First, remove the unwanted item
          const cleanedOptions = primaryIndustryField.options.filter(
            (item: any) => item.name !== "PRIMARY INDUSTRY HOUSE"
          );

          // Remove duplicates based on name
          const uniqueOptions = cleanedOptions.filter((item: any, index: number, self: any[]) => 
            index === self.findIndex((t: any) => t.name === item.name)
          );

          // Then sort them
          const sortedIndustry = uniqueOptions.slice().sort((a: any, b: any) => {
            const aName = stripEmojisAndSpaces(a.name);
            const bName = stripEmojisAndSpaces(b.name);
            return aName.localeCompare(bName, "en", { sensitivity: "base" });
          });

          console.log(sortedIndustry, 'Sorted by ignoring leading emojis/spaces');
          setPrimaryIndustryOptions(sortedIndustry);
        }
        const nameFromLocationField = dropdownData.find((f: any) => f.fieldName === "Name (from Location)");
        setNameFromLocationOptions(nameFromLocationField?.options || []);
        const similarCategoriesField = dropdownData.find((f: any) => f.fieldName === "Similar Categories");
        setSimilarCategoriesOptions(similarCategoriesField?.options || []);
      } catch (error) {
        console.error("Error fetching dropdown options:", error);
      }
    };

    fetchDropdownOptions();
  }, []);

  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (step === 1) {
      if (!formData.email) newErrors.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address.";
      }
      
      if (!formData.firstName) newErrors.firstName = "First Name is required.";
      if (!formData.lastName) newErrors.lastName = "Last Name is required.";
      
      // Photo validation - commented out for testing with dummy data
      // if (!formData.photo && !formData.photoUrl) {
      //   newErrors.photo = "Profile photo is required.";
      // }
    } else if (step === 2) {
      if (!formData.memberLevel) newErrors.memberLevel = "Member level is required.";
      if (!formData.bio) newErrors.bio = "Bio is required.";
      if (!formData.identification) newErrors.identification = "Identification is required.";
      if (!formData.gender) newErrors.gender = "Gender is required.";
      if (!formData.primaryIndustry) newErrors.primaryIndustry = "Primary industry is required.";
      
      // Phone validation - optional, only validate if user enters a phone number
      if (formData.phone && formData.phone.trim() !== "") {
        console.log("🔍 Validating phone:", {
          phone: formData.phone,
          countryCode: formData.phoneCountryCode
        });
        const fullPhone = formData.phoneCountryCode.split("-")[0] + formData.phone;
        const defaultCountry: CountryCode = (formData.phoneCountryCode.split("-")[1]?.toUpperCase() || "US") as CountryCode;
        console.log("📞 Full phone to validate:", fullPhone, "Country:", defaultCountry);
        const phoneNumber = parsePhoneNumberFromString(fullPhone, defaultCountry);
        console.log("📱 Phone validation result:", phoneNumber?.isValid());
        if (!phoneNumber || !phoneNumber.isValid()) {
          newErrors.phone = "Please enter a valid phone number for the selected country.";
        }
      }
    } else if (step === 3) {
      // if (!formData.locationCountry) newErrors.locationCountry = "Location (Country) is required.";
      // if (!formData.locationCity) newErrors.locationCity = "Location (City) is required.";

      if (!formData.address) {
        newErrors.address = "Please enter an address or drop a pin on the map.";
      }
    }
    setErrors(newErrors);
    
    // Log validation errors for debugging
    if (Object.keys(newErrors).length > 0) {
      console.log("❌ Validation failed on step", step, ":", newErrors);
    } else {
      console.log("✅ Validation passed for step", step);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();           // Prevent form submission
    e.stopPropagation();         // Stop event bubbling
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, 3));
    }
  };
  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Helper to upload a file to Cloudinary via our /api/upload endpoint
  const uploadFile = async (file: File): Promise<string> => {
    console.log("Starting file upload for:", file.name, "type:", file.type, "size:", file.size);
    const data = new FormData();
    data.append("file", file);
    try {
        const response = await axios.post("/api/upload", data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("Upload response:", response.data);
        return response.data.url;
    } catch (error) {
        console.error("Upload error:", error);
        throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setStatus("loading");
    try {
        // Debug log initial state
        console.log("Initial form data:", {
            photo: formData.photo?.name,
            photoUrl: formData.photoUrl,
            logo: formData.logo?.name,
            logoUrl: formData.logoUrl
        });

        let photoUrl = null;
        let logoUrl = null;

        // Upload photo if provided
        if (formData.photo) {
            console.log("Uploading photo to Cloudinary...");
            try {
                photoUrl = await uploadFile(formData.photo);
                console.log("Photo upload successful:", photoUrl);
            } catch (uploadError) {
                console.error("Photo upload failed:", uploadError);
                throw new Error("Failed to upload photo");
            }
        }

        // Upload logo if provided
        if (formData.logo) {
            console.log("Uploading logo to Cloudinary...");
            try {
                logoUrl = await uploadFile(formData.logo);
                console.log("Logo upload successful:", logoUrl);
            } catch (uploadError) {
                console.error("Logo upload failed:", uploadError);
                throw new Error("Failed to upload logo");
            }
        }

        // Debug log before mapping to Airtable fields
        console.log("URLs before Airtable mapping:", { photoUrl, logoUrl });

        // Build final data using the updated photoUrl and logoUrl values
        let finalAirtableFields = {
            ...mapFormDataToAirtableFields(formData),
            ...(photoUrl ? { 
                "PHOTO": [{ 
                    url: photoUrl,
                    filename: formData.photo?.name || "profile-photo.jpg" 
                }] 
            } : {}),
            ...(logoUrl ? { 
                "LOGO": [{ 
                    url: logoUrl,
                    filename: formData.logo?.name || "organization-logo.jpg" 
                }] 
            } : {})
        };

        // Debug log final Airtable fields
        console.log("Final Airtable fields:", finalAirtableFields);

        // First, try to find existing record by email
        const url = `https://api.airtable.com/v0/${process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID}/${process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME}`;
        const searchResponse = await fetch(url + `?filterByFormula={EMAIL ADDRESS}='${formData.email}'`, {
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
        
        const searchData = await searchResponse.json();
        
        let response;
        if (searchData.records && searchData.records.length > 0) {
            // Record exists, update it
            const recordId = searchData.records[0].id;
            response = await AirtableUtils.updateRecord(recordId, finalAirtableFields);
            console.log("Airtable record updated:", response);
        } else {
            // No existing record, create new one
            response = await AirtableUtils.submitToAirtable(finalAirtableFields);
            console.log("New Airtable record created:", response);
        }

        setStatus("success");
        setIsFormSubmitted(true);

        // Call onSubmitSuccess after successful submission
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
    } catch (error) {
        console.error("Submission error:", error);
        setStatus("error");
        setSubmissionError("Failed to register. Please try again.");
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleFileChange = (field: keyof FormData, file: File | null) => {
    // Clear any existing errors for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));

    // If no file selected, clear the field
    if (!file) {
      setFormData(prev => ({
        ...prev,
        [field]: null,
        ...(field === "photo" ? { photoUrl: "" } : { logoUrl: "" })
      }));
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [field]: "Please upload a valid image file (JPEG, PNG, GIF, or WEBP)"
      }));
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        [field]: "File size must be less than 5MB"
      }));
      return;
    }

    // Create a preview URL and update form data
    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      [field]: file,
      ...(field === "photo" ? { photoUrl: previewUrl } : { logoUrl: previewUrl })
    }));

    // Clean up the preview URL when component unmounts
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  };
  const handleToggleFocus = (value: string) => {
    setFormData((prev) => {
      const alreadySelected = prev.additionalFocus.includes(value);
      return {
        ...prev,
        additionalFocus: alreadySelected
          ? prev.additionalFocus.filter((f) => f !== value)
          : [...prev.additionalFocus, value],
      };
    });
  };
  const handleToggleCategory = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const selected = prev[field] as string[];
      const alreadySelected = selected.includes(value);
      return {
        ...prev,
        [field]: alreadySelected
          ? selected.filter((cat) => cat !== value)
          : [...selected, value],
      };
    });
  };

  const handleBackToForm = () => {
    setFormData({ ...defaultFormData, ...(initialData || {}) });
    setStep(1);
    setStatus("idle");
    setErrors({});
    setSubmissionError(null);
  };

  // If form is submitted successfully, show membership options
  if (isFormSubmitted) {
    return (
      <>
        <Head>
          <title>Choose Your Membership - Black Sustainability Network</title>
          <meta name="description" content="Select your membership level for Black Sustainability Network." />
        </Head>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4">
            <MembershipOptions onReturn={() => setIsFormSubmitted(false)} />
          </div>
        </div>
      </>
    );
  }

  if (status === "success") {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-green-700 mb-4">
          Give thanks for your submission.
        </h2>
        <p className="text-gray-600">
          Please allow five (5) business days for our team to review your
          application to join our network. If you do not hear from us, contact{" "}
          <a
            href="mailto:members@blacksustainability.org"
            className="text-blue-600 hover:underline"
          >
            members@blacksustainability.org
          </a>
          .
        </p>
        <button
          onClick={handleBackToForm}
          className="mt-6 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
        >
          Go back to form
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>BSN Registration - Black Sustainability Network</title>
        <meta name="description" content="Official registration for Black Sustainability Network initiatives and campaigns." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://maps.blacksustainability.org/bsn-registration" />
        
        {/* Open Graph */}
        <meta property="og:title" content="BSN Registration - Black Sustainability Network" />
        <meta property="og:description" content="Official registration for Black Sustainability Network initiatives and campaigns." />
        <meta property="og:image" content="https://maps.blacksustainability.org/default-logo.png" />
        <meta property="og:url" content="https://maps.blacksustainability.org/bsn-registration" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BSN Registration - Black Sustainability Network" />
        <meta name="twitter:description" content="Official registration for Black Sustainability Network initiatives and campaigns." />
        <meta name="twitter:image" content="https://maps.blacksustainability.org/default-logo.png" />
      </Head>
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Image
          src={logo}
          alt="BSN Logo"
          width={80}
          height={80}
          className="mx-auto"
        />
        <h1 className="text-2xl font-bold mt-4">
          BSN Member Registration
        </h1>
        <p className="text-gray-600 mt-2">
          Step {step} of 3
        </p>
      </div>

      <div className="mb-6">
        <div className="text-center p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold">
            Black Sustainability Network (BSN) Member Registration
          </h2>
          <p className="text-gray-600 mt-2">
            Welcome to our community of sustainability practitioners of African
            descent. If you are Black AND Green, please fill out the
            information below to apply to join our network of over 2,300 people.
          </p>
          <p className="text-gray-600 mt-2 font-bold">We exist and are growing!</p>
          <p className="text-gray-600 mt-2">
            *Not Black AND Green? No worries, email info@blacksustainability.org
            to find out how best to connect with us.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <Step1
            formData={formData}
            handleInputChange={handleInputChange}
            errors={errors}
            handleFileChange={handleFileChange}
            phoneInputRef={phoneInputRef}
            memberLevelOptions={memberLevelOptions}
          />
        )}
        {step === 2 && (
          <Step2
            formData={formData}
            handleInputChange={handleInputChange}
            errors={errors}
            identificationOptions={identificationOptions}
            genderOptions={genderOptions}
            primaryIndustryOptions={primaryIndustryOptions}
            handleToggleFocus={handleToggleFocus}
            additionalFocusOpen={additionalFocusOpen}
            setFormData={setFormData}
            phoneInputRef={phoneInputRef}
          />
        )}
        {step === 3 && (
          <Step3
            formData={formData}
            handleInputChange={handleInputChange}
            errors={errors}
            nameFromLocationOptions={nameFromLocationOptions}
            similarCategoriesOptions={similarCategoriesOptions}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            handleToggleCategory={handleToggleCategory}
          />
        )}

        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Previous
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 ml-auto"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 ml-auto"
            >
              {status === "loading" ? (
                <>
                  <span className="animate-spin border-2 border-t-transparent border-white rounded-full w-5 h-5" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          )}
        </div>
      </form>

      {status === "error" && submissionError && (
        <div className="mt-4 text-center text-red-500 bg-red-50 p-3 rounded-lg">
          {submissionError}
        </div>
      )}
      </div>
    </>
  );
};

export default BSNRegistrationForm;
