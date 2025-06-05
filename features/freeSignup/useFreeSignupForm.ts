// features/freeSignup/useFreeSignupForm.ts

import { useState, useEffect } from "react";
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
      "primaryIndustry"
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

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    const payload: AirtableSubmissionPayload = {
      "FIRST NAME": formState.data.firstName,
      "LAST NAME": formState.data.lastName,
      "EMAIL ADDRESS": formState.data.email,
      "PRIMARY INDUSTRY HOUSE": formState.data.primaryIndustry,
      "Address": formState.data.address,
      "Latitude": formState.data.latitude!,
      "Longitude": formState.data.longitude!,
      "Featured": "checked",
      ...(formState.data.organizationName ? { "ORGANIZATION NAME": formState.data.organizationName } : {}),
      ...(formState.data.bio ? { "BIO": formState.data.bio } : {})
    };

    try {
      await AirtableUtils.submitToAirtable(payload);
      setFormState(prev => ({ ...prev, isSubmitted: true }));
    } catch (error) {
      console.error("Error during submission:", error);
      setFormState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          field: "form",
          message: "Failed to submit form. Please try again."
        }]
      }));
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
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
    handleAddressSelect,
    handleSubmit,
    touched: formState.touched,
    validate,
  };
}
