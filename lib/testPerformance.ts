// Simple test to verify performance monitoring is working
export const testPerformanceMonitoring = () => {
  if (typeof window === 'undefined') {
    console.log('❌ Performance monitoring test: Not in browser environment');
    return;
  }

  console.log('🧪 Testing performance monitoring...');
  
  // Test if performance API is available
  if (!window.performance) {
    console.log('❌ Performance API not available');
    return;
  }

  // Test basic performance metrics
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navigation) {
    console.log('❌ Navigation timing not available');
    return;
  }

  console.log('✅ Performance API available');
  console.log('✅ Navigation timing available');
  
  // Test paint metrics
  const paint = performance.getEntriesByType('paint');
  console.log('✅ Paint entries:', paint.length);
  
  // Test resource metrics
  const resources = performance.getEntriesByType('resource');
  console.log('✅ Resource entries:', resources.length);
  
  // Test if PerformanceObserver is available
  if (typeof PerformanceObserver === 'undefined') {
    console.log('❌ PerformanceObserver not available');
    return;
  }
  
  console.log('✅ PerformanceObserver available');
  console.log('✅ Performance monitoring test passed!');
  
  // Log current page metrics
  const loadTime = navigation.loadEventEnd - navigation.startTime;
  const ttfb = navigation.responseStart - navigation.requestStart;
  const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint');
  const fcp = fcpEntry ? fcpEntry.startTime : 0;
  
  console.log('📊 Current page metrics:');
  console.log(`  Load Time: ${loadTime.toFixed(0)}ms`);
  console.log(`  TTFB: ${ttfb.toFixed(0)}ms`);
  console.log(`  FCP: ${fcp.toFixed(0)}ms`);
  console.log(`  Resources: ${resources.length} files`);
};
