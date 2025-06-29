// Google Places Autocomplete Types
export interface GooglePlacesOption {
  label: string;
  value: {
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  };
}

// Form Data Types
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
  photo: File | null;
  photoUrl?: string;
  logo: File | null;
  logoUrl?: string;
  form?: string;
}

// Industry Option Type
export interface IndustryOption {
  id: string;
  name: string;
}

// Form Error Types
export interface FormError {
  field: keyof FreeFormData;
  message: string;
}

export type FreeFormErrors = Partial<Record<keyof FreeFormData, string>>;

// Airtable Types
export interface AirtableSubmissionPayload {
  "FIRST NAME": string;
  "LAST NAME": string;
  "EMAIL ADDRESS": string;
  "PRIMARY INDUSTRY HOUSE": string;
  "Address": string;
  "Latitude": number;
  "Longitude": number;
  "Featured": "checked";
  "ORGANIZATION NAME"?: string;
  "BIO"?: string;
  "PHOTO"?: { url: string }[];
  "LOGO"?: { url: string }[];
}

// Form State Types
export interface FormState {
  data: FreeFormData;
  errors: FormError[];
  isDirty: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  touched: Array<keyof FreeFormData>;
} 