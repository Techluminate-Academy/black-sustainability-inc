import type { NextApiRequest, NextApiResponse } from 'next';
import { createFreeSignupRecord } from '@/lib/server/airtableFreeSignupServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formData } = req.body;

    if (!formData) {
      return res.status(400).json({ error: 'Missing form data' });
    }

    // Map frontend data to the format expected by airtableUtils
    const airtableFields: Record<string, any> = {
      "FIRST NAME": formData.firstName,
      "LAST NAME": formData.lastName,
      "EMAIL ADDRESS": formData.email,
      "Address": formData.address?.address, // Assuming address is an object
      "Latitude": formData.address?.latitude?.toString(),
      "Longitude": formData.address?.longitude?.toString(),
      "MembershipType": "Free",
      "Membership Status Notes": "Free",
    };

    if (formData.primaryIndustry) {
      airtableFields["PRIMARY INDUSTRY HOUSE"] = formData.primaryIndustry;
    }
    if (formData.organizationName) {
      airtableFields["ORGANIZATION NAME"] = formData.organizationName;
    }
    if (formData.bio) {
      airtableFields["BIO"] = formData.bio;
    }
    if (formData.photo && typeof formData.photo === 'string') {
      airtableFields["PHOTO"] = [{ url: formData.photo }];
    }
    if (formData.logo && typeof formData.logo === 'string') {
      airtableFields["LOGO"] = [{ url: formData.logo }];
    }

    await createFreeSignupRecord(airtableFields);

    return res.status(200).json({ success: true, message: 'Data successfully submitted to Airtable' });

  } catch (error: any) {
    console.error('Server error in register-free-submit:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
} 