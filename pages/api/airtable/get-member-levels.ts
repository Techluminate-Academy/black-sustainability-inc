import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_DEV_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('⛳ [DEV] Fetching member level options');
    
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      }
    });

    // Extract the options from the response
    const options = response.data.records.map((record: any) => ({
      id: record.id,
      name: record.fields.Name || 'Unnamed Level'
    }));

    console.log('✅ [DEV] Found member levels:', options);
    
    res.status(200).json({ 
      success: true,
      options
    });
  } catch (error: any) {
    console.error('❌ [DEV] Error fetching member levels:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error || error.message 
    });
  }
} 