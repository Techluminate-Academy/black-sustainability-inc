import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import type { BatchUploadRow } from '@/models/pendingBatchUpload';

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

    // Validate required fields for each row
    const validationErrors: { row: number; error: string }[] = [];
    const validRows: BatchUploadRow[] = [];

    rows.forEach((row, index) => {
      if (!row.email || !row.firstName || !row.lastName || !row.bio || 
          !row.identification || !row.gender || !row.primaryIndustry || 
          !row.address || !row.nearestCity) {
        validationErrors.push({
          row: index + 1,
          error: 'Missing required fields'
        });
      } else {
        validRows.push(row);
      }
    });

    if (validRows.length === 0) {
      return res.status(400).json({ 
        error: 'No valid rows to save',
        validationErrors 
      });
    }

    // Try to save to MongoDB pending list
    try {
      const { db } = await connectToDatabase();
      const pendingBatchUploads = db.collection('pendingBatchUploads');

      const pendingUpload = {
        rows: validRows,
        submittedAt: new Date(),
        submittedBy: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await pendingBatchUploads.insertOne(pendingUpload);
      console.log('✅ Saved to MongoDB pendingBatchUploads collection:', result.insertedId);

      return res.status(200).json({
        message: `Saved ${validRows.length} member(s) for review`,
        id: result.insertedId,
        storage: 'MongoDB',
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        note: 'Your submission has been saved and will be reviewed before being uploaded to the system.'
      });
    } catch (dbError: any) {
      // If MongoDB connection fails, save to Airtable with a special flag
      console.error('MongoDB connection failed, using Airtable fallback:', dbError);
      
      // Import Airtable utils
      const AirtableUtils = require('@/pages/api/submitForm').default;
      
      // Save each row to Airtable with a special field indicating it's pending review
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as any[]
      };

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        try {
          // Map to Airtable format
          const formatPhoneNumber = (phoneNumber: string) => {
            const cleaned = phoneNumber.replace(/\D/g, '');
            if (cleaned.length === 10) {
              return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
            }
            return phoneNumber;
          };

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
            "PENDING_REVIEW": true, // Flag to indicate this needs review
            "BATCH_UPLOAD_SUBMITTED_AT": new Date().toISOString()
          };

          // Add optional fields
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
          if (row.payingMember) fields["Paying Member (keep current)"] = row.payingMember === "Yes" || row.payingMember === "TRUE" || row.payingMember === "true";
          if (row.equityMember) fields["Equity Member (keep current)"] = row.equityMember === "Yes" || row.equityMember === "TRUE" || row.equityMember === "true";
          if (row.membershipNotes) fields["Membership Status Notes"] = row.membershipNotes;
          if (row.sendPaymentEmail) fields["Send Need Payment Email"] = row.sendPaymentEmail === "Yes" || row.sendPaymentEmail === "TRUE" || row.sendPaymentEmail === "true";

          // Check if record exists
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
          
          if (searchData.records && searchData.records.length > 0) {
            // Update existing record
            const recordId = searchData.records[0].id;
            await AirtableUtils.updateRecord(recordId, fields);
          } else {
            // Create new record
            await AirtableUtils.submitToAirtable(fields);
          }

          results.successful++;
        } catch (rowError: any) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            email: row.email,
            error: rowError.message || 'Unknown error'
          });
        }
      }

      console.log('✅ Saved to Airtable (MongoDB fallback):', results);
      
      return res.status(200).json({
        message: `Saved ${results.successful} member(s) to Airtable (MongoDB unavailable)`,
        storage: 'Airtable',
        warning: 'MongoDB connection failed. Data saved directly to Airtable with PENDING_REVIEW flag.',
        results: {
          successful: results.successful,
          failed: results.failed,
          errors: results.errors
        },
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        note: 'Note: These records are marked as PENDING_REVIEW in Airtable. Please review them before making them active.'
      });
    }
  } catch (error: any) {
    console.error('Batch upload save error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: 'Unable to save batch upload. Please check your database connection or try again later.'
    });
  }
}
