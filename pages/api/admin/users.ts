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
  if (req.method === 'GET') {
    // Handle GET request to fetch all admin users
    await handleGetUsers(req, res);
  } else if (req.method === 'POST') {
    // Handle POST request to add new admin user
    await handleAddUser(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetUsers(req: NextApiRequest, res: NextApiResponse) {

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

    // Get admin user from database to verify they exist and are active
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

    // Get all admin users
    const allAdmins = await adminCollection.find({}).toArray();

    // Return admin users list
    return res.status(200).json({
      success: true,
      admins: allAdmins.map(admin => ({
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        createdAt: admin.createdAt,
        isActive: admin.isActive
      }))
    });

  } catch (error: any) {
    console.error('Admin users fetch error:', error);
    
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

async function handleAddUser(req: NextApiRequest, res: NextApiResponse) {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ 
      error: 'Missing required fields: email, name' 
    });
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

    // Get admin user from database to verify they exist and are active
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

    // Check if user already exists
    const existingUser = await adminCollection.findOne({ 
      email: email.toLowerCase() 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create new admin user
    const newUser = {
      email: email.toLowerCase(),
      name,
      role: 'admin' as const,
      createdAt: new Date(),
      isActive: true
    };

    const result = await adminCollection.insertOne(newUser);

    console.log(`✅ New admin user created: ${email}`);

    return res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        _id: result.insertedId,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
        isActive: newUser.isActive
      }
    });

  } catch (error: any) {
    console.error('Admin user creation error:', error);
    
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