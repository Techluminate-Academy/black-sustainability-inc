"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import GooglePlacesAutocomplete, {
  geocodeByPlaceId,
  getLatLng,
} from "react-google-places-autocomplete";
import { allCountries } from "country-telephone-data";
import CountryCodeDropdown from "@/components/CountryCodeDropdown/CountryCodeDropdown";
import { HARDCODED_MEMBER_LEVELS } from '@/constants/member-levels';
import AirtableUtils from "@/pages/api/submitForm";

// Helper function to strip emojis and spaces for sorting
const stripEmojisAndSpaces = (str: string) => {
  // Remove emojis (surrogate pairs) and leading spaces
  // This regex matches emoji surrogate pairs without requiring the Unicode flag
  return str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/^\s+/, '');
};

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "Washington D.C.",
  "Puerto Rico", "U.S. Virgin Islands", "Guam"
];

const CANADIAN_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
  "Yukon"
];

const STATE_PROVINCE_OPTIONS = [...US_STATES, ...CANADIAN_PROVINCES].sort();

// Build international phone options
interface CountryData {
  dialCode: string;
  iso2: string;
  name: string;
}

interface CountryOption {
  value: string;
  label: string;
  iso2: string;
}

const internationalOptions: CountryOption[] = allCountries.map((country: CountryData) => ({
  value: `+${country.dialCode}-${country.iso2}`,
  label: country.name,
  iso2: country.iso2,
}));

interface FormData {
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
}

const initialFormData: FormData = {
  email: "",
  firstName: "",
  lastName: "",
  memberLevel: "",
  bio: "",
  organizationName: "",
  affiliatedEntity: "",
  photo: null,
  logo: null,
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
};

