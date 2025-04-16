"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from "react-google-places-autocomplete";
import { geocodeAddress } from "@/utils/geocode.js";
import AirtableUtils from "@/pages/api/submitForm";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import Image from "next/image";
import { allCountries } from "country-telephone-data";
import logo from "@/public/png/bsn-logo.png";
import CountryCodeDropdown from "../../components/CountryCodeDropdown/CountryCodeDropdown";

// Hard-coded member level options
const HARDCODED_MEMBER_LEVELS = [
  { id: "recGP35SbgqyZ4FQN", name: "🏢 Entity - Black & Green Organization" },
  { id: "recgWTcJQnfOQW0Dm", name: "👓 Enthusiast - Excited to Learn" },
  { id: "rectzSiMASJ9OcN52", name: "🥋 Expert - Experienced Professional" },
  { id: "recEqcQWORWPnOh3d", name: "Young Environmental Scholar" },
];

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

const defaultFormData: FormData = {
  email: "",
  firstName: "",
  lastName: "",
  memberLevel: "",
  bio: "",
  organizationName: "",
  affiliatedEntity: "",
  photo: null,
  photoUrl: "",
  logo: null,
  logoUrl: "",
  identification: "",
  gender: "",
  website: "",
  phoneCountryCode: "+1-us",
  phone: "",
  additionalFocus: [],
  primaryIndustry: "",
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
  phoneCountryCodeTouched: false,
};

interface BSNUpdateProfileFormProps {
  initialData?: FormData;
}

// Build international options
const internationalOptions: { code: string; country: string; iso2: string }[] =
  allCountries.map((country) => ({
    code: `+${country.dialCode}`,
    country: country.name,
    iso2: country.iso2,
  }));

// Map formData to the fields structure expected by Airtable
const mapFormDataToAirtableFields = (formData: FormData) => {
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
    "Zip/Postal Code": formData.zipCode,
    YOUTUBE: formData.youtube,
    "Location (Nearest City)": formData.nearestCity,
    "Name (from Location)": formData.nameFromLocation,
    "FUNDING GOAL": formData.fundingGoal,
    "Similar Categories": formData.similarCategories.filter((cat) => cat && cat.trim() !== ""),
    "NAICS Code": formData.naicsCode,
    Featured: formData.includeOnMap,
    Latitude: formData.latitude !== null ? formData.latitude.toString() : "",
    Longitude: formData.longitude !== null ? formData.longitude.toString() : "",
    "Address": formData.address,
    ...(formData.photoUrl ? { "PHOTO": [{ url: formData.photoUrl }] } : {}),
    ...(formData.logoUrl ? { "LOGO": [{ url: formData.logoUrl }] } : {}),
  };
};

// -------------------------------------------------------------------
// Step1 Component – Basic Info
// -------------------------------------------------------------------
interface Step1Props {
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;
  handleFileChange: (field: keyof FormData, file: File | null) => void;
  phoneInputRef: React.RefObject<HTMLInputElement>;
}
const Step1: React.FC<Step1Props> = ({
  formData,
  handleInputChange,
  errors,
  handleFileChange,
  phoneInputRef,
}) => (
  <>
    <div>
      <label className="block text-sm font-medium text-gray-700">Email Address *</label>
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
        onChange={(e) => handleFileChange("photo", e.target.files ? e.target.files[0] : null)}
        className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
    </div>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Phone</label>
      <p className="text-xs text-gray-600">We want to ensure you receive BSN info via SMS (no SPAM we promise)...</p>
      <div className="flex items-center border rounded w-full sm:w-2/3">
        <CountryCodeDropdown
          value={formData.phoneCountryCode}
          options={internationalOptions}
          onChange={(newValue) => {
            handleInputChange("phoneCountryCode", newValue);
            handleInputChange("phoneCountryCodeTouched", true);
          }}
        />
        <input
          ref={phoneInputRef}
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          className="px-3 py-2 w-full focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          placeholder="Enter phone number"
          autoComplete="off"
        />
      </div>
      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
    </div>
  </>
);

