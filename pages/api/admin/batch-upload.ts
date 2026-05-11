import type { NextApiRequest, NextApiResponse } from 'next';
import AirtableUtils from '@/pages/api/submitForm';

interface BatchUploadRow {
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

// Helper to format phone numbers as (XXX) XXX-XXXX
const formatPhoneNumber = (phoneNumber: string) => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phoneNumber;
};

// Map form data to Airtable fields
const mapToAirtableFields = (row: BatchUploadRow) => {
  const fields: any = {
    "EMAIL ADDRESS": row.email,
    "FIRST NAME": row.firstName,
    "LAST NAME": row.lastName,
    "BIO": row.bio,
    "IDENTIFICATION": row.identification,
    "GENDER": row.gender,
    "PRIMARY INDUSTRY HOUSE": row.primaryIndustry,
    "Address": row.address,
    "Location (Nearest City)": row.nearestCity,
  };

  // Optional fields
  if (row.email2) fields["Email 2"] = row.email2;
  if (row.organizationName) fields["ORGANIZATION NAME"] = row.organizationName;
  if (row.website) fields["WEBSITE"] = row.website;
  if (row.phoneUS) fields["PHONE US/CAN ONLY"] = formatPhoneNumber(row.phoneUS);
  if (row.phoneNonUS) fields["PHONE NON-US/CAN"] = row.phoneNonUS;
  if (row.additionalFocus) {
    fields["ADDITIONAL FOCUS AREAS"] = row.additionalFocus.split(',').map(s => s.trim()).filter(s => s);
  }
  if (row.naicsCode) fields["NAICS Code"] = row.naicsCode;
  if (row.affiliatedEntity) fields["AFFILIATED ENTITY"] = row.affiliatedEntity;
  if (row.country) fields["Country"] = row.country;
  if (row.stateProvince) fields["State/Province"] = row.stateProvince;
  if (row.state) fields["State"] = row.state;
  if (row.zipCode) fields["Zip/Postal Code"] = parseInt(row.zipCode) || 0;
  if (row.timezone) fields["Time zone"] = row.timezone;
  if (row.includeOnMap) fields["Include me on Global BSN Map"] = row.includeOnMap === "Yes" || row.includeOnMap === "TRUE" || row.includeOnMap === "true";
  if (row.latitude) fields["LATITUDE (NEW)"] = row.latitude;
  if (row.longitude) fields["LONGITUDE (NEW)"] = row.longitude;
  if (row.memberLevel) fields["MEMBER LEVEL"] = [row.memberLevel];
  // Staff mirror only; map paid status is Mighty → Mongo. Opt-in to write this Airtable column from CSV:
  if (
    row.payingMember &&
    process.env.ALLOW_STAFF_BATCH_PAYING_AIRTABLE === "1"
  ) {
    fields["Paying Member (keep current)"] =
      row.payingMember === "Yes" || row.payingMember === "TRUE" || row.payingMember === "true";
  }
  if (row.equityMember) fields["Equity Member (keep current)"] = row.equityMember === "Yes" || row.equityMember === "TRUE" || row.equityMember === "true";
  if (row.membershipNotes) fields["Membership Status Notes"] = row.membershipNotes;
  if (row.sendPaymentEmail) fields["Send Need Payment Email"] = row.sendPaymentEmail === "Yes" || row.sendPaymentEmail === "TRUE" || row.sendPaymentEmail === "true";

  return fields;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rows }: { rows: BatchUploadRow[] } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    const results = {
      success: [] as any[],
      errors: [] as { row: number; error: string }[],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Validate required fields
        if (!row.email || !row.firstName || !row.lastName || !row.bio || 
            !row.identification || !row.gender || !row.primaryIndustry || 
            !row.address || !row.nearestCity) {
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields'
          });
          continue;
        }

        // Check if record exists by email
        const url = `https://api.airtable.com/v0/${process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID}/${process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME}`;
        const searchResponse = await fetch(
          url + `?filterByFormula={EMAIL ADDRESS}='${row.email}'`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        const searchData = await searchResponse.json();
        const airtableFields = mapToAirtableFields(row);
        
        if (searchData.records && searchData.records.length > 0) {
          // Update existing record
          const recordId = searchData.records[0].id;
          await AirtableUtils.updateRecord(recordId, airtableFields);
          results.success.push({ row: i + 1, action: 'updated', email: row.email });
        } else {
          // Create new record
          await AirtableUtils.submitToAirtable(airtableFields);
          results.success.push({ row: i + 1, action: 'created', email: row.email });
        }
      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error'
        });
      }
    }

    return res.status(200).json({
      message: `Processed ${rows.length} row(s)`,
      results: {
        successful: results.success.length,
        failed: results.errors.length,
        details: {
          success: results.success,
          errors: results.errors
        }
      }
    });
  } catch (error: any) {
    console.error('Batch upload error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
