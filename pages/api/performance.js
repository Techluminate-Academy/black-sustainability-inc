import { NextApiRequest, NextApiResponse } from 'next';

// This API endpoint provides performance metrics without console logs
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get performance metrics from the global performance object
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
  };

  res.status(200).json({
    success: true,
    metrics,
    message: 'Performance monitoring is active. Check browser Network tab for request times.',
  });
}

