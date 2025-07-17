import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'admin';
  createdAt: Date;
  isActive: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Missing required fields: email, password' 
    });
  }

  try {
    const { db } = await connectToDatabase();
    const adminCollection = db.collection('adminUsers');

    // Find admin user
    const admin = await adminCollection.findOne({ 
      email: email.toLowerCase(),
      isActive: true
    }) as AdminUser | null;

    if (!admin) {
      return res.status(401).json({ 
        error: 'Invalid credentials or admin not found',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // For now, we'll use a simple password check
    // In production, you should hash passwords and use proper authentication
    const expectedPassword = process.env.ADMIN_PASSWORD;
    
    // Debug logging
    console.log('🔐 Login attempt:', {
      email: admin.email,
      providedPassword: password,
      expectedPassword: expectedPassword,
      passwordMatch: password === expectedPassword,
      hasExpectedPassword: !!expectedPassword
    });
    
    if (!expectedPassword || password !== expectedPassword) {
      console.log('❌ Password mismatch or missing ADMIN_PASSWORD env var');
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    console.log(`✅ Admin login successful: ${admin.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error: any) {
    console.error('Error during admin login:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 