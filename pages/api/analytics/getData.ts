import type { NextApiRequest, NextApiResponse } from 'next';
import { getAnalyticsData } from '../../../lib/analytics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get real GA4 data
    const analyticsData = await getAnalyticsData();

    // Format session duration
    const durationInSeconds = parseFloat(analyticsData.avgSessionDuration);
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.round(durationInSeconds % 60);
    const formattedDuration = `${minutes}m ${seconds}s`;

    const formattedData = {
      totalUsers: analyticsData.totalUsers,
      activeSessions: analyticsData.activeUsers,
      pageViews: analyticsData.pageViews,
      avgEngagementTime: formattedDuration,
      topPages: analyticsData.topPages,
      // You can add form submissions once you have that tracking set up
      formSubmissions: 0,
    };

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Analytics API Error:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
}