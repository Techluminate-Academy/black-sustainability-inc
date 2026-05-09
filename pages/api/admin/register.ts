import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';

interface AdminUser {
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

  const { email, name, registrationToken } = req.body;

  // Validate required fields
  if (!email || !name || !registrationToken) {
    return res.status(400).json({ 
      error: 'Missing required fields: email, name, registrationToken' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check registration token (you should set this in your environment variables)
  const expectedToken = process.env.ADMIN_REGISTRATION_TOKEN;
  if (!expectedToken || registrationToken !== expectedToken) {
    return res.status(403).json({ error: 'Invalid registration token' });
  }

  try {
    const { db } = await connectToDatabase();
    const adminCollection = db.collection('adminUsers');

    // Check if admin already exists
    const existingAdmin = await adminCollection.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({ 
        error: 'Admin user already exists with this email',
        code: 'ADMIN_EXISTS'
      });
    }

    // Create new admin user
    const newAdmin: AdminUser = {
      email: email.toLowerCase(),
      name,
      role: 'admin',
      createdAt: new Date(),
      isActive: true
    };

    const result = await adminCollection.insertOne(newAdmin);

    if (!result.acknowledged) {
      throw new Error('Failed to create admin user');
    }

    console.log(`✅ Admin user created: ${email}`);

    return res.status(201).json({
      success: true,
      message: 'Admin user registered successfully',
      admin: {
        id: result.insertedId,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error registering admin user:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 