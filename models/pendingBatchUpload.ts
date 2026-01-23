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
  email2?: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  website?: string;
  bio: string;
  identification: string;
  gender: string;
  phoneUS?: string;
  phoneNonUS?: string;
  primaryIndustry: string;
  additionalFocus?: string;
  naicsCode?: string;
  affiliatedEntity?: string;
  address: string;
  nearestCity: string;
  country?: string;
  stateProvince?: string;
  state?: string;
  zipCode?: string;
  timezone?: string;
  includeOnMap?: string;
  latitude?: string;
  longitude?: string;
  memberLevel?: string;
  payingMember?: string;
  equityMember?: string;
  membershipNotes?: string;
  sendPaymentEmail?: string;
}
