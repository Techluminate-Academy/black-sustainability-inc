"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import { allCountries } from "country-telephone-data";
import logo from '@/public/png/bsn-logo.png';
import CountryCodeDropdown from "../../components/CountryCodeDropdown/CountryCodeDropdown";
import AirtableUtils from "@/pages/api/submitForm";
import { UpgradeFormData, FreeUserData } from "./types";
import { submitUpgrade, uploadFile } from "./upgradeService";

interface CountryData {
  dialCode: string;
  iso2: string;
  name: string;
}

const internationalOptions: { code: string; country: string; iso2: string }[] =
  allCountries.map((country: CountryData) => ({
    code: `+${country.dialCode}`,
    country: country.name,
    iso2: country.iso2,
  }));

interface UpgradeFormProps {
  userData: FreeUserData;
  onLogout: () => void;
}

const UpgradeForm: React.FC<UpgradeFormProps> = ({ userData, onLogout }) => {
  const [formData, setFormData] = useState<UpgradeFormData>({
    // Pre-populate from free signup data
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    bio: userData.bio || "",
    organizationName: userData.organizationName || "",
    primaryIndustry: userData.primaryIndustry,
    address: userData.address,
    latitude: userData.latitude,
    longitude: userData.longitude,
    photoUrl: userData.photoUrl,
    logoUrl: userData.logoUrl,
    
    // New fields that need to be filled
    memberLevel: "",
    affiliatedEntity: "",
    photo: null,
    logo: null,
    identification: "",
    gender: "",
    website: "",
    phoneCountryCode: "+1-us",
    phone: "",
    additionalFocus: [],
    zipCode: 0,
    youtube: "",
    nearestCity: "",
    nameFromLocation: "",
    fundingGoal: "",
    similarCategories: [],
    naicsCode: "",
    includeOnMap: false,
    showDropdown: false,
    phoneCountryCodeTouched: false,
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Record<keyof UpgradeFormData, string>>>({});

  // Dropdown Data
  const [memberLevelOptions, setMemberLevelOptions] = useState<{ id: string; name: string; icon: string | null }[]>([]);
  const [identificationOptions, setIdentificationOptions] = useState<any[]>([]);
  const [genderOptions, setGenderOptions] = useState<any[]>([]);
  const [primaryIndustryOptions, setPrimaryIndustryOptions] = useState<any[]>([]);

  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  function stripEmojisAndSpaces(str: string) {
    return str.replace(/^[^a-zA-Z]+/, '').trim();
  }

  // Load dropdown options
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const dropdownData = await AirtableUtils.fetchTableMetadata();
        
        // Member Level options
        const memberLevelField = dropdownData.find((f: any) => f.fieldName === "MEMBER LEVEL");
        if (memberLevelField) {
          const allowedOptions = [
            "👓 Enthusiast -Excited to Learn",
            "🥋 Expert - Experienced Professional",
            "🏢 Entity - Black & Green Organization",
            "Young Environmental Scholar",
          ];

          const filteredOptions = memberLevelField.options.filter((o: any) =>
            allowedOptions.includes(o.name)
          );

          const sortedOptions = filteredOptions
            .slice()
            .sort((a: any, b: any) =>
              a.name.localeCompare(b.name, "en", { sensitivity: "base" })
            );

          setMemberLevelOptions(sortedOptions);
        }

        // Other dropdown options
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
          const sortedIndustry = cleanedOptions.slice().sort((a: any, b: any) => {
            const aName = stripEmojisAndSpaces(a.name);
            const bName = stripEmojisAndSpaces(b.name);
            return aName.localeCompare(bName, "en", { sensitivity: "base" });
          });
          setPrimaryIndustryOptions(sortedIndustry);
        }

      } catch (error) {
        console.error("Error fetching dropdown options:", error);
      }
    };
    fetchDropdownOptions();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpgradeFormData, string>> = {};
    
    if (!formData.email) newErrors.email = "Email is required.";
    if (!formData.firstName) newErrors.firstName = "First Name is required.";
    if (!formData.lastName) newErrors.lastName = "Last Name is required.";
    if (!formData.memberLevel) newErrors.memberLevel = "Member level is required.";
    if (!formData.bio) newErrors.bio = "Bio is required.";
    if (!formData.identification) newErrors.identification = "Identification is required.";
    if (!formData.gender) newErrors.gender = "Gender is required.";
    if (!formData.primaryIndustry) newErrors.primaryIndustry = "Primary industry is required.";
    
    // Photo validation
    if (!formData.photo && !formData.photoUrl) {
      newErrors.photo = "Profile photo is required.";
    }

    // Phone validation
    const fullPhone = formData.phoneCountryCode.split("-")[0] + formData.phone;
    const defaultCountry: CountryCode = (formData.phoneCountryCode.split("-")[1]?.toUpperCase() || "US") as CountryCode;
    const phoneNumber = parsePhoneNumberFromString(fullPhone, defaultCountry);
    if (!phoneNumber || !phoneNumber.isValid()) {
      newErrors.phone = "Please enter a valid phone number including country code.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      let photoUrl = formData.photoUrl;
      let logoUrl = formData.logoUrl;

      // Upload new photo if provided
      if (formData.photo) {
        photoUrl = await uploadFile(formData.photo);
      }

      // Upload new logo if provided
      if (formData.logo) {
        logoUrl = await uploadFile(formData.logo);
      }

      await submitUpgrade(formData, photoUrl, logoUrl);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit upgrade. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof UpgradeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: keyof UpgradeFormData, file: File | null) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));

    if (!file) {
      setFormData(prev => ({
        ...prev,
        [field]: null,
        ...(field === "photo" ? { photoUrl: "" } : { logoUrl: "" })
      }));
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [field]: "Please upload a valid image file (JPEG, PNG, GIF, or WEBP)"
      }));
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        [field]: "File size must be less than 5MB"
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      [field]: file,
      ...(field === "photo" ? { photoUrl: previewUrl } : { logoUrl: previewUrl })
    }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-12">
        <div className="max-w-xl bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            UPGRADE SUCCESSFUL!
          </h2>
          <p className="text-gray-700 mb-4">
            Your upgrade to paid membership has been submitted successfully! Our team will review your information and process your membership upgrade.
          </p>
          <p className="text-gray-700 mb-4">
            You will receive an email confirmation and further instructions on accessing your full member benefits.
          </p>
          <button
            onClick={onLogout}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-3xl bg-white p-6 rounded-lg shadow-md space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex justify-center flex-1">
            <Image
              src={logo}
              alt="Logo"
              width={120}
              height={120}
            />
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Sign Out
          </button>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Upgrade to Paid Membership
          </h1>
          <p className="text-gray-700">
            Welcome back, <strong>{userData.firstName}</strong>! Complete your upgrade to unlock full BSN membership benefits.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Pre-populated from your free signup:</strong> Some fields below are already filled with your existing information. You can update them if needed.
          </p>
        </div>

        {/* Simple form with all fields in one page for now */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              readOnly
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

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
            <div className="flex mt-1">
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
                className="flex-1 border border-gray-300 rounded-r-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter phone number"
              />
            </div>
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Member Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Member Level *</label>
            <select
              value={formData.memberLevel}
              onChange={(e) => handleInputChange("memberLevel", e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select member level...</option>
              {memberLevelOptions.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors.memberLevel && <p className="text-red-500 text-sm mt-1">{errors.memberLevel}</p>}
          </div>

          {/* Identification */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Identification *</label>
            <select
              value={formData.identification}
              onChange={(e) => handleInputChange("identification", e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select identification...</option>
              {identificationOptions.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors.identification && <p className="text-red-500 text-sm mt-1">{errors.identification}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender *</label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange("gender", e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select gender...</option>
              {genderOptions.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Bio *</label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            rows={4}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us about yourself and your sustainability work..."
          />
          {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio}</p>}
        </div>

        {/* Photo Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Photo *</label>
          <p className="text-xs text-gray-500">Upload a clear photo of yourself</p>
          {formData.photoUrl && (
            <div className="mt-2 mb-4">
              <Image
                src={formData.photoUrl}
                alt="Profile photo preview"
                width={120}
                height={120}
                className="rounded-lg object-cover"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange("photo", e.target.files ? e.target.files[0] : null)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Organization Logo</label>
          <p className="text-xs text-gray-500">Optional - Upload your organization's logo</p>
          {formData.logoUrl && (
            <div className="mt-2 mb-4">
              <Image
                src={formData.logoUrl}
                alt="Logo preview"
                width={120}
                height={120}
                className="rounded-lg object-cover"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange("logo", e.target.files ? e.target.files[0] : null)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin border-2 border-t-transparent border-white rounded-full w-5 h-5" />
                Processing Upgrade...
              </>
            ) : (
              "Upgrade to Paid Membership"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpgradeForm; 