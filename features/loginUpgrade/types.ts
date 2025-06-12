// features/loginUpgrade/types.ts

export interface FreeUserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  primaryIndustry: string;
  organizationName?: string;
  bio?: string;
  photoUrl?: string;
  logoUrl?: string;
}

export interface UpgradeFormData {
  // Basic info from free signup (pre-populated)
  email: string;
  firstName: string;
  lastName: string;
  bio: string;
  organizationName: string;
  primaryIndustry: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  photo: File | null;
  photoUrl?: string;
  logo: File | null;
  logoUrl?: string;

  // Additional fields required for paid membership
  memberLevel: string;
  affiliatedEntity: string;
  identification: string;
  gender: string;
  website: string;
  phoneCountryCode: string;
  phone: string;
  additionalFocus: string[];
  zipCode: number;
  youtube: string;
  nearestCity: string;
  nameFromLocation: string;
  fundingGoal: string;
  similarCategories: string[];
  naicsCode: string;
  includeOnMap: boolean;
  showDropdown?: boolean;
  phoneCountryCodeTouched: boolean;
}

export interface FormError {
  field: keyof UpgradeFormData;
  message: string;
} 