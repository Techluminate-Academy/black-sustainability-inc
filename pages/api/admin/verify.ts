import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'admin';
  createdAt: Date;
  isActive: boolean;
}

interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'No token provided',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret'
    ) as TokenPayload;

    // Check if token is expired
    if (decoded.exp < Date.now() / 1000) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Get admin user from database
    const { db } = await connectToDatabase();
    const adminCollection = db.collection('adminUsers');

    const admin = await adminCollection.findOne({ 
      _id: new ObjectId(decoded.id),
      isActive: true
    }) as AdminUser | null;

    if (!admin) {
      return res.status(401).json({ 
        error: 'Admin user not found or inactive',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Return admin information
    return res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });

  } catch (error: any) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 