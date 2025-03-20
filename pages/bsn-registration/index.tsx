"use client";

import { useState, useEffect, useRef } from "react";
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

// You can define this array at the top of your file or outside your component
const HARDCODED_MEMBER_LEVELS = [
  { id: "recGP35SbgqyZ4FQN", name: "🏢 Entity - Black & Green Organization" },
  { id: "recgWTcJQnfOQW0Dm", name: "👓 Enthusiast - Excited to Learn" },
  { id: "rectzSiMASJ9OcN52", name: "🥋 Expert - Experienced Professional" },
  { id: "recEqcQWORWPnOh3d", name: "Young Environmental Scholar" },
];


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



// 3. Map formData -> Airtable fields
const mapFormDataToAirtableFields = (formData: FormData) => {
  // Extract the dial code from the stored value (e.g., from "+1-us" get "+1")
  const dialCode = formData.phoneCountryCode.split("-")[0];
  const fullPhone = dialCode + formData.phone;

  return {
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
    // Country: formData.locationCountry,
    "Zip/Postal Code": formData.zipCode,
    YOUTUBE: formData.youtube,
    "Location (Nearest City)": formData.nearestCity,
    "Name (from Location)": formData.nameFromLocation,
    "FUNDING GOAL": formData.fundingGoal,
    "Similar Categories": formData.similarCategories.filter(
      (cat) => cat && cat.trim() !== ""
    ),
    "NAICS Code": formData.naicsCode,
    Featured: formData.includeOnMap,
    Latitude: formData.latitude !== null ? formData.latitude.toString() : "",
    Longitude: formData.longitude !== null ? formData.longitude.toString() : "",
    "Address": formData.address,
    ...(formData.photoUrl ? { "PHOTO": [{ url: formData.photoUrl }] } : {}),
    ...(formData.logoUrl ? { "LOGO": [{ url: formData.logoUrl }] } : {}),
  };
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

// Build the international options array with explicit types
const internationalOptions: { code: string; country: string; iso2: string }[] =
  allCountries.map((country: CountryData) => ({
    code: `+${country.dialCode}`,
    country: country.name,
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
  phoneInputRef: React.RefObject<HTMLInputElement>; // 👈 Add this
}> = ({ formData, handleInputChange, errors, handleFileChange }) => (
  <>
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Email Address *
      </label>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => handleInputChange("email", e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">
        First Name *
      </label>
      <input
        type="text"
        value={formData.firstName}
        onChange={(e) => handleInputChange("firstName", e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Last Name *
      </label>
      <input
        type="text"
        value={formData.lastName}
        onChange={(e) => handleInputChange("lastName", e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">Photo *</label>
      <input
        type="file"
        onChange={(e) =>
          handleFileChange("photo", e.target.files ? e.target.files[0] : null)
        }
        className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
    </div>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Logo</label>
      <input
        type="file"
        onChange={(e) =>
          handleFileChange("logo", e.target.files ? e.target.files[0] : null)
        }
        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    {/* Phone input with international code dropdown */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Phone</label>
      <p className="text-xs text-gray-600">
        We want to ensure you receive BSN info via SMS (no SPAM we promise)...
      </p>
      <div className="flex">
        <select
          value={formData.phoneCountryCode}
          onChange={(e) => {
            handleInputChange("phoneCountryCode", e.target.value);
            handleInputChange("phoneCountryCodeTouched", true);
          }}
          
          className="mr-2 border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ minWidth: "120px", width: "auto" }}
        >
          {internationalOptions.map((item) => (
            <option key={`${item.code}-${item.iso2}`} value={`${item.code}-${item.iso2}`}>
              {item.code} ({item.country})
            </option>
          ))}
        </select>
        <input
         ref={phoneInputRef} 
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter phone number"
        />
      </div>
      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
    </div>

  </>
);

// Step2: Membership & Focus
const Step2: React.FC<{
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;
  memberLevelOptions: { id: string; name: string; icon: string | null }[];
  identificationOptions: any[];
  genderOptions: any[];
  primaryIndustryOptions: any[];
  handleToggleFocus: (value: string) => void;
  additionalFocusOpen: boolean;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}> = ({
  formData,
  handleInputChange,
  errors,
  memberLevelOptions,
  identificationOptions,
  genderOptions,
  primaryIndustryOptions,
  handleToggleFocus,
  additionalFocusOpen,
  setFormData,
}) => (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Member Level *</label>
        <select
          value={formData.memberLevel}
          onChange={(e) => handleInputChange("memberLevel", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select</option>
          {HARDCODED_MEMBER_LEVELS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {errors.memberLevel && <p className="text-red-500 text-sm mt-1">{errors.memberLevel}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Bio (250 words or less)*</label>
        <textarea
          value={formData.bio}
          onChange={(e) => {
            const text = e.target.value;
            // Split the text into words while filtering out empty strings
            const words = text.split(/\s+/).filter((word) => word.length > 0);
            // If word count is within limit, update directly; else truncate
            if (words.length <= 250) {
              handleInputChange("bio", text);
            } else {
              handleInputChange("bio", words.slice(0, 250).join(" "));
            }
          }}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {/*
    Calculate word count and conditionally style:
    If count equals (or reaches) 250, change text color to red.
  */}
        <p className={`text-xs mt-1 ${formData.bio.split(/\s+/).filter((w) => w.length > 0).length >= 250 ? "text-red-500" : "text-gray-600"}`}>
          Word Count: {formData.bio.split(/\s+/).filter((w) => w.length > 0).length} / 250
        </p>
        {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio}</p>}
      </div>


      <div>
        <label className="block text-sm font-medium text-gray-700">Organization Name (if Applicable)</label>
        <input
          type="text"
          value={formData.organizationName || ""}
          onChange={(e) => handleInputChange("organizationName", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* New dropdown for Affiliated Entity */}
      {/* Updated affiliated entity field as a regular text input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Which entity are you affiliated with? (Not a member)
        </label>
        <input
          type="text"
          value={formData.affiliatedEntity || ""}
          onChange={(e) =>
            handleInputChange("affiliatedEntity", e.target.value)
          }
          className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter affiliated entity"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Identification *</label>
        <select
          value={formData.identification}
          onChange={(e) => handleInputChange("identification", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select</option>
          {identificationOptions.map((option) => (
            <option key={option.id} value={option.name}>
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
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Website</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => handleInputChange("website", e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg p-2"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Primary Industry House *</label>
        <select
          value={formData.primaryIndustry}
          onChange={(e) => handleInputChange("primaryIndustry", e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select</option>
          {primaryIndustryOptions.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        {errors.primaryIndustry && <p className="text-red-500 text-sm mt-1">{errors.primaryIndustry}</p>}
      </div>
      <div className="space-y-2 relative">
        <label className="block text-sm font-medium text-gray-700">Additional Industry Houses</label>
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
              "🌾 Agriculture/Sustainable Food Production / Land Management",
              "☀️ Alternative Energy",
              "💰 Alternative Economics",
              "🏘 Community Development",
              "🛖 Eco-friendly Building",
              "🧑🏾‍🏫 Education & Cultural Preservation",
              "Environmental Justice",
              "♻️ Green Lifestyle",
              "❓ Other",
              "💧Water",
              "💻 Technology",
              "🗑 Waste",
              "🧘🏿‍♀️ Wholistic Health",
              "Climate",
              "Spirituality",
              "🆘 Survival/Preparedness",
              "Youth",
              "Africa",
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
        {errors.additionalFocus && <span className="text-red-500 text-sm">{errors.additionalFocus}</span>}
      </div>
    </>
  );

// Step3: Location & Categories
const Step3: React.FC<{
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;
  // locationCountryOptions: any[];
  nameFromLocationOptions: any[];
  similarCategoriesOptions: any[];
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleCategory: (field: keyof FormData, value: string) => void;
}> = ({
  formData,
  handleInputChange,
  errors,
  // locationCountryOptions,
  nameFromLocationOptions,
  similarCategoriesOptions,
  showDropdown,
  setShowDropdown,
  handleToggleCategory,
}) => {
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    return (
      <>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Address (Drop your pin on the map!)*</label>
          <GooglePlacesAutocomplete
            apiKey={googleMapsApiKey}
            selectProps={{
              value: formData.address
                ? { label: formData.address, value: formData.address }
                : null,
              onChange: async (val: any) => {
                if (!val) {
                  handleInputChange("address", "");
                  return;
                }
                // Update the full address
                handleInputChange("address", val.label);
                try {
                  const results = await geocodeByPlaceId(val.value.place_id);
                  const latLng = await getLatLng(results[0]);
                  handleInputChange("latitude", latLng.lat);
                  handleInputChange("longitude", latLng.lng);
                } catch (error) {
                  console.error("Error getting lat/lng from place", error);
                }
              },
              placeholder: "Start typing your full address...",
            }}
            autocompletionRequest={{
              types: ["address"],
              // componentRestrictions: {
              //   country: getCountryCode(formData.locationCountry),
              // },
            }}
          />
          {errors.address && <span className="text-red-500 text-sm">{errors.address}</span>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Zip/Postal Code</label>
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
          <p className="text-xs text-gray-600">Do you have a video to share/showcase your work...</p>
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
          {errors.similarCategories && <span className="text-red-500 text-sm">{errors.similarCategories}</span>}
        </div>
        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={formData.includeOnMap}
              onChange={(e) =>
                handleInputChange("includeOnMap", e.target.checked)
              }
              className="rounded border-gray-300 text-blue-600"
            />

            <span className="ml-2 text-sm font-medium text-gray-700">
              Include me on Global BSN Map
            </span>
          </label>
        </div>
      </>
    );
  };

//
// 5. MAIN MULTI-STEP COMPONENT
//
const BSNRegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    memberLevel: "",
    bio: "",
    organizationName: "",
    photo: null,
    logo: null,
    identification: "",
    gender: "",
    website: "",
    phoneCountryCode: "+1-us",
    phone: "",
    primaryIndustry: "",
    additionalFocus: [],
    // locationCountry: "",
    // locationCity: "",
    address: "",
    zipCode: 0,
    youtube: "",
    nearestCity: "",
    nameFromLocation: "",
    fundingGoal: "",
    similarCategories: [],
    naicsCode: "",
    includeOnMap: false,
    latitude: null,
    longitude: null,
    showDropdown: false,
    affiliatedEntity: '',
    phoneCountryCodeTouched: false
    
  });
  console.log(formData.phone, formData.phoneCountryCode)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 3;
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dropdown Data
  const [memberLevelOptions, setMemberLevelOptions] = useState<{ id: string; name: string; icon: string | null }[]>([]);
  const [identificationOptions, setIdentificationOptions] = useState<any[]>([]);
  const [genderOptions, setGenderOptions] = useState<any[]>([]);
  const [locationCountryOptions, setLocationCountryOptions] = useState<any[]>([]);
  const [primaryIndustryOptions, setPrimaryIndustryOptions] = useState<any[]>([]);
  const [nameFromLocationOptions, setNameFromLocationOptions] = useState<any[]>([]);
  const [similarCategoriesOptions, setSimilarCategoriesOptions] = useState<any[]>([]);

  // Errors (using Partial<Record<keyof FormData, string>> for error messages)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [additionalFocusOpen, setAdditionalFocusOpen] = useState<boolean>(false);

  function stripEmojisAndSpaces(str: string) {
    // This example removes all leading non-letter characters and trims trailing spaces:
    // Feel free to customize further if needed.
    return str.replace(/^[^a-zA-Z]+/, '').trim();
  }
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!phoneInputRef.current || formData.phoneCountryCodeTouched) return;
  
    const phoneInput = phoneInputRef.current;
  
    const handleInputChange = () => {
      const rawPhone = phoneInput.value;
      
      if (rawPhone && rawPhone !== formData.phone) {
        const parsed = parsePhoneNumberFromString(rawPhone);
        if (parsed?.isValid()) {
          const regionCode = parsed.country?.toLowerCase();
          const match = internationalOptions.find((opt) => opt.iso2 === regionCode);
          if (match) {
            setFormData((prev) => ({
              ...prev,
              phone: rawPhone,
              phoneCountryCode: `${match.code}-${match.iso2}`,
            }));
          }
        }
      }
    };
  
    // Listen for input changes (works for manual input and browser autofill)
    phoneInput.addEventListener("input", handleInputChange);
    phoneInput.addEventListener("blur", handleInputChange);
  
    return () => {
      phoneInput.removeEventListener("input", handleInputChange);
      phoneInput.removeEventListener("blur", handleInputChange);
    };
  }, []);
  
  
  
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const dropdownData = await AirtableUtils.fetchTableMetadata();
        console.log("Dropdown data:", dropdownData);
        const memberLevelField = dropdownData.find((f: any) => f.fieldName === "MEMBER LEVEL");
        if (memberLevelField) {
          const allowedOptions = [
            "👓 Enthusiast -Excited to Learn",
            "🥋 Expert - Experienced Professional",
            "🏢 Entity - Black & Green Organization",
            "Young Environmental Scholar",
          ];

          // Filter out any options that aren’t in your 4 allowed names
          const filteredOptions = memberLevelField.options.filter((o: any) =>
            allowedOptions.includes(o.name)
          );

          // Alphabetize them by .name
          const sortedOptions = filteredOptions
            .slice()
            .sort((a: any, b: any) =>
              a.name.localeCompare(b.name, "en", { sensitivity: "base" })
            );

          setMemberLevelOptions(sortedOptions);
        }
        const countryField = dropdownData.find((f: any) => f.fieldName === "Country");
        if (countryField) {
          setLocationCountryOptions(countryField.options);
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
        // setIdentificationOptions(identificationField?.options || []);
        const genderField = dropdownData.find((f: any) => f.fieldName === "GENDER");
        setGenderOptions(genderField?.options || []);
        const primaryIndustryField = dropdownData.find((f: any) => f.fieldName === "PRIMARY INDUSTRY HOUSE");
        console.log(primaryIndustryField)
        if (primaryIndustryField) {
          // First, remove the unwanted item
          const cleanedOptions = primaryIndustryField.options.filter(
            (item: any) => item.name !== "PRIMARY INDUSTRY HOUSE"
          );

          // Then sort them
          const sortedIndustry = cleanedOptions.slice().sort((a: any, b: any) => {
            const aName = stripEmojisAndSpaces(a.name);
            const bName = stripEmojisAndSpaces(b.name);
            return aName.localeCompare(bName, "en", { sensitivity: "base" });
          });

          console.log(sortedIndustry, 'Sorted by ignoring leading emojis/spaces');
          setPrimaryIndustryOptions(sortedIndustry);
        }
        // setPrimaryIndustryOptions(primaryIndustryField?.options || []);
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
    if (currentStep === 1) {
      if (!formData.email) newErrors.email = "Email is required.";
      if (!formData.firstName) newErrors.firstName = "First Name is required.";
      if (!formData.lastName) newErrors.lastName = "Last Name is required.";
      if (!formData.photo) newErrors.photo = "Photo is required.";
      // Combine country code and phone and validate using libphonenumber-js
      const fullPhone = formData.phoneCountryCode.split("-")[0] + formData.phone;
      const defaultCountry: CountryCode = (formData.phoneCountryCode.split("-")[1]?.toUpperCase() || "US") as CountryCode;
      const phoneNumber = parsePhoneNumberFromString(fullPhone, defaultCountry);
      if (!phoneNumber || !phoneNumber.isValid()) {
        newErrors.phone = "Please enter a valid phone number including country code.";
      }

    } else if (currentStep === 2) {
      if (!formData.memberLevel) newErrors.memberLevel = "Member level is required.";
      if (!formData.bio) newErrors.bio = "Bio is required.";
      if (!formData.identification) newErrors.identification = "Identification is required.";
      if (!formData.gender) newErrors.gender = "Gender is required.";
      if (!formData.primaryIndustry) newErrors.primaryIndustry = "Primary industry is required.";
    } else if (currentStep === 3) {
      // if (!formData.locationCountry) newErrors.locationCountry = "Location (Country) is required.";
      // if (!formData.locationCity) newErrors.locationCity = "Location (City) is required.";

      if (!formData.address) {
        newErrors.address = "Please enter an address or drop a pin on the map.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Helper to upload a file to Cloudinary via our /api/upload endpoint
  const uploadFile = async (file: File): Promise<string> => {
    const data = new FormData();
    data.append("file", file);
    const response = await axios.post("/api/upload", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      // Upload photo and logo if provided and not already uploaded
      let photoUrl = formData.photoUrl;
      let logoUrl = formData.logoUrl;
      if (formData.photo && !formData.photoUrl) {
        photoUrl = await uploadFile(formData.photo);
        setFormData((prev) => ({ ...prev, photoUrl }));
      }
      if (formData.logo && !formData.logoUrl) {
        logoUrl = await uploadFile(formData.logo);
        setFormData((prev) => ({ ...prev, logoUrl }));
      }
      // Build final data using the updated photoUrl and logoUrl values
      const finalAirtableFields = mapFormDataToAirtableFields({
        ...formData,
        photoUrl,
        logoUrl,
        // latitude: lat,
        // longitude: lng,
      });
      console.log(finalAirtableFields)
      // Submit to Airtable
      const response = await AirtableUtils.submitToAirtable(finalAirtableFields);
      console.log("Data submitted successfully:", response);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleFileChange = (field: keyof FormData, file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-12">
      {isSubmitted ? (
        <div className="max-w-xl bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            SUCCESS!
          </h2>
          <p className="text-gray-700 mb-4">
            Your information is being reviewed by our team and we will follow up to gather more information about your sustainability skills and goals. If all checks out, you will see our map updated in 7 days with your pin
          </p>
          <p className="text-gray-700 mb-4">
            Meanwhile, you can visit{" "}
            <a
              href="https://www.blacksustainability.org/join-our-network"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 underline"
            >
              our network page
            </a>{" "}
            for more info. Interested in <strong>upgrading</strong> to get full access as a paid member? Stay tuned for membership details inside your email or check out our website for more options!
          </p>
        </div>
      ) : (
        
        <form onSubmit={handleSubmit} className="w-full max-w-3xl bg-white p-6 rounded-lg shadow-md space-y-6">
            <div className="flex justify-center mb-6">
            <Image
              src={logo}
              alt="Logo"
              width={120}    // Adjust width as necessary
              height={120}    // Adjust according to your aspect ratio
            />
          </div>
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Black Sustainability Network (BSN) Map Listing
            </h1>
            <p className="text-gray-700">
              Welcome to the first step in joining our community of sustainability practitioners...
            </p>
            <p className="text-gray-700 italic">
              *Not Black AND Green? Email{" "}
              <a
                href="mailto:info@blacksustainability.org"
                className="text-blue-500 underline"
              >
                info@blacksustainability.org
              </a>{" "}
              to connect with us.
            </p>
          </div>
        
        
          {currentStep === 1 && (
            <Step1
              formData={formData}
              handleInputChange={handleInputChange}
              errors={errors}
              handleFileChange={handleFileChange}
              phoneInputRef={phoneInputRef} // 👈 Add this
            />
          )}
          {currentStep === 2 && (
            <Step2
              formData={formData}
              handleInputChange={handleInputChange}
              errors={errors}
              memberLevelOptions={memberLevelOptions}
              identificationOptions={identificationOptions}
              genderOptions={genderOptions}
              primaryIndustryOptions={primaryIndustryOptions}
              handleToggleFocus={handleToggleFocus}
              additionalFocusOpen={formData.showDropdown || false}
              setFormData={setFormData}
            />
          )}
          {currentStep === 3 && (
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
          <div className="flex justify-between pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
              >
                Previous
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin border-2 border-t-transparent border-white rounded-full w-5 h-5" />
                    Processing...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default BSNRegistrationForm;
