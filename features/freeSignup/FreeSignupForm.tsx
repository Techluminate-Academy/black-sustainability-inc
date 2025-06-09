"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { FreeFormData, GooglePlacesOption, IndustryOption } from "./types";
import logo from "@/public/png/bsn-logo.png";

interface FreeSignupFormProps {
  formData: FreeFormData;
  errors: Partial<Record<keyof FreeFormData, string>>;
  industryOptions: IndustryOption[];
  isSubmitting: boolean;
  isSubmitted: boolean;
  onFieldChange: (field: keyof FreeFormData, value: string) => void;
  onFileChange: (field: keyof FreeFormData, file: File | null) => void;
  onAddressSelect: (val: GooglePlacesOption | null) => void;
  onSubmit: () => void;
  touched: Array<keyof FreeFormData>;
}

const FreeSignupForm: React.FC<FreeSignupFormProps> = ({
  formData,
  errors,
  industryOptions,
  isSubmitting,
  isSubmitted,
  onFieldChange,
  onFileChange,
  onAddressSelect,
  onSubmit,
  touched,
}) => {
  const router = useRouter();

  // If form has been submitted, show a thank-you screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg text-center">
          <div className="mb-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-3">Thank you!</h2>
          <p className="text-gray-600 mb-6">
            Your free listing is now on our map. We'll review your information and follow up if needed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 min-h-[44px]"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Show form-wide errors if any
  const formError = errors.form;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 bg-gray-100">
      <div className="w-full sm:w-1/2 mx-auto bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-xl">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <Image
            src={logo}
            alt="BSN Logo"
            width={120}
            height={120}
            className="mb-3 sm:mb-4 w-auto h-auto"
            priority
          />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2 text-center">
            Black Sustainability Network (BSN) Map Listing
          </h1>
          <p className="text-sm sm:text-base text-gray-600 text-center px-2 sm:px-4">
            Welcome to the first step in joining our community of sustainability practitioners.
          </p>
        </div>

        {/* Form-wide error message */}
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm font-medium">{formError}</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4 sm:space-y-5"
        >
          {/* First Name */}
          <div className="form-field">
            <label 
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              First Name <span className="text-red-600">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => onFieldChange("firstName", e.target.value)}
              className={`
                w-full
                px-4
                py-3
                text-base
                border
                rounded-lg
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-1
                ${errors.firstName 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
                }
                transition-colors
                duration-200
              `}
              placeholder="Enter your first name"
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
              aria-required="true"
              autoFocus
            />
            {errors.firstName && touched.includes('firstName') && (
              <p 
                id="firstName-error"
                role="alert"
                className="mt-1.5 text-sm text-red-600 font-medium"
                aria-live="polite"
              >
                {errors.firstName}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="form-field">
            <label 
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Last Name <span className="text-red-600">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => onFieldChange("lastName", e.target.value)}
              className={`
                w-full
                px-4
                py-3
                text-base
                border
                rounded-lg
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-1
                ${errors.lastName 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
                }
                transition-colors
                duration-200
              `}
              placeholder="Enter your last name"
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
              aria-required="true"
            />
            {errors.lastName && touched.includes('lastName') && (
              <p 
                id="lastName-error"
                role="alert"
                className="mt-1.5 text-sm text-red-600 font-medium"
                aria-live="polite"
              >
                {errors.lastName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="form-field">
            <label 
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              className={`
                w-full
                px-4
                py-3
                text-base
                border
                rounded-lg
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-1
                ${errors.email 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
                }
                transition-colors
                duration-200
              `}
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-required="true"
            />
            {errors.email && touched.includes('email') && (
              <p 
                id="email-error"
                role="alert"
                className="mt-1.5 text-sm text-red-600 font-medium"
                aria-live="polite"
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Photo Upload */}
          <div className="form-field">
            <label 
              htmlFor="photo"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Profile Photo <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Upload a clear photo of yourself</p>
            {formData.photoUrl && (
              <div className="mb-3">
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
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange("photo", e.target.files ? e.target.files[0] : null)}
              className={`
                w-full
                px-4
                py-3
                text-base
                border
                rounded-lg
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-1
                ${errors.photo 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
                }
                transition-colors
                duration-200
              `}
              aria-invalid={!!errors.photo}
              aria-describedby={errors.photo ? "photo-error" : undefined}
              aria-required="true"
            />
            {errors.photo && touched.includes('photo') && (
              <p 
                id="photo-error"
                role="alert"
                className="mt-1.5 text-sm text-red-600 font-medium"
                aria-live="polite"
              >
                {errors.photo}
              </p>
            )}
          </div>

          {/* Logo Upload */}
          <div className="form-field">
            <label 
              htmlFor="logo"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Organization Logo
            </label>
            <p className="text-xs text-gray-500 mb-2">Optional: Upload your organization's logo if applicable</p>
            {formData.logoUrl && (
              <div className="mb-3">
                <Image
                  src={formData.logoUrl}
                  alt="Logo preview"
                  width={120}
                  height={120}
                  className="rounded-lg object-contain"
                />
              </div>
            )}
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange("logo", e.target.files ? e.target.files[0] : null)}
              className={`
                w-full
                px-4
                py-3
                text-base
                border
                rounded-lg
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-1
                ${errors.logo 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
                }
                transition-colors
                duration-200
              `}
              aria-invalid={!!errors.logo}
              aria-describedby={errors.logo ? "logo-error" : undefined}
            />
            {errors.logo && touched.includes('logo') && (
              <p 
                id="logo-error"
                role="alert"
                className="mt-1.5 text-sm text-red-600 font-medium"
                aria-live="polite"
              >
                {errors.logo}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="form-field">
            <label 
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Address <span className="text-red-600">*</span>
            </label>
            <GooglePlacesAutocomplete
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
              autocompletionRequest={{ types: ["address"] }}
              selectProps={{
                value: formData.address
                  ? { label: formData.address, value: { place_id: "", structured_formatting: { main_text: "", secondary_text: "" } } }
                  : null,
                onChange: onAddressSelect,
                placeholder: "Start typing your address...",
                styles: {
                  control: (provided, state) => ({
                    ...provided,
                    minHeight: '42px',
                    padding: '2px',
                    borderColor: errors.address ? '#f87171' : '#d1d5db',
                    borderRadius: '0.5rem',
                    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
                    '&:hover': {
                      borderColor: errors.address ? '#f87171' : '#9ca3af',
                    },
                    '@media (max-width: 640px)': {
                      fontSize: '16px',
                    }
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 1000,
                    marginTop: '4px',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: state.isFocused ? '#f3f4f6' : 'white',
                  }),
                  dropdownIndicator: () => ({
                    display: "none",
                  }),
                  indicatorSeparator: () => ({
                    display: "none",
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: "#374151",
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: "#374151",
                  }),
                },
                className: "mt-1",
                classNamePrefix: "",
                theme: (theme) => ({
                  ...theme,
                  borderRadius: 8,
                  colors: {
                    ...theme.colors,
                    primary: '#3b82f6',
                    primary25: '#eff6ff',
                    neutral0: "white",
                    neutral20: errors.address ? '#f87171' : '#d1d5db',
                    neutral30: errors.address ? '#f87171' : '#9ca3af',
                  },
                }),
              }}
            />
            {errors.address && touched.includes('address') && (
              <p 
                id="address-error"
                role="alert"
                className="mt-1.5 text-sm text-red-600 font-medium"
                aria-live="polite"
              >
                {errors.address}
              </p>
            )}
          </div>

          {/* Primary Industry House */}
          <div className="form-field">
            <label 
              htmlFor="primaryIndustry"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Primary Industry House <span className="text-red-600">*</span>
            </label>
            <select
              id="primaryIndustry"
              value={formData.primaryIndustry}
              onChange={(e) => onFieldChange("primaryIndustry", e.target.value)}
              className={`
                w-full
                px-4
                py-3
                text-base
                border
                rounded-lg
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-1
                ${errors.primaryIndustry 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
                }
                transition-colors
                duration-200
                appearance-none
                bg-white
              `}
              aria-invalid={!!errors.primaryIndustry}
              aria-describedby={errors.primaryIndustry ? "primaryIndustry-error" : undefined}
              aria-required="true"
            >
              <option value="">Select one…</option>
              {industryOptions.map((opt) => (
                <option key={opt.id} value={opt.name}>
                  {opt.name}
                </option>
              ))}
            </select>
            {errors.primaryIndustry && touched.includes('primaryIndustry') && (
              <p 
                id="primaryIndustry-error"
                role="alert"
                className="mt-1.5 text-sm text-red-600 font-medium"
                aria-live="polite"
              >
                {errors.primaryIndustry}
              </p>
            )}
          </div>

          {/* Organization Name */}
          <div className="form-field">
            <label 
              htmlFor="organizationName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Organization Name (optional)
            </label>
            <input
              id="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={(e) => onFieldChange("organizationName", e.target.value)}
              className="
                w-full
                px-4
                py-3
                text-base
                border
                border-gray-300
                rounded-lg
                focus:ring-2
                focus:ring-blue-200
                focus:ring-offset-1
                transition-colors
                duration-200
              "
              placeholder="Enter organization name"
            />
          </div>

          {/* Bio */}
          <div className="form-field">
            <label 
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Bio (optional)
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => onFieldChange("bio", e.target.value.slice(0, 250))}
              className="
                w-full
                px-4
                py-3
                text-base
                border
                border-gray-300
                rounded-lg
                focus:ring-2
                focus:ring-blue-200
                focus:ring-offset-1
                transition-colors
                duration-200
                min-h-[100px]
                resize-y
              "
              placeholder="Briefly describe your work…"
              rows={4}
              aria-describedby="bio-counter"
            />
            <div className={`flex justify-end text-xs mt-1 ${formData.bio.length === 250 ? 'text-red-600 font-semibold' : 'text-gray-500'}`} id="bio-counter">
              {formData.bio.length}/250 characters
              {formData.bio.length === 250 && (
                <span className="ml-2">Character limit reached</span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 sm:pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`
                w-full
                relative
                py-3
                px-5
                text-base
                font-medium
                rounded-lg
                transition-all
                duration-200
                ${isSubmitting 
                  ? 'bg-green-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                }
                text-white
                flex
                items-center
                justify-center
                gap-2
                min-h-[44px]'
              `}
              aria-disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin border-2 border-t-transparent border-white rounded-full w-5 h-5" />
                  <span>Submitting...</span>
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FreeSignupForm;
