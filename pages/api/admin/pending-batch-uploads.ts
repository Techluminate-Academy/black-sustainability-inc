import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import type { PendingBatchUpload } from '@/models/pendingBatchUpload';

// GET - List all pending batch uploads
// POST - Upload selected batch uploads to Airtable
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { db } = await connectToDatabase();
  const pendingBatchUploads = db.collection('pendingBatchUploads');

  if (req.method === 'GET') {
    try {
      const { status } = req.query;
      
      const query: any = {};
      if (status) {
        query.status = status;
      }

      const uploads = await pendingBatchUploads
        .find(query)
        .sort({ submittedAt: -1 })
        .toArray();

      return res.status(200).json({
        uploads: uploads.map(upload => ({
          ...upload,
          _id: upload._id.toString()
        }))
      });
    } catch (error: any) {
      console.error('Error fetching pending uploads:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, uploadIds } = req.body;

      if (action === 'upload') {
        // Upload selected batch uploads to Airtable
        const AirtableUtils = require('@/pages/api/submitForm').default;
        const { ObjectId } = require('mongodb');
        
        const uploads = await pendingBatchUploads
          .find({ 
            _id: { $in: uploadIds.map((id: string) => new ObjectId(id)) },
            status: 'pending'
          })
          .toArray();

        const results = {
          successful: 0,
          failed: 0,
          errors: [] as any[]
        };

        for (const upload of uploads) {
          try {
            // Process each row in the upload
            for (const row of upload.rows) {
              await uploadRowToAirtable(row, AirtableUtils);
            }

            // Mark upload as uploaded
            await pendingBatchUploads.updateOne(
              { _id: upload._id },
              { 
                $set: { 
                  status: 'uploaded',
                  uploadedAt: new Date(),
                  updatedAt: new Date()
                } 
              }
            );

            results.successful++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({
              uploadId: upload._id.toString(),
              error: error.message
            });
          }
        }

        return res.status(200).json({
          message: `Processed ${uploads.length} batch upload(s)`,
          results
        });
      } else if (action === 'reject') {
        // Reject selected batch uploads
        const { ObjectId } = require('mongodb');
        await pendingBatchUploads.updateMany(
          { 
            _id: { $in: uploadIds.map((id: string) => new ObjectId(id)) }
          },
          { 
            $set: { 
              status: 'rejected',
              updatedAt: new Date()
            } 
          }
        );

        return res.status(200).json({
          message: `Rejected ${uploadIds.length} batch upload(s)`
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error: any) {
      console.error('Error processing batch uploads:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper function to upload a single row to Airtable
async function uploadRowToAirtable(row: any, AirtableUtils: any) {
  // Helper to format phone numbers (US/Canada format)
  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return "";
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
    "Address": row.address,
    "Location (Nearest City)": row.nearestCity,
  };

  // Required fields
  if (row.memberLevel) fields["MEMBER LEVEL"] = [row.memberLevel];
  if (row.identification) fields["IDENTIFICATION"] = row.identification;
  if (row.gender) fields["GENDER"] = row.gender;
  if (row.primaryIndustry) fields["PRIMARY INDUSTRY HOUSE"] = row.primaryIndustry;

  // Optional fields
  if (row.organizationName) fields["ORGANIZATION NAME"] = row.organizationName;
  if (row.affiliatedEntity) fields["AFFILIATED ENTITY"] = row.affiliatedEntity;
  if (row.website) fields["WEBSITE"] = row.website;
  
  // Phone handling - use phone and phoneCountryCode if available, otherwise fallback to phoneUS/phoneNonUS
  if (row.phone && row.phoneCountryCode) {
    if (row.phoneCountryCode === "+1-us") {
      fields["PHONE US/CAN ONLY"] = formatPhoneNumber(row.phone);
    } else {
      fields["PHONE NON-US/CAN"] = row.phone;
    }
  } else {
    // Legacy support for old format
    if (row.phoneUS) fields["PHONE US/CAN ONLY"] = formatPhoneNumber(row.phoneUS);
    if (row.phoneNonUS) fields["PHONE NON-US/CAN"] = row.phoneNonUS;
  }

  // Multi-select fields (arrays)
  if (row.additionalFocus && Array.isArray(row.additionalFocus) && row.additionalFocus.length > 0) {
    fields["ADDITIONAL FOCUS AREAS"] = row.additionalFocus;
  } else if (row.additionalFocus && typeof row.additionalFocus === 'string') {
    // Legacy support for comma-separated string
    fields["ADDITIONAL FOCUS AREAS"] = row.additionalFocus.split(',').map((s: string) => s.trim()).filter((s: string) => s);
  }

  if (row.similarCategories && Array.isArray(row.similarCategories) && row.similarCategories.length > 0) {
    fields["Similar Categories"] = row.similarCategories.filter((cat: string) => cat && cat.trim() !== "");
  }

  // Location fields
  if (row.zipCode !== undefined && row.zipCode !== null) {
    fields["Zip/Postal Code"] = typeof row.zipCode === 'number' ? row.zipCode : parseInt(row.zipCode) || 0;
  }
  if (row.latitude !== undefined && row.latitude !== null) {
    fields["Latitude"] = typeof row.latitude === 'number' ? row.latitude.toString() : row.latitude;
  }
  if (row.longitude !== undefined && row.longitude !== null) {
    fields["Longitude"] = typeof row.longitude === 'number' ? row.longitude.toString() : row.longitude;
  }

  // Boolean fields
  if (row.includeOnMap !== undefined) {
    fields["Featured"] = typeof row.includeOnMap === 'boolean' ? row.includeOnMap : 
      (row.includeOnMap === "Yes" || row.includeOnMap === "TRUE" || row.includeOnMap === "true");
  }

  // Additional fields
  if (row.youtube) fields["YOUTUBE"] = row.youtube;
  if (row.nameFromLocation) fields["Name (from Location)"] = row.nameFromLocation;
  if (row.fundingGoal) fields["FUNDING GOAL"] = row.fundingGoal;
  if (row.naicsCode) fields["NAICS Code"] = row.naicsCode;

  // Photo and Logo (URLs from Cloudinary)
  if (row.photoUrl) {
    fields["PHOTO"] = [{
      url: row.photoUrl,
      filename: "profile-photo.jpg"
    }];
  }
  if (row.logoUrl) {
    fields["LOGO"] = [{
      url: row.logoUrl,
      filename: "organization-logo.jpg"
    }];
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
  
  if (searchData.records && searchData.records.length > 0) {
    // Update existing record
    const recordId = searchData.records[0].id;
    await AirtableUtils.updateRecord(recordId, fields);
  } else {
    // Create new record
    await AirtableUtils.submitToAirtable(fields);
  }
}
