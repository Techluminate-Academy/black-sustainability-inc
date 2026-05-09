import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    const { db } = await connectToDatabase();

    // Find verification code document
    const verification = await db.collection('verifications').findOne({
      email,
      code,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Generate token
    const token = jwt.sign(
      { 
        email: verification.email,
        firstName: verification.userData?.firstName,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
      },
      process.env.JWT_SECRET!
    );

    // Invalidate the verification code
    await db.collection('verifications').updateOne(
      { _id: verification._id },
      { 
        $set: { 
          expiresAt: new Date(Date.now() - 1000),
          verified: true 
        } 
      }
    );

    res.status(200).json({
      success: true,
      token,
      expiresIn: 3600, // 1 hour in seconds
      userData: verification.userData
    });

  } catch (error: any) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
} 