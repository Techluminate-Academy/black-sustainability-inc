// features/freeSignup/useFreeSignupForm.ts

import { useState, useEffect } from "react";
import {
  FreeSubmissionPayload,
  sendToAirtable,
} from "./freeSignupService";
import AirtableUtils from "@/pages/api/submitForm";
import { geocodeByPlaceId, getLatLng } from "react-google-places-autocomplete";

export interface FreeFormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  primaryIndustry: string;
  organizationName: string;
  bio: string;
}

export type FreeFormErrors = Partial<Record<keyof FreeFormData, string>>;

export function useFreeSignupForm() {
  const [formData, setFormData] = useState<FreeFormData>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    latitude: null,
    longitude: null,
    primaryIndustry: "",
    organizationName: "",
    bio: "",
  });

  const [errors, setErrors] = useState<FreeFormErrors>({});
  const [industryOptions, setIndustryOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load “Primary Industry House” options once
  useEffect(() => {
    (async () => {
      try {
        const metadata = await AirtableUtils.fetchTableMetadata();
        const field = metadata.find(
          (f: any) => f.fieldName === "PRIMARY INDUSTRY HOUSE"
        );
        if (field) {
          const filtered = field.options
            .filter((opt: any) => opt.name !== "PRIMARY INDUSTRY HOUSE")
            .sort((a: any, b: any) => {
              const strip = (s: string) => s.replace(/^[^a-zA-Z]+/, "").trim();
              return strip(a.name).localeCompare(strip(b.name), "en", {
                sensitivity: "base",
              });
            })
            .map((o: any) => ({ id: o.id, name: o.name }));
          setIndustryOptions(filtered);
        }
      } catch (err) {
        console.error("Error loading industry options:", err);
      }
    })();
  }, []);

  const validate = (): boolean => {
    const newErrors: FreeFormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";

    if (!formData.email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Enter a valid email.";

    if (!formData.address.trim()) newErrors.address = "Address is required.";
    if (formData.latitude === null || formData.longitude === null)
      newErrors.address = "Select a valid address from suggestions.";

    if (!formData.primaryIndustry)
      newErrors.primaryIndustry = "Primary industry is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddressSelect = async (val: any) => {
    if (!val) {
      setFormData((prev) => ({
        ...prev,
        address: "",
        latitude: null,
        longitude: null,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, address: val.label }));
    try {
      const results = await geocodeByPlaceId(val.value.place_id);
      const { lat, lng } = await getLatLng(results[0]);
      setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    } catch (geoErr) {
      console.error("Geocoding error:", geoErr);
      setFormData((prev) => ({ ...prev, latitude: null, longitude: null }));
    }
  };

  const handleFieldChange = (field: keyof FreeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const payload: FreeSubmissionPayload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      address: formData.address,
      latitude: formData.latitude!,
      longitude: formData.longitude!,
      primaryIndustry: formData.primaryIndustry,
      ...(formData.organizationName ? { organizationName: formData.organizationName } : {}),
      ...(formData.bio ? { bio: formData.bio } : {}),
    };

    try {
      await sendToAirtable(payload);
      // await sendToMongo(payload); // currently omitted
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error during submission:", err);
      // Optionally set a global “submit failure” error here
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    industryOptions,
    isSubmitting,
    isSubmitted,
    handleFieldChange,
    handleAddressSelect,
    handleSubmit,
  };
}
