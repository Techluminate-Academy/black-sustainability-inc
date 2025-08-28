import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const metrics = req.body;
    
    // Add user context if available
    const enrichedMetrics = {
      ...metrics,
      userId: session?.user?.email || 'anonymous',
      userAgent: req.headers['user-agent'],
    };

    // Log to console with clear visibility
    console.log('\n🔍 [Performance Metrics]');
    console.log('====================');
    console.log(JSON.stringify(enrichedMetrics, null, 2));
    console.log('====================\n');

    return res.status(200).json({ message: 'Metrics logged successfully' });
  } catch (error) {
    console.error('Error logging performance metrics:', error);
    return res.status(500).json({ message: 'Failed to log metrics' });
  }
}
