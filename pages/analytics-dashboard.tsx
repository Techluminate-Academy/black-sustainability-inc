import { useEffect, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export default function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const initAnalytics = () => {
    if (!window.gapi || !window.gapi.analytics) {
      setTimeout(initAnalytics, 100);
      return;
    }

    window.gapi.analytics.ready(() => {
      try {
        // Authorize with client ID
        window.gapi.analytics.auth.authorize({
          container: 'auth-button',
          clientid: '880364425500-compute@developer.gserviceaccount.com'
        });

        // Create a ViewSelector instance
        const viewSelector = new window.gapi.analytics.ViewSelector({
          container: 'view-selector'
        });

        // Create the charts
        const activeUsersChart = new window.gapi.analytics.googleCharts.DataChart({
          query: {
            metrics: 'ga:activeUsers',
            dimensions: 'ga:date',
            'start-date': '28daysAgo',
            'end-date': 'today'
          },
          chart: {
            container: 'active-users-chart',
            type: 'LINE',
            options: {
              title: 'Active Users Over Time'
            }
          }
        });

        const channelChart = new window.gapi.analytics.googleCharts.DataChart({
          query: {
            metrics: 'ga:sessions',
            dimensions: 'ga:channelGrouping',
            'start-date': '28daysAgo',
            'end-date': 'today',
            'sort': '-ga:sessions'
          },
          chart: {
            container: 'channel-chart',
            type: 'BAR',
            options: {
              title: 'Sessions by Channel'
            }
          }
        });

        // Real-time active users
        const realtimeUsers = new window.gapi.analytics.googleCharts.DataChart({
          query: {
            metrics: 'rt:activeUsers',
            dimensions: 'rt:medium'
          },
          chart: {
            container: 'realtime-users',
            type: 'NUMBER',
            options: {
              title: 'Active Users Right Now'
            }
          }
        });

        // Use your existing GA4 view ID
        const viewId = 'ga:' + '6058662380';  // Your GA4 property ID
        
        // Execute the charts directly with the view ID
        const newIds = { ids: viewId };
        activeUsersChart.set(newIds).execute();
        channelChart.set(newIds).execute();
        realtimeUsers.set(newIds).execute();

        // Hook up the charts to the view selector
        viewSelector.on('change', function(ids: string) {
          const newIds = { ids };
          activeUsersChart.set(newIds).execute();
          channelChart.set(newIds).execute();
          realtimeUsers.set(newIds).execute();
        });

        // Render the view selector
        viewSelector.execute();
        setIsLoading(false);
      } catch (error) {
        console.error('Analytics initialization error:', error);
        setError('Failed to initialize analytics');
        setIsLoading(false);
      }
    });
  };

  useEffect(() => {
    // Start initialization
    initAnalytics();
  }, []);

  return (
    <>
      <div className="p-8">
        <Head>
          <title>Analytics Dashboard</title>
        </Head>

        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

        {/* View Selector */}
        <div className="mb-8">
          <div id="view-selector" className="mb-4"></div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div id="active-users-chart" style={{ minHeight: '300px' }}></div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div id="channel-chart" style={{ minHeight: '300px' }}></div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div id="realtime-users" style={{ minHeight: '100px' }}></div>
          </div>
        </div>
        {isLoading && <div className="text-center">Loading analytics...</div>}
        {error && <div className="text-red-500">{error}</div>}
      </div>

      {/* Load required scripts */}
      <Script
        src="https://apis.google.com/js/platform.js"
        strategy="beforeInteractive"
        onLoad={() => {
          window.gapi.analytics.ready(() => {
            initAnalytics();
          });
        }}
      />
    </>
  );
}