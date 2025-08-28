import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

export interface PerformanceMetrics {
  pageUrl: string;
  loadTime: number;
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  timestamp: number;
}

const usePerformanceMonitoring = () => {
  const router = useRouter();

  const getMetricStatus = (metric: string, value: number): { status: string; color: string } => {
    const thresholds = {
      loadTime: { good: 2000, needsImprovement: 3000 }, // 2s, 3s
      ttfb: { good: 200, needsImprovement: 500 }, // 200ms, 500ms
      fcp: { good: 1800, needsImprovement: 3000 }, // 1.8s, 3s
      lcp: { good: 2500, needsImprovement: 4000 }, // 2.5s, 4s
      fid: { good: 100, needsImprovement: 300 }, // 100ms, 300ms
      cls: { good: 0.1, needsImprovement: 0.25 }, // 0.1, 0.25
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold || value === null) return { status: 'N/A', color: '#6B7280' };

    if (value <= threshold.good) {
      return { status: 'Good', color: '#22C55E' }; // green
    } else if (value <= threshold.needsImprovement) {
      return { status: 'Needs Improvement', color: '#F59E0B' }; // yellow
    } else {
      return { status: 'Poor', color: '#EF4444' }; // red
    }
  };

  const logMetrics = useCallback(async (metrics: PerformanceMetrics) => {
    try {
      // Create formatted log entries
      console.group('📊 Performance Metrics');
      console.log('Timestamp:', new Date(metrics.timestamp).toLocaleString());
      console.log('Page URL:', metrics.pageUrl);
      
      // Log each metric with color coding
      Object.entries(metrics).forEach(([key, value]) => {
        if (key !== 'timestamp' && key !== 'pageUrl') {
          const { status, color } = getMetricStatus(key, value as number);
          const metricValue = value === null ? 'Not available' : 
            key === 'cls' ? value.toFixed(3) : // CLS needs more decimal places
            typeof value === 'number' ? `${value.toFixed(1)}ms` : value;
          
          console.log(
            `%c${key.toUpperCase()}: %c${metricValue} %c${status}`,
            'color: #64748B; font-weight: bold;', // metric name
            `color: ${color}; font-weight: bold;`, // value
            `color: ${color}; font-style: italic;` // status
          );
        }
      });
      console.groupEnd();

      const response = await fetch('/api/performance/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });
      const data = await response.json();
    } catch (error) {
      console.error('❌ Failed to log performance metrics:', error);
    }
  }, []);

  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    // Calculate First Contentful Paint
    const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint');
    const fcp = fcpEntry ? fcpEntry.startTime : 0;

    // Basic metrics
    const metrics: PerformanceMetrics = {
      pageUrl: window.location.pathname,
      loadTime: navigation.loadEventEnd - navigation.startTime,
      ttfb: navigation.responseStart - navigation.requestStart,
      fcp: fcp,
      lcp: null,
      fid: null,
      cls: null,
      timestamp: Date.now(),
    };

    return metrics;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a PerformanceObserver for Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      const metrics = getPerformanceMetrics();
      metrics.lcp = lastEntry.startTime;
      logMetrics(metrics);
    });

    // Create a PerformanceObserver for First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0] as PerformanceEventTiming;
      const metrics = getPerformanceMetrics();
      if (firstInput && 'processingStart' in firstInput) {
        metrics.fid = firstInput.processingStart - firstInput.startTime;
      }
      logMetrics(metrics);
    });

    // Create a PerformanceObserver for Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as LayoutShift;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
      const metrics = getPerformanceMetrics();
      metrics.cls = clsValue;
      logMetrics(metrics);
    });

    try {
      // Observe LCP
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Observe FID
      fidObserver.observe({ entryTypes: ['first-input'] });
      
      // Observe CLS
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Log initial page load metrics
      window.addEventListener('load', () => {
        const metrics = getPerformanceMetrics();
        logMetrics(metrics);
      });

      // Cleanup
      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (error) {
      console.error('Performance monitoring error:', error);
    }
  }, [getPerformanceMetrics, logMetrics]);

  // Handle route changes
  useEffect(() => {
    const handleRouteChange = () => {
      const metrics = getPerformanceMetrics();
      logMetrics(metrics);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, getPerformanceMetrics, logMetrics]);
}

export default usePerformanceMonitoring;
