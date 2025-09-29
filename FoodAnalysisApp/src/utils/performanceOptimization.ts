import { InteractionManager, LayoutAnimation, Platform } from 'react-native';
import { performance } from './performance';

export class PerformanceOptimizer {
  private static animationQueue: Array<() => void> = [];
  private static isProcessingAnimations = false;

  /**
   * Optimize heavy computations by deferring them until after interactions
   */
  static async deferUntilInteractionComplete<T>(computation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          const result = await computation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Batch multiple animations to prevent frame drops
   */
  static queueAnimation(animation: () => void): void {
    this.animationQueue.push(animation);
    
    if (!this.isProcessingAnimations) {
      this.processAnimationQueue();
    }
  }

  private static async processAnimationQueue(): Promise<void> {
    this.isProcessingAnimations = true;
    
    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift();
      if (animation) {
        animation();
        // Wait for next frame
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
    
    this.isProcessingAnimations = false;
  }

  /**
   * Optimize layout animations for better performance
   */
  static configureLayoutAnimation(duration: number = 300): void {
    const config = {
      duration,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    };

    if (Platform.OS === 'android') {
      // Android-specific optimizations
      LayoutAnimation.configureNext({
        ...config,
        duration: Math.min(duration, 250), // Shorter duration on Android
      });
    } else {
      LayoutAnimation.configureNext(config);
    }
  }

  /**
   * Debounce function calls to prevent excessive re-renders
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function calls to limit execution frequency
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Optimize color calculations for progress bars
   */
  static memoizeColorCalculations = (() => {
    const cache = new Map<string, string>();
    
    return (baseColor: string, opacity: number): string => {
      const key = `${baseColor}-${opacity}`;
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      // Convert hex to rgba with opacity
      const hex = baseColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const result = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      
      cache.set(key, result);
      return result;
    };
  })();

  /**
   * Optimize large list rendering with virtualization hints
   */
  static getListOptimizationProps(itemCount: number) {
    return {
      removeClippedSubviews: itemCount > 20,
      maxToRenderPerBatch: Math.min(10, itemCount),
      updateCellsBatchingPeriod: 50,
      initialNumToRender: Math.min(10, itemCount),
      windowSize: itemCount > 50 ? 5 : 10,
      getItemLayout: itemCount > 100 ? (data: any, index: number) => ({
        length: 80, // Estimated item height
        offset: 80 * index,
        index,
      }) : undefined,
    };
  }

  /**
   * Memory-efficient image loading for progress bar backgrounds
   */
  static optimizeImageLoading(imageUri: string, size: { width: number; height: number }) {
    return {
      uri: imageUri,
      cache: 'force-cache' as const,
      ...size,
    };
  }

  /**
   * Optimize touch handling for interactive elements
   */
  static optimizeTouchHandling = {
    activeOpacity: 0.8,
    delayPressIn: 0,
    delayPressOut: 100,
    delayLongPress: 500,
    pressRetentionOffset: { top: 10, left: 10, bottom: 10, right: 10 },
  };

  /**
   * Batch state updates to prevent excessive re-renders
   */
  static batchStateUpdates<T>(
    updates: Array<() => void>,
    callback?: () => void
  ): void {
    // Use React's unstable_batchedUpdates if available
    if (typeof (global as any).unstable_batchedUpdates === 'function') {
      (global as any).unstable_batchedUpdates(() => {
        updates.forEach(update => update());
        if (callback) {
          callback();
        }
      });
    } else {
      // Fallback: execute updates in next tick
      setTimeout(() => {
        updates.forEach(update => update());
        if (callback) {
          callback();
        }
      }, 0);
    }
  }

  /**
   * Monitor performance metrics
   */
  static measurePerformance<T>(
    operation: () => T,
    operationName: string
  ): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    if (duration > 16.67) { // More than one frame (60fps)
      console.warn(`Performance warning: ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  /**
   * Optimize component re-renders with shallow comparison
   */
  static shallowEqual(obj1: any, obj2: any): boolean {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    for (let key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Clean up resources and prevent memory leaks
   */
  static cleanup(): void {
    this.animationQueue.length = 0;
    this.isProcessingAnimations = false;
  }
}