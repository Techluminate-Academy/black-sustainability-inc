import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { getAdminJwtSecret } from '@/lib/adminJwtSecret';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Verify admin token
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
    const decoded = jwt.verify(token, getAdminJwtSecret()) as TokenPayload;

    // Check if token is expired
    if (decoded.exp < Date.now() / 1000) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Get admin user from database to verify they exist and are active
    const { db } = await connectToDatabase();
    const adminCollection = db.collection('adminUsers');

    const admin = await adminCollection.findOne({ 
      _id: new ObjectId(decoded.id),
      isActive: true
    });

    if (!admin) {
      return res.status(401).json({ 
        error: 'Admin user not found or inactive',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Prevent admin from deleting themselves
    if (decoded.id === id) {
      return res.status(400).json({ 
        error: 'Cannot delete your own account',
        code: 'SELF_DELETION'
      });
    }

    // Delete the target admin user
    const result = await adminCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Admin user not found',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log(`✅ Admin user ${id} deleted successfully`);

    return res.status(200).json({
      success: true,
      message: 'Admin user deleted successfully'
    });

  } catch (error: any) {
    console.error('Admin user delete error:', error);
    
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