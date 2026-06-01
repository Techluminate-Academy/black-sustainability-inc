import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { fetchMainRosterRecordWithFieldsByEmail } from '@/lib/server/airtableMainRosterServer';

function mapFields(recordId: string, f: Record<string, unknown>) {
  return {
    id: recordId,
    fields: {
      email: f['EMAIL ADDRESS'],
      firstName: f['FIRST NAME'],
      lastName: f['LAST NAME'],
      bio: f['BIO'],
      photo: f['PHOTO'],
      logo: f['LOGO'],
      'MEMBER LEVEL': f['MEMBER LEVEL'],
      organizationName: f['ORGANIZATION NAME'],
      identification: f['IDENTIFICATION'],
      gender: f['GENDER'],
      website: f['WEBSITE'],
      phoneCountryCode: f['PHONE COUNTRY CODE'] || '+1-us',
      phone: f['PHONE US/CAN ONLY'],
      primaryIndustry: f['PRIMARY INDUSTRY HOUSE'],
      additionalFocus: f['ADDITIONAL FOCUS AREAS'] || [],
      address: f['Address'],
      zipCode: f['Zip/Postal Code'],
      youtube: f['YOUTUBE'],
      nearestCity: f['Location (Nearest City)'],
      nameFromLocation: f['Name (from Location)'],
      fundingGoal: f['FUNDING GOAL'],
      similarCategories: f['Similar Categories'] || [],
      naicsCode: f['NAICS Code'],
      includeOnMap: f['Featured'] === 'checked',
      latitude: f['Latitude'],
      longitude: f['Longitude'],
      affiliatedEntity: f['AFFILIATED ENTITY'],
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawEmail = req.query.email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { db } = await connectToDatabase();
    const legacy = await db.collection('airtableRecords').findOne({
      'fields.EMAIL ADDRESS': { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (legacy?.fields) {
      const recordId = String(legacy.id || legacy.airtableId || '');
      if (recordId) {
        res.setHeader('Cache-Control', 'private, max-age=60');
        return res.status(200).json({
          success: true,
          data: mapFields(recordId, legacy.fields as Record<string, unknown>),
        });
      }
    }

    const record = await fetchMainRosterRecordWithFieldsByEmail(email);
    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({
      success: true,
      data: mapFields(record.id, record.fields),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[get-user]', message);
    return res.status(500).json({
      error: 'Failed to fetch user profile',
      details: message,
    });
  }
}
