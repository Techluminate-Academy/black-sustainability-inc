// src/models/formData.ts
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
  