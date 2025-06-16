import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import axios from 'axios';

// Airtable credentials
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;

// Mailchimp API credentials
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;

// Check if user exists in Airtable
async function checkUserInAirtable(email: string) {
  try {
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

    if (response.data.records.length > 0) {
      const record = response.data.records[0];
      return {
        id: record.id,
        firstName: record.fields['FIRST NAME'],
        lastName: record.fields['LAST NAME'],
        email: record.fields['EMAIL ADDRESS']
      };
    }
    return null;
  } catch (error) {
    console.error('Error checking user in Airtable:', error);
    return null;
  }
}

// Add email to Mandrill allowlist to resolve domain mismatch issues
async function addToAllowlist(email: string) {
  try {
    console.log('📝 Adding email to Mandrill allowlist:', email);
    
    const response = await axios.post('https://mandrillapp.com/api/1.0/allowlists/add', {
      key: MAILCHIMP_API_KEY,
      email: email,
      comment: 'BSN profile verification access'
    });

    console.log('✅ Successfully added to allowlist:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to add to allowlist:', error.response?.data || error.message);
    // Don't throw error - continue with email sending even if allowlist fails
    return null;
  }
}

// Send verification email using Mandrill API directly with proper format
async function sendVerificationEmailMandrill(email: string, code: string, firstName?: string) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c5aa0; margin-bottom: 10px;">Black Sustainability, Inc.</h1>
        <p style="color: #666; font-size: 16px;">Profile Access Verification</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
        <h2 style="color: #333; margin-bottom: 20px;">
          ${firstName ? `Hello ${firstName}!` : 'Hello!'}
        </h2>
        <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
          You requested to access your BSN profile. Please use the verification code below:
        </p>
        
        <div style="background-color: #2c5aa0; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 4px; margin: 20px 0;">
          ${code}
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This code will expire in 10 minutes for security reasons.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          © 2024 Black Sustainability, Inc. All rights reserved.
        </p>
      </div>
    </div>
  `;

  const textContent = `Hello ${firstName ? firstName : ''}!\n\nYou requested to access your BSN profile. Please use this verification code: ${code}\n\nThis code will expire in 10 minutes for security reasons.\n\nIf you didn't request this code, please ignore this email.\n\n© 2024 Black Sustainability, Inc.`;

  // First try to add email to allowlist
  await addToAllowlist(email);

  // Use the exact format from Mandrill documentation
  const requestBody = {
    key: MAILCHIMP_API_KEY,
    message: {
      html: htmlContent,
      text: textContent,
      subject: 'Your BSN Profile Access Code',
      from_email: 'info@blacksustainability.org',
      from_name: 'Black Sustainability, Inc.',
      to: [
        {
          email: email,
          type: 'to'
        }
      ],
      headers: {},
      important: false,
      track_opens: false,
      track_clicks: false,
      auto_text: false,
      auto_html: false,
      inline_css: false,
      url_strip_qs: false,
      preserve_recipients: false,
      view_content_link: false,
      bcc_address: '',
      tracking_domain: '',
      signing_domain: '',
      return_path_domain: '',
      merge: false,
      merge_language: 'mailchimp',
      global_merge_vars: [],
      merge_vars: [],
      tags: [],
      google_analytics_domains: [],
      google_analytics_campaign: '',
      metadata: {
        website: ''
      },
      recipient_metadata: [],
      attachments: [],
      images: []
    },
    async: false,
    ip_pool: '',
    send_at: ''
  };

  try {
    console.log('📧 Sending via Mandrill API with exact documentation format...');
    console.log('- From:', requestBody.message.from_email);
    console.log('- To:', email);
    console.log('- API Key (first 5):', MAILCHIMP_API_KEY?.substring(0, 5) + '...');
    
    const response = await axios.post('https://mandrillapp.com/api/1.0/messages/send', requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📧 Mandrill API response:', JSON.stringify(response.data, null, 2));
    
    // Check if any messages were rejected
    const rejectedMessages = response.data.filter((msg: any) => msg.status === 'rejected');
    if (rejectedMessages.length > 0) {
      console.error('❌ Some messages were rejected:', rejectedMessages);
      
      // If still getting domain mismatch, try alternative approach
      if (rejectedMessages[0].reject_reason === 'recipient-domain-mismatch') {
        console.log('🔄 Attempting alternative sender configuration...');
        
        // Try with a different from_email that might work better
        const alternativeRequestBody = {
          ...requestBody,
          message: {
            ...requestBody.message,
            from_email: 'noreply@blacksustainability.org',
            from_name: 'BSN Verification System'
          }
        };
        
        const retryResponse = await axios.post('https://mandrillapp.com/api/1.0/messages/send', alternativeRequestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📧 Retry response:', JSON.stringify(retryResponse.data, null, 2));
        
        const retryRejected = retryResponse.data.filter((msg: any) => msg.status === 'rejected');
        if (retryRejected.length > 0) {
          throw new Error(`Email still rejected: ${retryRejected[0].reject_reason || 'Unknown reason'}`);
        }
        
        return retryResponse.data;
      } else {
        throw new Error(`Email rejected: ${rejectedMessages[0].reject_reason || 'Unknown reason'}`);
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Mandrill API error:', error.response?.data || error.message);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    console.log('🔍 Checking if user exists in Airtable:', email);
    
    // 1. Check if user exists in Airtable
    const airtableUser = await checkUserInAirtable(email);
    if (!airtableUser) {
      console.log('❌ User not found in Airtable');
      return res.status(404).json({ error: 'Email not found in our records' });
    }

    console.log('✅ User found in Airtable:', airtableUser.firstName, airtableUser.lastName);

    // 2. Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Generated verification code:', code);

    // 3. Store verification code in MongoDB
    const { db } = await connectToDatabase();
    await db.collection('verifications').replaceOne(
      { email },
      {
        email,
        code,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
        verified: false,
        userData: {
          firstName: airtableUser.firstName,
          lastName: airtableUser.lastName,
          recordId: airtableUser.id
        }
      },
      { upsert: true }
    );

    console.log('💾 Stored verification code in MongoDB');

    // 4. Send verification email
    await sendVerificationEmailMandrill(email, code, airtableUser.firstName);
    console.log('📧 Verification email sent successfully');

    res.status(200).json({ 
      success: true, 
      message: 'Verification code sent to your email',
      firstName: airtableUser.firstName 
    });

  } catch (error: any) {
    console.error('❌ Error in send verification:', error);
    res.status(500).json({ 
      error: 'Failed to send verification code',
      details: error.message 
    });
  }
} 