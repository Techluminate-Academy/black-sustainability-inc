import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import type { FormVersion } from '@/models/formVersion';
import getAirtableConfig from '@/lib/airtableConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formData, formVersion } = req.body;

    if (!formData || !formVersion) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get form configuration
    const { db } = await connectToDatabase();
    const coll = db.collection('formVersions') as Collection<FormVersion>;
    const formConfig = await coll.findOne({ version: formVersion });

    if (!formConfig) {
      return res.status(404).json({ error: 'Form configuration not found' });
    }

    // Get Airtable configuration
    const airtableConfig = await getAirtableConfig();
    const { apiKey, baseId, tableName } = airtableConfig;

    // Map form data to Airtable fields
    const airtableFields = formConfig.fields.reduce((acc, field) => {
      const value = formData[field.name];

      if (value === undefined || value === null || value === '') {
        return acc;
      }
      
      let airtableColumnName = field.label;
      switch(field.name) {
        case 'email': airtableColumnName = 'EMAIL ADDRESS'; break;
        case 'firstName': airtableColumnName = 'FIRST NAME'; break;
        case 'lastName': airtableColumnName = 'LAST NAME'; break;
        case 'primaryIndustry': airtableColumnName = 'PRIMARY INDUSTRY HOUSE'; break;
        case 'organizationName': airtableColumnName = 'ORGANIZATION NAME'; break;
        case 'bio': airtableColumnName = 'BIO'; break;
        case 'photo': airtableColumnName = 'PHOTO'; break;
        case 'logo': airtableColumnName = 'LOGO'; break;
      }

      if ((field.name === 'photo' || field.name === 'logo') && typeof value === 'string' && value.startsWith('http')) {
        acc[airtableColumnName] = [{ url: value }];
      } else if (field.type === 'address' && typeof value === 'object' && value.address) {
        acc['Address'] = value.address;
        acc['Latitude'] = value.latitude;
        acc['Longitude'] = value.longitude;
      } else if (field.type !== 'file') {
        acc[airtableColumnName] = value;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Add hardcoded value for Membership Status Notes for the test form
    airtableFields['Membership Status Notes'] = 'Free';

    // Make request to Airtable
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{
          fields: airtableFields
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Airtable error:', error);
      return res.status(response.status).json({ error: 'Failed to update Airtable' });
    }

    const result = await response.json();
    
    // Log the submission for debugging
    console.log('Form submission successful:', {
      formVersion,
      formName: formConfig.name,
      submittedData: formData,
      airtableResponse: result
    });

    return res.status(200).json({
      success: true,
      message: 'Data successfully submitted to Airtable',
      record: result.records[0]
    });

  } catch (error: any) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
} 