export interface PendingBatchUpload {
  _id?: string;
  rows: BatchUploadRow[];
  submittedAt: Date;
  submittedBy?: string; // IP address or user identifier
  status: 'pending' | 'approved' | 'rejected' | 'uploaded';
  uploadedAt?: Date;
  uploadedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchUploadRow {
  email: string;
  firstName: string;
  lastName: string;
  memberLevel: string;
  bio: string;
  organizationName?: string;
  affiliatedEntity?: string;
  photo?: string; // URL or base64
  photoUrl?: string;
  logo?: string; // URL or base64
  logoUrl?: string;
  identification: string;
  gender: string;
  website?: string;
  phoneCountryCode?: string;
  phone?: string;
  additionalFocus?: string[]; // Array of focus area names
  primaryIndustry: string;
  address: string;
  zipCode?: number;
  youtube?: string;
  nearestCity: string;
  nameFromLocation?: string;
  fundingGoal?: string;
  similarCategories?: string[]; // Array of category names
  naicsCode?: string;
  includeOnMap?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}
