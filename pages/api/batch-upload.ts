import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import type { BatchUploadRow } from '@/models/pendingBatchUpload';
import nodemailer from 'nodemailer';

// Mailchimp SMTP credentials
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;

// Send confirmation email to user
async function sendConfirmationEmail(email: string, firstName: string) {
  if (!MAILCHIMP_API_KEY) {
    console.warn('MAILCHIMP_API_KEY not configured, skipping email');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.mandrillapp.com',
      port: 587,
      secure: false,
      auth: {
        user: 'Black Sustainability, Inc.',
        pass: MAILCHIMP_API_KEY,
      },
    });

    const mailOptions = {
      from: '"Black Sustainability, Inc." <info@blacksustainability.org>',
      to: email,
      subject: 'Your BSN Account Will Be Created Shortly',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5aa0; margin-bottom: 10px;">Black Sustainability, Inc.</h1>
            <p style="color: #666; font-size: 16px;">Account Creation Confirmation</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">
              Hello ${firstName}!
            </h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              Thank you for submitting your information to Black Sustainability Network (BSN).
            </p>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              Your account will be created shortly. You will receive another email once your account is ready.
            </p>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              If you have any questions, please contact us at info@blacksustainability.org
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
    console.log(`✅ Confirmation email sent`);
  } catch (error: any) {
    console.error(`❌ Failed to send confirmation email to ${email}:`, error.message);
    // Don't throw - email failure shouldn't block submission
  }
}

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
      if (!row.email || !row.firstName || !row.lastName || !row.memberLevel || 
          !row.bio || !row.identification || !row.gender || !row.primaryIndustry || 
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

      // Send confirmation emails to all users (don't await - send in background)
      validRows.forEach((row) => {
        sendConfirmationEmail(row.email, row.firstName).catch(err => {
          console.error(`Failed to send email to ${row.email}:`, err);
        });
      });

      // Return generic confirmation without user data
      return res.status(200).json({
        success: true,
        message: `Successfully submitted ${validRows.length} member(s). Confirmation emails have been sent.`,
        count: validRows.length,
        validationErrors: validationErrors.length > 0 ? validationErrors.length : undefined,
        note: 'Your submission has been received and will be reviewed. You will receive an email confirmation shortly.'
      });
    } catch (dbError: any) {
      // MongoDB connection failed - return error
      console.error('MongoDB connection failed:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: 'Unable to save your submission. Please try again later or contact support.',
        details: 'The database is temporarily unavailable. Your data has not been saved.'
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
