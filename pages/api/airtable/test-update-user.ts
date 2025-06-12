import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_DEV_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recordId, fields } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'Record ID is required' });
  }

  try {
    console.log('⛳ [DEV] Updating Airtable record:', recordId);
    console.log('📝 [DEV] Original fields:', fields);

    // No special handling needed for member level since it's a single select
    const updatedFields = { ...fields };

    console.log('📝 [DEV] Final fields to update:', updatedFields);

    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${recordId}`;
    
    try {
      const response = await axios.patch(url, {
        fields: updatedFields
      }, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ [DEV] Update successful:', response.data);
      res.status(200).json({ success: true, data: response.data });
    } catch (error: any) {
      console.error('❌ [DEV] Update failed:', error.response?.data || error.message);
      if (error.response?.data?.error?.type === 'INVALID_VALUE_FOR_COLUMN') {
        console.error('❌ [DEV] Invalid value details:', {
          originalFields: fields,
          processedFields: updatedFields,
          memberLevel: updatedFields['MEMBER LEVEL']
        });
      }
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error || error.message 
    });
  }
} 