import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';

// Your GA4 property ID
export const GA4_PROPERTY_ID = '404975784'; // From your screenshot

const auth = new GoogleAuth({
  credentials: {
    // You'll need to add these from your service account JSON
    client_email: process.env.GA_CLIENT_EMAIL,
    private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

export const analyticsDataClient = new BetaAnalyticsDataClient({ auth });

export async function getAnalyticsData() {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
      ],
      dimensions: [{ name: 'date' }],
    });

    const [pageViewsResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [{ name: 'screenPageViews' }],
      dimensions: [{ name: 'pagePath' }],
      orderBys: [
        {
          metric: { metricName: 'screenPageViews' },
          desc: true,
        },
      ],
      limit: 5,
    });

    return {
      totalUsers: parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0'),
      activeUsers: parseInt(response.rows?.[0]?.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(response.rows?.[0]?.metricValues?.[2]?.value || '0'),
      avgSessionDuration: response.rows?.[0]?.metricValues?.[3]?.value || '0',
      topPages: pageViewsResponse.rows?.map(row => ({
        page: row.dimensionValues?.[0]?.value || '',
        views: parseInt(row.metricValues?.[0]?.value || '0'),
      })) || [],
    };
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    throw error;
  }
}
