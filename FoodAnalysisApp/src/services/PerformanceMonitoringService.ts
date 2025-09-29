import { InteractionManager } from 'react-native';
import { PerformanceOptimizer } from '../utils/performanceOptimization';
import { performance } from '../utils/performance';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: 'render' | 'database' | 'network' | 'animation' | 'user_interaction';
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  totalMetrics: number;
  averageRenderTime: number;
  slowOperations: PerformanceMetric[];
  memoryUsage: number;
  recommendations: string[];
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private isMonitoring = false;
  private maxMetrics = 1000; // Prevent memory leaks
  private performanceThresholds = {
    render: 16.67, // 60fps
    database: 100,
    network: 5000,
    animation: 300,
    user_interaction: 100,
  };

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    console.log('Performance monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  measureOperation<T>(
    operationName: string,
    category: PerformanceMetric['category'],
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.isMonitoring) {
      return operation();
    }

    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordMetric({
      name: operationName,
      duration,
      timestamp: Date.now(),
      category,
      metadata,
    });

    return result;
  }

  async measureAsyncOperation<T>(
    operationName: string,
    category: PerformanceMetric['category'],
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isMonitoring) {
      return operation();
    }

    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordMetric({
      name: operationName,
      duration,
      timestamp: Date.now(),
      category,
      metadata,
    });

    return result;
  }

  measureRenderTime(componentName: string, renderFunction: () => void): void {
    this.measureOperation(
      `Render: ${componentName}`,
      'render',
      renderFunction,
      { component: componentName }
    );
  }

  measureDatabaseOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.measureAsyncOperation(
      `Database: ${operationName}`,
      'database',
      operation
    );
  }

  measureNetworkRequest<T>(
    requestName: string,
    request: () => Promise<T>
  ): Promise<T> {
    return this.measureAsyncOperation(
      `Network: ${requestName}`,
      'network',
      request
    );
  }

  measureUserInteraction(
    interactionName: string,
    handler: () => void
  ): void {
    this.measureOperation(
      `Interaction: ${interactionName}`,
      'user_interaction',
      handler,
      { interaction: interactionName }
    );
  }

  measureAnimationPerformance(
    animationName: string,
    animationFunction: () => void
  ): void {
    this.measureOperation(
      `Animation: ${animationName}`,
      'animation',
      animationFunction,
      { animation: animationName }
    );
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Prevent memory leaks by limiting stored metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }

    // Log slow operations
    const threshold = this.performanceThresholds[metric.category];
    if (metric.duration > threshold) {
      console.warn(
        `Slow ${metric.category} operation: ${metric.name} took ${metric.duration.toFixed(2)}ms`
      );
    }
  }

  getPerformanceReport(): PerformanceReport {
    const totalMetrics = this.metrics.length;
    
    if (totalMetrics === 0) {
      return {
        totalMetrics: 0,
        averageRenderTime: 0,
        slowOperations: [],
        memoryUsage: 0,
        recommendations: ['No performance data available'],
      };
    }

    // Calculate average render time
    const renderMetrics = this.metrics.filter(m => m.category === 'render');
    const averageRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.duration, 0) / renderMetrics.length
      : 0;

    // Find slow operations
    const slowOperations = this.metrics.filter(metric => {
      const threshold = this.performanceThresholds[metric.category];
      return metric.duration > threshold;
    }).sort((a, b) => b.duration - a.duration).slice(0, 10);

    // Estimate memory usage (simplified)
    const memoryUsage = this.metrics.length * 100; // Rough estimate

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      averageRenderTime,
      slowOperations
    );

    return {
      totalMetrics,
      averageRenderTime,
      slowOperations,
      memoryUsage,
      recommendations,
    };
  }

  private generateRecommendations(
    averageRenderTime: number,
    slowOperations: PerformanceMetric[]
  ): string[] {
    const recommendations: string[] = [];

    if (averageRenderTime > 16.67) {
      recommendations.push(
        'Consider optimizing render performance. Average render time exceeds 60fps threshold.'
      );
    }

    const slowRenders = slowOperations.filter(op => op.category === 'render');
    if (slowRenders.length > 0) {
      recommendations.push(
        `${slowRenders.length} slow render operations detected. Consider using React.memo or useMemo.`
      );
    }

    const slowDatabase = slowOperations.filter(op => op.category === 'database');
    if (slowDatabase.length > 0) {
      recommendations.push(
        `${slowDatabase.length} slow database operations detected. Consider optimizing queries or adding indexes.`
      );
    }

    const slowNetwork = slowOperations.filter(op => op.category === 'network');
    if (slowNetwork.length > 0) {
      recommendations.push(
        `${slowNetwork.length} slow network operations detected. Consider implementing caching or request optimization.`
      );
    }

    const slowAnimations = slowOperations.filter(op => op.category === 'animation');
    if (slowAnimations.length > 0) {
      recommendations.push(
        `${slowAnimations.length} slow animations detected. Consider using native driver or reducing animation complexity.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No major issues detected.');
    }

    return recommendations;
  }

  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.category === category);
  }

  getMetricsByTimeRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(
      metric => metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  clearMetrics(): void {
    this.metrics = [];
    console.log('Performance metrics cleared');
  }

  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      report: this.getPerformanceReport(),
    }, null, 2);
  }

  // Integration with PerformanceOptimizer
  optimizeOperation<T>(
    operationName: string,
    category: PerformanceMetric['category'],
    operation: () => T
  ): T {
    return this.measureOperation(
      operationName,
      category,
      () => PerformanceOptimizer.measurePerformance(operation, operationName)
    );
  }

  optimizeAsyncOperation<T>(
    operationName: string,
    category: PerformanceMetric['category'],
    operation: () => Promise<T>
  ): Promise<T> {
    return this.measureAsyncOperation(
      operationName,
      category,
      () => PerformanceOptimizer.deferUntilInteractionComplete(operation)
    );
  }

  // Memory management
  scheduleCleanup(): void {
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      this.metrics = this.metrics.filter(
        metric => metric.timestamp > fiveMinutesAgo
      );
    }, 5 * 60 * 1000);
  }

  // Development helpers
  logPerformanceReport(): void {
    if (__DEV__) {
      const report = this.getPerformanceReport();
      console.group('Performance Report');
      console.log('Total Metrics:', report.totalMetrics);
      console.log('Average Render Time:', report.averageRenderTime.toFixed(2) + 'ms');
      console.log('Slow Operations:', report.slowOperations.length);
      console.log('Memory Usage:', report.memoryUsage + ' bytes (estimated)');
      console.log('Recommendations:', report.recommendations);
      console.groupEnd();
    }
  }

  // React DevTools integration
  enableReactDevToolsProfiler(): void {
    if (__DEV__ && typeof window !== 'undefined') {
      // Enable React DevTools Profiler integration
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook) {
        hook.onCommitFiberRoot = (
          id: any,
          root: any,
          priorityLevel: any
        ) => {
          this.recordMetric({
            name: 'React Commit',
            duration: performance.now(),
            timestamp: Date.now(),
            category: 'render',
            metadata: { id, priorityLevel },
          });
        };
      }
    }
  }
}