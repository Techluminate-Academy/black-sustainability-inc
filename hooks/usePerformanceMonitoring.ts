import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getPerformanceMetrics, logPerformanceMetrics, PerformanceMetrics } from '../lib/performanceLogger';

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

const usePerformanceMonitoring = () => {
  const router = useRouter();

  const logMetrics = useCallback((metrics: PerformanceMetrics) => {
    logPerformanceMetrics(metrics);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('🚀 Performance monitoring initialized');

    let lcpValue: number | null = null;
    let fidValue: number | null = null;
    let clsValue: number | null = null;

    // Create a PerformanceObserver for Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcpValue = lastEntry.startTime;
      console.log('📊 LCP detected:', lcpValue);
    });

    // Create a PerformanceObserver for First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0] as PerformanceEventTiming;
      if (firstInput && 'processingStart' in firstInput) {
        fidValue = firstInput.processingStart - firstInput.startTime;
        console.log('📊 FID detected:', fidValue);
      }
    });

    // Create a PerformanceObserver for Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as LayoutShift;
        if (!layoutShift.hadRecentInput) {
          clsValue = (clsValue || 0) + layoutShift.value;
          console.log('📊 CLS detected:', clsValue);
        }
      }
    });

    try {
      // Observe LCP
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Observe FID
      fidObserver.observe({ entryTypes: ['first-input'] });
      
      // Observe CLS
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Log initial page load metrics
      const handleLoad = () => {
        console.log('📊 Page load event triggered');
        const metrics = getPerformanceMetrics();
        metrics.lcp = lcpValue;
        metrics.fid = fidValue;
        metrics.cls = clsValue;
        logMetrics(metrics);
      };

      window.addEventListener('load', handleLoad);

      // Also log after a short delay to catch any late metrics
      const timeoutId = setTimeout(() => {
        console.log('📊 Delayed performance check');
        const metrics = getPerformanceMetrics();
        metrics.lcp = lcpValue;
        metrics.fid = fidValue;
        metrics.cls = clsValue;
        logMetrics(metrics);
      }, 2000);

      // Cleanup
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(timeoutId);
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (error) {
      console.error('Performance monitoring error:', error);
    }
  }, [logMetrics]);

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
  }, [router.events, logMetrics]);
}

export default usePerformanceMonitoring;
