import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Use dev Airtable credentials
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_DEV_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log environment variables (without exposing sensitive data)
  console.log('⛳ [DEV] Airtable Config:', {
    hasKey: !!AIRTABLE_API_KEY,
    baseId: BASE_ID,
    tableName: TABLE_NAME
  });

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    console.log('🔍 [DEV] Searching for email:', email);
    
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      params: {
        filterByFormula: `{EMAIL ADDRESS} = '${email}'`,
        maxRecords: 1
      }
    });

    if (!response.data.records.length) {
      console.log('❌ [DEV] No user found with email:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    const record = response.data.records[0];
    console.log('✅ [DEV] User found! Record ID:', record.id);
    console.log('📝 [DEV] Raw record fields:', record.fields);

    // Return a cleaned version of the data
    res.status(200).json({
      success: true,
      data: {
        id: record.id,
        fields: {
          email: record.fields['EMAIL ADDRESS'],
          firstName: record.fields['FIRST NAME'],
          lastName: record.fields['LAST NAME'],
          bio: record.fields['BIO'],
          photo: record.fields['PHOTO'],
          logo: record.fields['LOGO'],
          memberLevel: record.fields['MembershipType'],
          organizationName: record.fields['ORGANIZATION NAME'],
          identification: record.fields['IDENTIFICATION'],
          gender: record.fields['GENDER'],
          website: record.fields['WEBSITE'],
          phoneCountryCode: record.fields['PHONE COUNTRY CODE'] || '+1-us',
          phone: record.fields['PHONE US/CAN ONLY'],
          primaryIndustry: record.fields['PRIMARY INDUSTRY HOUSE'],
          additionalFocus: record.fields['ADDITIONAL FOCUS AREAS'] || [],
          address: record.fields['Address'],
          zipCode: record.fields['Zip/Postal Code'],
          youtube: record.fields['YOUTUBE'],
          nearestCity: record.fields['Location (Nearest City)'],
          nameFromLocation: record.fields['Name (from Location)'],
          fundingGoal: record.fields['FUNDING GOAL'],
          similarCategories: record.fields['Similar Categories'] || [],
          naicsCode: record.fields['NAICS Code'],
          includeOnMap: record.fields['Featured'] === 'checked',
          latitude: record.fields['Latitude'],
          longitude: record.fields['Longitude'],
          affiliatedEntity: record.fields['AFFILIATED ENTITY']
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [DEV] Error details:', {
      message: error.message,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      details: error.response?.data || error.message
    });
  }
} 