// -------------------------------------------------------------------
// Step2 Component – Membership & Focus
// -------------------------------------------------------------------
interface Step2Props {
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
}
const Step2: React.FC<Step2Props> = ({
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
          const words = text.split(/\s+/).filter((word) => word.length > 0);
          if (words.length <= 250) {
            handleInputChange("bio", text);
          } else {
            handleInputChange("bio", words.slice(0, 250).join(" "));
          }
        }}
        className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      />
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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Identification *</label>
      <select
        value={formData.identification}
        onChange={(e) => handleInputChange("identification", e.target.value)}
        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select</option>
        {identificationOptions.map((option: any) => (
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
        {genderOptions.map((option: any) => (
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
        {primaryIndustryOptions.map((option: any) => (
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

// -------------------------------------------------------------------
// Step3 Component – Location & Categories
// -------------------------------------------------------------------
interface Step3Props {
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;
  nameFromLocationOptions: any[];
  similarCategoriesOptions: any[];
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleCategory: (field: keyof FormData, value: string) => void;
}
const Step3: React.FC<Step3Props> = ({
  formData,
  handleInputChange,
  errors,
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
            value: formData.address ? { label: formData.address, value: formData.address } : null,
            onChange: async (val: any) => {
              if (!val) {
                handleInputChange("address", "");
                return;
              }
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
          autocompletionRequest={{ types: ["address"] }}
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
          {nameFromLocationOptions.map((option: any) => (
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
                className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded cursor-pointer"
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
            {similarCategoriesOptions.map((option: any) => (
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
            onChange={(e) => handleInputChange("includeOnMap", e.target.checked)}
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

// -------------------------------------------------------------------
// Main BSNUpdateProfileForm Component
// -------------------------------------------------------------------
const BSNUpdateProfileForm: React.FC<BSNUpdateProfileFormProps> = ({ initialData }) => {
  const [formData, setFormData] = useState<FormData>(initialData || defaultFormData);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 3;
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isNextDisabled, setIsNextDisabled] = useState<boolean>(false);

  // Dropdown options state
  const [memberLevelOptions, setMemberLevelOptions] = useState<{ id: string; name: string; icon: string | null }[]>([]);
  const [identificationOptions, setIdentificationOptions] = useState<any[]>([]);
  const [genderOptions, setGenderOptions] = useState<any[]>([]);
  const [primaryIndustryOptions, setPrimaryIndustryOptions] = useState<any[]>([]);
  const [nameFromLocationOptions, setNameFromLocationOptions] = useState<any[]>([]);
  const [similarCategoriesOptions, setSimilarCategoriesOptions] = useState<any[]>([]);

  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Fetch dropdown options from Airtable metadata
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const dropdownData = await AirtableUtils.fetchTableMetadata();
        console.log("Dropdown data:", dropdownData);
        // Identification Options
        const identificationField = dropdownData.find((f: any) => f.fieldName === "IDENTIFICATION");
        if (identificationField) {
          const filteredIdentifications = identificationField.options.filter((opt: any) => opt.name !== "IDENTIFICATION");
          const sortedIdentifications = filteredIdentifications.slice().sort((a: any, b: any) =>
            a.name.localeCompare(b.name, "en", { sensitivity: "base" })
          );
          setIdentificationOptions(sortedIdentifications);
        }
        // Gender Options
        const genderField = dropdownData.find((f: any) => f.fieldName === "GENDER");
        setGenderOptions(genderField?.options || []);
        // Primary Industry Options
        const primaryIndustryField = dropdownData.find((f: any) => f.fieldName === "PRIMARY INDUSTRY HOUSE");
        if (primaryIndustryField) {
          const cleanedOptions = primaryIndustryField.options.filter((item: any) => item.name !== "PRIMARY INDUSTRY HOUSE");
          const sortedIndustry = cleanedOptions.slice().sort((a: any, b: any) => {
            const aName = a.name.replace(/^[^a-zA-Z]+/, '').trim();
            const bName = b.name.replace(/^[^a-zA-Z]+/, '').trim();
            return aName.localeCompare(bName, "en", { sensitivity: "base" });
          });
          setPrimaryIndustryOptions(sortedIndustry);
        }
        // Name From Location Options
        const nameFromLocationField = dropdownData.find((f: any) => f.fieldName === "Name (from Location)");
        setNameFromLocationOptions(nameFromLocationField?.options || []);
        // Similar Categories Options
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
      if (!formData.photo && !formData.photoUrl) newErrors.photo = "Photo is required.";
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
      if (!formData.address) {
        newErrors.address = "Please enter an address or drop a pin on the map.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const nextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();           // ← stop any accidental form submit
    if (validateStep()) {
      setCurrentStep((s) => Math.min(s + 1, totalSteps));
    }
  };
  
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const data = new FormData();
    data.append("file", file);
    const response = await axios.post("/api/upload", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  };

  console.log(isSubmitting, 'isSubmitting')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
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
      const finalAirtableFields = mapFormDataToAirtableFields({
        ...formData,
        photoUrl,
        logoUrl,
      });
      const response = await axios.post("/api/updateMember", {
        recordId: initialData?.id,
        airtableId: initialData?.airtableId,
        updatedData: finalAirtableFields,
        mappedAirtableFields: finalAirtableFields,
      });
      console.log("Profile updated successfully:", response.data);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
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
        additionalFocus: alreadySelected ? prev.additionalFocus.filter((f) => f !== value) : [...prev.additionalFocus, value],
      };
    });
  };

  const handleToggleCategory = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const selected = (prev[field] as string[]) || [];
      const alreadySelected = selected.includes(value);
      return {
        ...prev,
        [field]: alreadySelected ? selected.filter((cat) => cat !== value) : [...selected, value],
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-12">
      {isSubmitted ? (
        <div className="max-w-xl bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">SUCCESS!</h2>
          <p className="text-gray-700 mb-4">
            Your profile has been updated. It will be reviewed and your new pin will appear on the map shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl bg-white p-6 rounded-lg shadow-md space-y-6">
          <div className="flex justify-center mb-6">
            <Image src={logo} alt="Logo" width={120} height={120} />
          </div>
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">Update Your BSN Profile</h1>
            <p className="text-gray-700">Please update your information below.</p>
          </div>
          {currentStep === 1 && (
            <Step1
              formData={formData}
              handleInputChange={handleInputChange}
              errors={errors}
              handleFileChange={handleFileChange}
              phoneInputRef={phoneInputRef}
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
              additionalFocusOpen={!!formData.showDropdown}
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
                disabled={isNextDisabled}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={false}
                className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
              >
                {false ? (
                  <>
                    <span className="animate-spin border-2 border-t-transparent border-white rounded-full w-5 h-5" />
                    Processing...
                  </>
                ) : (
                  "Update Profile"
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default BSNUpdateProfileForm;
