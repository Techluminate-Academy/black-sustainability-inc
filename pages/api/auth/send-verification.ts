import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '@/lib/mongodb';
import axios from 'axios';

// Airtable credentials
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;

// Mailchimp SMTP credentials
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

// Send verification email using Mailchimp SMTP
async function sendVerificationEmail(email: string, code: string, firstName?: string) {
  console.log('📧 SMTP Configuration:');
  console.log('- Host: smtp.mandrillapp.com');
  console.log('- Port: 587');
  console.log('- User: Black Sustainability, Inc.');
  console.log('- API Key (first 5 chars):', MAILCHIMP_API_KEY?.substring(0, 5) + '...');
  console.log('- Sending to:', email);
  
  // Try multiple configurations to resolve domain mismatch
  const configurations = [
    {
      name: 'Standard Configuration',
      auth: {
        user: 'Black Sustainability, Inc.',
        pass: MAILCHIMP_API_KEY,
      },
      from: '"Black Sustainability, Inc." <info@blacksustainability.org>'
    },
    {
      name: 'Simple Email Configuration',
      auth: {
        user: 'info@blacksustainability.org',
        pass: MAILCHIMP_API_KEY,
      },
      from: 'info@blacksustainability.org'
    },
    {
      name: 'API Key as Username',
      auth: {
        user: MAILCHIMP_API_KEY,
        pass: MAILCHIMP_API_KEY,
      },
      from: 'info@blacksustainability.org'
    }
  ];

  for (const config of configurations) {
    try {
      console.log(`📧 Trying ${config.name}...`);
      
      // Create SMTP transporter using Mailchimp
      const transporter = nodemailer.createTransport({
        host: 'smtp.mandrillapp.com',
        port: 587,
        secure: false,
        auth: config.auth,
        debug: false,
        logger: false
      });

      const mailOptions = {
        from: config.from,
        to: email,
        subject: 'Your BSN Profile Access Code',
        replyTo: 'info@blacksustainability.org',
        html: `
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
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully with ${config.name}`);
      return; // Success - exit the function
      
    } catch (error: any) {
      console.error(`❌ ${config.name} failed:`, error.message);
      // Continue to next configuration
    }
  }
  
  // If all configurations failed
  throw new Error('All SMTP configurations failed - please check your domain setup');
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
    await sendVerificationEmail(email, code, airtableUser.firstName);
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