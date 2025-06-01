// features/freeSignup/FreeSignupForm.tsx
"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { FreeFormData, FreeFormErrors } from "./useFreeSignupForm";
import logo from "@/public/png/bsn-logo.png";

interface FreeSignupFormProps {
  formData: FreeFormData;
  errors: FreeFormErrors;
  industryOptions: { id: string; name: string }[];
  isSubmitting: boolean;
  isSubmitted: boolean;
  onFieldChange: (field: keyof FreeFormData, value: string) => void;
  onAddressSelect: (val: any) => void;
  onSubmit: () => void;
}

const FreeSignupForm: React.FC<FreeSignupFormProps> = ({
  formData,
  errors,
  industryOptions,
  isSubmitting,
  isSubmitted,
  onFieldChange,
  onAddressSelect,
  onSubmit,
}) => {
  const router = useRouter();

  // If form has been submitted, show a centered thank-you card and a "Go to Home" button
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Thank you!</h2>
          <p className="text-gray-700 mb-6">
            Your free listing is now on our map. We’ll review your information and follow up if needed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Otherwise, show the form
  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 bg-gray-100">
      <div className="max-w-md sm:max-w-lg md:max-w-xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src={logo}
            alt="BSN Logo"
            width={100}
            height={100}
            className="mb-4"
          />
          <h1 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
            Black Sustainability Network (BSN) Map Listing
          </h1>
          <p className="text-gray-600 text-center px-4">
            Welcome to the first step in joining our community of sustainability
            practitioners. Fill out this form to appear on our free Global Map.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => onFieldChange("firstName", e.target.value)}
              className={`mt-1 w-full border ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              } rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => onFieldChange("lastName", e.target.value)}
              className={`mt-1 w-full border ${
                errors.lastName ? "border-red-500" : "border-gray-300"
              } rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              className={`mt-1 w-full border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <GooglePlacesAutocomplete
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
              selectProps={{
                value: formData.address
                  ? { label: formData.address, value: formData.address }
                  : null,
                onChange: onAddressSelect,
                placeholder: "Start typing your address...",
                className: `mt-1 w-full rounded-lg ${
                  errors.address
                    ? "border-red-500 border"
                    : "border-gray-300 border"
                }`,
              }}
              autocompletionRequest={{ types: ["address"] }}
            />
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address}</p>
            )}
          </div>

          {/* Primary Industry House */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Primary Industry House *
            </label>
            <select
              value={formData.primaryIndustry}
              onChange={(e) => onFieldChange("primaryIndustry", e.target.value)}
              className={`mt-1 w-full border ${
                errors.primaryIndustry ? "border-red-500" : "border-gray-300"
              } rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500`}
            >
              <option value="">Select one…</option>
              {industryOptions.map((opt) => (
                <option key={opt.id} value={opt.name}>
                  {opt.name}
                </option>
              ))}
            </select>
            {errors.primaryIndustry && (
              <p className="text-red-500 text-sm mt-1">
                {errors.primaryIndustry}
              </p>
            )}
          </div>

          {/* Organization Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organization Name (optional)
            </label>
            <input
              type="text"
              value={formData.organizationName}
              onChange={(e) => onFieldChange("organizationName", e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Bio (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bio (optional)
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => onFieldChange("bio", e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Briefly describe your work…"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 ${
                isSubmitting ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <span className="animate-spin border-2 border-t-transparent border-white rounded-full w-5 h-5" />
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FreeSignupForm;