export default function BatchUploadPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [additionalFocusOpen, setAdditionalFocusOpen] = useState(false);
  const [similarCategoriesOpen, setSimilarCategoriesOpen] = useState(false);
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Dropdown options from Airtable
  const [identificationOptions, setIdentificationOptions] = useState<any[]>([]);
  const [genderOptions, setGenderOptions] = useState<any[]>([]);
  const [primaryIndustryOptions, setPrimaryIndustryOptions] = useState<any[]>([]);
  const [nameFromLocationOptions, setNameFromLocationOptions] = useState<any[]>([]);
  const [similarCategoriesOptions, setSimilarCategoriesOptions] = useState<any[]>([]);
  const [affiliatedEntityOptions, setAffiliatedEntityOptions] = useState<any[]>([]);

  // Fetch dropdown options from Airtable
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const dropdownData = await AirtableUtils.fetchTableMetadata();
        
        const identificationField = dropdownData.find((f: any) => f.fieldName === "IDENTIFICATION");
        if (identificationField) {
          const filteredIdentifications = identificationField.options.filter(
            (opt: any) => opt.name !== "IDENTIFICATION"
          );
          const sortedIdentifications = filteredIdentifications.slice().sort(
            (a: any, b: any) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })
          );
          setIdentificationOptions(sortedIdentifications);
        }
        
        const genderField = dropdownData.find((f: any) => f.fieldName === "GENDER");
        setGenderOptions(genderField?.options || []);
        
        const primaryIndustryField = dropdownData.find((f: any) => f.fieldName === "PRIMARY INDUSTRY HOUSE");
        if (primaryIndustryField) {
          const cleanedOptions = primaryIndustryField.options.filter(
            (item: any) => item.name !== "PRIMARY INDUSTRY HOUSE"
          );
          const uniqueOptions = cleanedOptions.filter((item: any, index: number, self: any[]) => 
            index === self.findIndex((t: any) => t.name === item.name)
          );
          const sortedIndustry = uniqueOptions.slice().sort((a: any, b: any) => {
            const aName = stripEmojisAndSpaces(a.name);
            const bName = stripEmojisAndSpaces(b.name);
            return aName.localeCompare(bName, "en", { sensitivity: "base" });
          });
          setPrimaryIndustryOptions(sortedIndustry);
        }
        
        const nameFromLocationField = dropdownData.find((f: any) => f.fieldName === "Name (from Location)");
        setNameFromLocationOptions(nameFromLocationField?.options || []);
        
        const similarCategoriesField = dropdownData.find((f: any) => f.fieldName === "Similar Categories");
        setSimilarCategoriesOptions(similarCategoriesField?.options || []);
        
        // Check for Affiliated Entity field - try different possible field names
        const affiliatedEntityField = dropdownData.find((f: any) => 
          f.fieldName === "AFFILIATED ENTITY" || 
          f.fieldName === "Affiliated Entity" ||
          f.fieldName === "AFFILIATED ENTITY (optional)"
        );
        
        console.log("Affiliated Entity field found:", affiliatedEntityField);
        
        if (affiliatedEntityField) {
          console.log("Affiliated Entity field type:", affiliatedEntityField.fieldType);
          console.log("Affiliated Entity options:", affiliatedEntityField.options);
          
          // If it's a single-select or multi-select with options, use them
          if (affiliatedEntityField.options && affiliatedEntityField.options.length > 0) {
            setAffiliatedEntityOptions(affiliatedEntityField.options);
          } else {
            // Field exists but has no options (likely a text field)
            console.log("Affiliated Entity field exists but has no dropdown options - will use text input");
            setAffiliatedEntityOptions([]);
          }
        } else {
          console.log("Affiliated Entity field not found in Airtable metadata - will use text input");
          setAffiliatedEntityOptions([]);
        }
      } catch (error) {
        console.error("Error fetching dropdown options:", error);
      }
    };

    fetchDropdownOptions();
  }, []);

  const updateField = (key: keyof FormData, value: any) => {
    setFormData({ ...formData, [key]: value });
    if (errors[key]) {
      setErrors({ ...errors, [key]: undefined });
    }
  };

  const handleToggleFocus = (value: string) => {
    const current = formData.additionalFocus;
    if (current.includes(value)) {
      updateField("additionalFocus", current.filter(f => f !== value));
    } else {
      updateField("additionalFocus", [...current, value]);
    }
  };

  const handleToggleCategory = (value: string) => {
    const current = formData.similarCategories;
    if (current.includes(value)) {
      updateField("similarCategories", current.filter(c => c !== value));
    } else {
      updateField("similarCategories", [...current, value]);
    }
  };

  const handleFileChange = (field: "photo" | "logo", file: File | null) => {
    updateField(field, file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField(field === "photo" ? "photoUrl" : "logoUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      updateField(field === "photo" ? "photoUrl" : "logoUrl", undefined);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.memberLevel) newErrors.memberLevel = "Member level is required";
    if (!formData.bio) newErrors.bio = "Bio is required";
    if (!formData.identification) newErrors.identification = "Identification is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.primaryIndustry) newErrors.primaryIndustry = "Primary industry is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.nearestCity) newErrors.nearestCity = "Nearest city is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Submitting your information...");

    try {
      // Map BSN form data to MongoDB format (matching BatchUploadRow interface)
      const apiRow = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        memberLevel: formData.memberLevel,
        bio: formData.bio,
        organizationName: formData.organizationName || undefined,
        affiliatedEntity: formData.affiliatedEntity || undefined,
        photo: formData.photo || undefined,
        photoUrl: formData.photoUrl || undefined,
        logo: formData.logo || undefined,
        logoUrl: formData.logoUrl || undefined,
        identification: formData.identification,
        gender: formData.gender,
        website: formData.website || undefined,
        phoneCountryCode: formData.phoneCountryCode || undefined,
        phone: formData.phone || undefined,
        additionalFocus: formData.additionalFocus.length > 0 ? formData.additionalFocus : undefined,
        primaryIndustry: formData.primaryIndustry,
        address: formData.address,
        zipCode: formData.zipCode || undefined,
        youtube: formData.youtube || undefined,
        nearestCity: formData.nearestCity,
        nameFromLocation: formData.nameFromLocation || undefined,
        fundingGoal: formData.fundingGoal || undefined,
        similarCategories: formData.similarCategories.length > 0 ? formData.similarCategories : undefined,
        naicsCode: formData.naicsCode || undefined,
        includeOnMap: formData.includeOnMap || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      };

      const response = await fetch('/api/batch-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows: [apiRow] }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      toast.success(data.message || "Your information has been submitted successfully! You will receive a confirmation email shortly.", { duration: 6000 });

      // Reset form after successful submission
      setFormData(initialFormData);
      setErrors({});
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Submission failed: ${error.message || 'Unknown error'}`);
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Submit Your Information
            </h1>
            <p className="text-gray-600">
              Fill out the form below to submit your information for membership. Your account will be created shortly and you will receive a confirmation email.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Please share your primary email address.</p>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.email ? "border-red-500" : "border-gray-300"}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">What is your first name?</p>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.firstName ? "border-red-500" : "border-gray-300"}`}
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">What is your last name/surname?</p>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.lastName ? "border-red-500" : "border-gray-300"}`}
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member Level <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">In what capacity are you joining this network?</p>
                  <select
                    value={formData.memberLevel}
                    onChange={(e) => updateField("memberLevel", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.memberLevel ? "border-red-500" : "border-gray-300"}`}
                  >
                    <option value="">Select</option>
                    {HARDCODED_MEMBER_LEVELS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.memberLevel && <p className="text-red-500 text-xs mt-1">{errors.memberLevel}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => updateField("organizationName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio / Profile <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Tell us about yourself and/or your organization.</p>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.bio ? "border-red-500" : "border-gray-300"}`}
                  />
                  {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Share your headshot and/or logo to complete your profile.</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange("photo", e.target.files?.[0] || null)}
                    className="mt-1"
                  />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
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
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Personal Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identification <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.identification}
                    onChange={(e) => updateField("identification", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.identification ? "border-red-500" : "border-gray-300"}`}
                  >
                    <option value="">Select</option>
                    {identificationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.identification && <p className="text-red-500 text-xs mt-1">{errors.identification}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.gender ? "border-red-500" : "border-gray-300"}`}
                  >
                    <option value="">Select</option>
                    {genderOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <p className="text-xs text-gray-500 mb-2">Do you have a website? Share below.</p>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-xs text-gray-500 mb-2">
                    OPTIONAL: we want to ensure you receive BSN membership info from us via email, then sms/text as a secondary option.
                  </p>
                  <div className="flex w-full">
                    <CountryCodeDropdown
                      value={formData.phoneCountryCode}
                      onChange={(value) => updateField("phoneCountryCode", value)}
                      options={internationalOptions}
                    />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="13125811589"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Industry & Focus */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Industry & Focus</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Industry House <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">What is your primary field of EXPERTISE?</p>
                  <select
                    value={formData.primaryIndustry}
                    onChange={(e) => updateField("primaryIndustry", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.primaryIndustry ? "border-red-500" : "border-gray-300"}`}
                  >
                    <option value="">Select</option>
                    {primaryIndustryOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.primaryIndustry && <p className="text-red-500 text-xs mt-1">{errors.primaryIndustry}</p>}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Focus Areas</label>
                  <p className="text-xs text-gray-500 mb-2">If you have additional areas of expertise/interest, select all below.</p>
                  <div
                    className="w-full border border-gray-300 rounded-lg p-2 cursor-pointer min-h-[42px]"
                    onClick={() => setAdditionalFocusOpen(!additionalFocusOpen)}
                  >
                    <div className="flex flex-wrap gap-2">
                      {formData.additionalFocus.length === 0 ? (
                        <span className="text-gray-400">Select additional focus areas...</span>
                      ) : (
                        formData.additionalFocus.map((focus) => (
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
                        ))
                      )}
                    </div>
                  </div>
                  {additionalFocusOpen && (
                    <div className="absolute z-10 bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-auto w-full">
                      {primaryIndustryOptions.map((option) => (
                        <div
                          key={option.id}
                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                          onClick={() => {
                            handleToggleFocus(option.name);
                          }}
                        >
                          {option.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location & Categories */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Location & Categories</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (Country) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Where in the world are you?</p>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.address ? "border-red-500" : "border-gray-300"}`}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (City) <span className="text-red-500">*</span>
                  </label>
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
                            updateField("nearestCity", selection.label);
                            try {
                              const placeId = selection.value.place_id;
                              const results = await geocodeByPlaceId(placeId);
                              const { lat, lng } = await getLatLng(results[0]);
                              updateField("latitude", lat);
                              updateField("longitude", lng);
                            } catch (error) {
                              console.error("Error getting lat/lng from address", error);
                            }
                          } else {
                            updateField("nearestCity", "");
                            updateField("latitude", null);
                            updateField("longitude", null);
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
                    <input
                      type="text"
                      value={formData.nearestCity}
                      onChange={(e) => updateField("nearestCity", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg ${errors.nearestCity ? "border-red-500" : "border-gray-300"}`}
                    />
                  )}
                  {errors.nearestCity && <p className="text-red-500 text-xs mt-1">{errors.nearestCity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip/Postal Code</label>
                  <p className="text-xs text-gray-500 mb-2">Enter your zip code/postal code if available. This will allow other members to find you geographically.</p>
                  <input
                    type="text"
                    value={formData.zipCode === 0 ? "" : formData.zipCode}
                    onChange={(e) => {
                      const numericValue = parseInt(e.target.value, 10);
                      updateField("zipCode", isNaN(numericValue) ? 0 : numericValue);
                    }}
                    placeholder="e.g., 60628"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                  <p className="text-xs text-gray-500 mb-2">Do you have a video to share/showcase your work with other members?</p>
                  <input
                    type="url"
                    value={formData.youtube}
                    onChange={(e) => updateField("youtube", e.target.value)}
                    placeholder="Enter YouTube link"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (from Location)</label>
                  <select
                    value={formData.nameFromLocation}
                    onChange={(e) => updateField("nameFromLocation", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Find an option</option>
                    {nameFromLocationOptions.map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Funding Goal</label>
                  <p className="text-xs text-gray-500 mb-2">Are you working on a project that needs funding? Share your goal - we may be able to support you!</p>
                  <textarea
                    value={formData.fundingGoal}
                    onChange={(e) => updateField("fundingGoal", e.target.value)}
                    placeholder="Any project that needs funding..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Similar Categories</label>
                  <div
                    className="w-full border border-gray-300 rounded-lg p-2 cursor-pointer min-h-[42px]"
                    onClick={() => setSimilarCategoriesOpen(!similarCategoriesOpen)}
                  >
                    <div className="flex flex-wrap gap-2">
                      {formData.similarCategories.length === 0 ? (
                        <span className="text-gray-400">Select similar categories...</span>
                      ) : (
                        formData.similarCategories.map((category) => (
                          <span
                            key={category}
                            className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full cursor-pointer"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              handleToggleCategory(category);
                            }}
                          >
                            {category} ✕
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  {similarCategoriesOpen && (
                    <div className="absolute z-10 bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-auto w-full">
                      {similarCategoriesOptions.map((option) => (
                        <div
                          key={option.id}
                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                          onClick={() => {
                            handleToggleCategory(option.name);
                          }}
                        >
                          {option.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NAICS Code</label>
                  <p className="text-xs text-gray-500 mb-2">
                    If you want to be considered for collaborative opportunities, please share your NAICS code(s). List in order of priority focus.
                  </p>
                  <input
                    type="text"
                    value={formData.naicsCode}
                    onChange={(e) => updateField("naicsCode", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Include me on Global BSN Map</label>
                  <p className="text-xs text-gray-500 mb-4">Check the box to be included. Leave blank if you do NOT want to be on the map</p>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeOnMap"
                      checked={formData.includeOnMap}
                      onChange={(e) => updateField("includeOnMap", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affiliated Entity</label>
                  <p className="text-xs text-gray-500 mb-2">
                    If you were referred by another org to use this map, list the name of the organization you are affiliated with.
                  </p>
                  {affiliatedEntityOptions.length > 0 ? (
                    <select
                      value={formData.affiliatedEntity}
                      onChange={(e) => updateField("affiliatedEntity", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select affiliated entity</option>
                      {affiliatedEntityOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.affiliatedEntity}
                      onChange={(e) => updateField("affiliatedEntity", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter affiliated entity"
                    />
                  )}
                </div>
              </div>
            </div>


            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-lg text-white font-semibold flex items-center gap-2 ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-sm text-gray-600">
            <p><strong>Note:</strong> Required fields are marked with <span className="text-red-600">*</span></p>
            <p className="mt-2">After submission, you will receive a confirmation email. Your account will be created shortly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
