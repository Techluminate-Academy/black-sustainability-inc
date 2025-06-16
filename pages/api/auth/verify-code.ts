import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    console.log('🔐 Verifying code for email:', email);
    
    const { db } = await connectToDatabase();
    
    // Look up verification record
    const verification = await db.collection('verifications').findOne({ email });

    if (!verification) {
      console.log('❌ No verification record found for email:', email);
      return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
    }

    // Check if code has expired
    if (verification.expiresAt < new Date()) {
      console.log('❌ Verification code expired for email:', email);
      // Delete expired record
      await db.collection('verifications').deleteOne({ email });
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Check if too many attempts
    if (verification.attempts >= 3) {
      console.log('❌ Too many attempts for email:', email);
      // Delete record after too many attempts
      await db.collection('verifications').deleteOne({ email });
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    // Check if code matches
    if (verification.code !== code) {
      console.log('❌ Invalid code provided for email:', email);
      
      // Increment attempts
      await db.collection('verifications').updateOne(
        { email },
        { $inc: { attempts: 1 } }
      );
      
      const newAttempts = verification.attempts + 1;
      const remainingAttempts = 3 - newAttempts;
      
      return res.status(400).json({ 
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.` 
      });
    }

    // Code is valid - mark as verified
    await db.collection('verifications').updateOne(
      { email },
      { $set: { verified: true } }
    );

    console.log('✅ Code verified successfully for email:', email);

    res.status(200).json({ 
      success: true, 
      message: 'Code verified successfully',
      userData: verification.userData 
    });

  } catch (error: any) {
    console.error('❌ Error verifying code:', error);
    res.status(500).json({ 
      error: 'Failed to verify code',
      details: error.message 
    });
  }
} 