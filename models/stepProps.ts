import React from "react";
import { FormData } from "./formData";
import { FieldOption } from "./field";

export interface StepProps {
  formData: FormData;
  handleInputChange: (field: keyof FormData, value: any) => void;
  errors: Partial<Record<keyof FormData, string>>;

  // Step1
  handleFileChange?: (field: keyof FormData, file: File | null) => void;
  phoneInputRef?: React.RefObject<HTMLInputElement>;

  // Step2
  memberLevelOptions?: FieldOption[];
  identificationOptions?: FieldOption[];
  genderOptions?: FieldOption[];
  primaryIndustryOptions?: FieldOption[];
  handleToggleFocus?: (value: string) => void;
  additionalFocusOpen?: boolean;
  setFormData?: React.Dispatch<React.SetStateAction<FormData>>;

  // Step3
  nameFromLocationOptions?: FieldOption[];
  similarCategoriesOptions?: FieldOption[];
  showDropdown?: boolean;
  setShowDropdown?: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleCategory?: (field: keyof FormData, value: string) => void;
}
