import React, { useState, useEffect } from 'react';

interface PerformanceSummaryProps {
  showInProduction?: boolean;
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ 
  showInProduction = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // Only show in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || showInProduction) {
      setIsVisible(true);
      
      // Listen for performance metrics
      const handlePerformanceData = (event: CustomEvent) => {
        setMetrics(event.detail);
      };
      
      window.addEventListener('performance-metrics', handlePerformanceData as EventListener);
      
      return () => {
        window.removeEventListener('performance-metrics', handlePerformanceData as EventListener);
      };
    }
  }, [showInProduction]);

  if (!isVisible) return null;

  const getStatusColor = (metric: string, value: number) => {
    const thresholds = {
      loadTime: { good: 2000, needsImprovement: 3000 },
      ttfb: { good: 200, needsImprovement: 500 },
      fcp: { good: 1800, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'text-gray-500';

    if (value <= threshold.good) return 'text-green-600';
    if (value <= threshold.needsImprovement) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (metric: string, value: number) => {
    const thresholds = {
      loadTime: { good: 2000, needsImprovement: 3000 },
      ttfb: { good: 200, needsImprovement: 500 },
      fcp: { good: 1800, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return '❓';

    if (value <= threshold.good) return '✅';
    if (value <= threshold.needsImprovement) return '⚠️';
    return '❌';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          ✕
        </button>
      </div>
      
      {metrics ? (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Load Time:</span>
            <span className={getStatusColor('loadTime', metrics.loadTime)}>
              {getStatusIcon('loadTime', metrics.loadTime)} {metrics.loadTime.toFixed(0)}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span>FCP:</span>
            <span className={getStatusColor('fcp', metrics.fcp)}>
              {getStatusIcon('fcp', metrics.fcp)} {metrics.fcp.toFixed(0)}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span>Resources:</span>
            <span className="text-gray-600">
              {metrics.resourceCount} files
            </span>
          </div>
          <div className="flex justify-between">
            <span>Size:</span>
            <span className="text-gray-600">
              {(metrics.resourceSize / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-500">
          Waiting for performance data...
        </div>
      )}
    </div>
  );
};

export default PerformanceSummary;
