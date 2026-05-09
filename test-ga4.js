require('dotenv').config();
const {GoogleAuth} = require('google-auth-library');
const {BetaAnalyticsDataClient} = require('@google-analytics/data');

const GA4_PROPERTY_ID = '6058662380';

async function testGA4Connection() {
  try {
    const auth = new GoogleAuth({
      keyFile: '/Users/jerrybony/.config/gcloud/application_default_credentials.json',
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
    
    const client = await auth.getClient();

    // Create Analytics client
    const analyticsDataClient = new BetaAnalyticsDataClient({
      authClient: client
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      dateRanges: [{
        startDate: '7daysAgo',
        endDate: 'today'
      }],
      metrics: [{
        name: 'activeUsers'
      }]
    });
    console.log('Connection successful:', response);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testGA4Connection();