// Simple performance monitoring that logs to console
export interface PerformanceMetrics {
  pageUrl: string;
  loadTime: number;
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  domContentLoaded: number;
  domComplete: number;
  resourceCount: number;
  resourceSize: number;
  timestamp: number;
}

export const logPerformanceMetrics = (metrics: PerformanceMetrics) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Performance logger called with metrics:', metrics);
  }
  
  const formatTime = (ms: number) => `${ms.toFixed(0)}ms`;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatus = (metric: string, value: number) => {
    const thresholds = {
      loadTime: { good: 2000, needsImprovement: 3000 },
      ttfb: { good: 200, needsImprovement: 500 },
      fcp: { good: 1800, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      domContentLoaded: { good: 1000, needsImprovement: 2000 },
      domComplete: { good: 2000, needsImprovement: 3000 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold || value === null) return 'N/A';

    if (value <= threshold.good) return '✅ Good';
    if (value <= threshold.needsImprovement) return '⚠️ Needs Improvement';
    return '❌ Poor';
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('\n🚀 PERFORMANCE METRICS');
    console.log('═'.repeat(50));
    console.log(`📄 Page: ${metrics.pageUrl}`);
    console.log(`⏰ Time: ${new Date(metrics.timestamp).toLocaleString()}`);
    console.log('─'.repeat(50));
    
    console.log(`🕐 Load Time: ${formatTime(metrics.loadTime)} ${getStatus('loadTime', metrics.loadTime)}`);
    console.log(`⚡ TTFB: ${formatTime(metrics.ttfb)} ${getStatus('ttfb', metrics.ttfb)}`);
    console.log(`🎨 FCP: ${formatTime(metrics.fcp)} ${getStatus('fcp', metrics.fcp)}`);
    
    if (metrics.lcp !== null) {
      console.log(`🖼️ LCP: ${formatTime(metrics.lcp)} ${getStatus('lcp', metrics.lcp)}`);
    }
    
    if (metrics.fid !== null) {
      console.log(`👆 FID: ${formatTime(metrics.fid)} ${getStatus('fid', metrics.fid)}`);
    }
    
    if (metrics.cls !== null) {
      console.log(`📐 CLS: ${metrics.cls.toFixed(3)} ${getStatus('cls', metrics.cls)}`);
    }
    
    console.log(`📄 DOM Content Loaded: ${formatTime(metrics.domContentLoaded)} ${getStatus('domContentLoaded', metrics.domContentLoaded)}`);
    console.log(`✅ DOM Complete: ${formatTime(metrics.domComplete)} ${getStatus('domComplete', metrics.domComplete)}`);
    console.log(`📦 Resources: ${metrics.resourceCount} files (${formatBytes(metrics.resourceSize)})`);
    console.log('═'.repeat(50));
  }
  
  // Emit custom event for performance summary component
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('performance-metrics', { detail: metrics });
    window.dispatchEvent(event);
  }
};

export const getPerformanceMetrics = (): PerformanceMetrics => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');
  const resources = performance.getEntriesByType('resource');
  
  // Calculate First Contentful Paint
  const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint');
  const fcp = fcpEntry ? fcpEntry.startTime : 0;

  // Calculate resource metrics
  const resourceCount = resources.length;
  const resourceSize = resources.reduce((total, resource) => {
    const transferSize = (resource as PerformanceResourceTiming).transferSize || 0;
    return total + transferSize;
  }, 0);

  return {
    pageUrl: window.location.pathname,
    loadTime: navigation.loadEventEnd - navigation.startTime,
    ttfb: navigation.responseStart - navigation.requestStart,
    fcp: fcp,
    lcp: null, // Will be set by observer
    fid: null, // Will be set by observer
    cls: null, // Will be set by observer
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
    domComplete: navigation.domComplete - navigation.startTime,
    resourceCount,
    resourceSize,
    timestamp: Date.now(),
  };
};
