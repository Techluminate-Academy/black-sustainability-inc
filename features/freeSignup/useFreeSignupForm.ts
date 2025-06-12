// features/freeSignup/useFreeSignupForm.ts

import { useState, useEffect } from "react";
import axios from "axios";
import {
  FreeFormData,
  FormState,
  FormError,
  GooglePlacesOption,
  IndustryOption,
  AirtableSubmissionPayload
} from "./types";
import AirtableUtils from "@/features/freeSignup/airtableUtils";
import { geocodeByPlaceId, getLatLng } from "react-google-places-autocomplete";
import { uploadFile, sendToAirtable, FreeSubmissionPayload } from "./freeSignupService";

export function useFreeSignupForm() {
  const [formState, setFormState] = useState<FormState>({
    data: {
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      latitude: null,
      longitude: null,
      primaryIndustry: "",
      organizationName: "",
      bio: "",
      photo: null,
      logo: null,
      form: "",
    },
    errors: [],
    isDirty: false,
    isSubmitting: false,
    isSubmitted: false,
    touched: []
  });

  const [industryOptions, setIndustryOptions] = useState<IndustryOption[]>([]);

  // Load "Primary Industry House" options once
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
        setFormState(prev => ({
          ...prev,
          errors: [...prev.errors, {
            field: "primaryIndustry",
            message: "Failed to load industry options"
          }]
        }));
      }
    })();
  }, []);

  const validateField = (field: keyof FreeFormData, value: any): string | null => {
    const stringValue = typeof value === 'number' ? value.toString() : value || "";
    
    switch (field) {
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) return "Enter a valid email.";
        if (!stringValue.trim()) return "Email is required.";
        return null;
      case "firstName":
        if (!stringValue.trim()) return "First name is required.";
        return null;
      case "lastName":
        if (!stringValue.trim()) return "Last name is required.";
        return null;
      case "address":
        if (!stringValue.trim()) return "Address is required.";
        if (formState.data.latitude === null || formState.data.longitude === null) {
          return "Select a valid address from suggestions.";
        }
        return null;
      case "primaryIndustry":
        if (!stringValue) return "Primary industry is required.";
        return null;
      case "photo":
        if (!value) return "Profile photo is required.";
        return null;
      case "logo":
        // Logo is optional
        return null;
      default:
        return null;
    }
  };

  const validate = (fieldsToValidate?: Array<keyof FreeFormData>): boolean => {
    const newErrors: FormError[] = [];
    const requiredFields: (keyof FreeFormData)[] = fieldsToValidate || [
      "firstName",
      "lastName",
      "email",
      "address",
      "primaryIndustry",
      "photo"
    ];

    requiredFields.forEach(field => {
      const error = validateField(field, formState.data[field] || "");
      if (error) {
        newErrors.push({ field, message: error });
      }
    });

    setFormState(prev => ({
      ...prev,
      errors: newErrors
    }));

    return newErrors.length === 0;
  };

  const handleAddressSelect = async (val: GooglePlacesOption | null): Promise<void> => {
    if (!val) {
      setFormState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          address: "",
          latitude: null,
          longitude: null
        },
        touched: [...prev.touched, "address"]
      }));
      return;
    }

    setFormState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        address: val.label
      },
      touched: [...prev.touched, "address"]
    }));

    try {
      const results = await geocodeByPlaceId(val.value.place_id);
      const { lat, lng } = await getLatLng(results[0]);
      setFormState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          latitude: lat,
          longitude: lng
        }
      }));
    } catch (error) {
      console.error("Geocoding error:", error);
      setFormState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          latitude: null,
          longitude: null
        },
        errors: [...prev.errors, {
          field: "address",
          message: "Failed to get location coordinates"
        }]
      }));
    }
  };

  const handleFieldChange = (field: keyof FreeFormData, value: string): void => {
    // Validate the field immediately
    const error = validateField(field, value);

    setFormState(prev => {
      // Remove any previous error for this field
      const filteredErrors = prev.errors.filter(e => e.field !== field);
      // Add new error if present
      const newErrors = error
        ? [...filteredErrors, { field, message: error }]
        : filteredErrors;

      return {
        ...prev,
        data: { ...prev.data, [field]: value },
        touched: Array.from(new Set([...prev.touched, field])),
        isDirty: true,
        errors: newErrors,
      };
    });
  };

  const handleFileChange = async (field: keyof FreeFormData, file: File | null): Promise<void> => {
    // Clear any existing errors for this field
    setFormState(prev => ({
      ...prev,
      errors: prev.errors.filter(e => e.field !== field)
    }));

    if (!file) {
      setFormState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          [field]: null,
          [`${field}Url`]: undefined
        },
        touched: Array.from(new Set([...prev.touched, field]))
      }));
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          field,
          message: "Please upload a valid image file (JPEG, PNG, GIF, or WEBP)"
        }]
      }));
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFormState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          field,
          message: "File size must be less than 5MB"
        }]
      }));
      return;
    }

    setFormState(prev => ({
      ...prev,
      data: { ...prev.data, [field]: file },
      touched: Array.from(new Set([...prev.touched, field]))
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) {
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, errors: [] }));

    try {
      let photoUrl: string | undefined = undefined;
      let logoUrl: string | undefined = undefined;

      if (formState.data.photo) {
        photoUrl = await uploadFile(formState.data.photo);
      }
      if (formState.data.logo) {
        logoUrl = await uploadFile(formState.data.logo);
      }
      
      const submissionData: FreeSubmissionPayload = {
        firstName: formState.data.firstName,
        lastName: formState.data.lastName,
        email: formState.data.email,
        address: formState.data.address,
        latitude: formState.data.latitude,
        longitude: formState.data.longitude,
        primaryIndustry: formState.data.primaryIndustry,
        organizationName: formState.data.organizationName,
        bio: formState.data.bio,
        photoUrl,
        logoUrl,
      };

      await sendToAirtable(submissionData);

      setFormState(prev => ({ ...prev, isSubmitting: false, isSubmitted: true }));
    } catch (error) {
      console.error("Submission failed:", error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: [{
          field: "form",
          message: "An unexpected error occurred during submission."
        }]
      }));
    }
  };

  return {
    formData: formState.data,
    errors: Object.fromEntries(
      formState.errors.map(error => [error.field, error.message])
    ) as Partial<Record<keyof FreeFormData, string>>,
    industryOptions,
    isSubmitting: formState.isSubmitting,
    isSubmitted: formState.isSubmitted,
    handleFieldChange,
    handleFileChange,
    handleAddressSelect,
    handleSubmit,
    touched: formState.touched,
    validate,
  };
}
