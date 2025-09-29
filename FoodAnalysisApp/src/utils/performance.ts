import { InteractionManager, Platform } from 'react-native';

// Performance optimization utilities
export const performance = {
  // Debounce function for input handling
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for scroll events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Run after interactions complete
  runAfterInteractions: (callback: () => void): void => {
    InteractionManager.runAfterInteractions(callback);
  },

  // Batch updates for large datasets
  batchProcess: async <T, R>(
    items: T[],
    processor: (item: T) => R | Promise<R>,
    batchSize: number = 50
  ): Promise<R[]> => {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
      
      // Allow other tasks to run between batches (use setImmediate in tests)
      if (typeof setImmediate !== 'undefined') {
        await new Promise(resolve => setImmediate(resolve));
      } else {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return results;
  },

  // Memoization utility
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  // Memory-efficient list rendering helpers
  getItemLayout: (itemHeight: number) => (
    data: any[] | null | undefined,
    index: number
  ) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  }),

  // Optimize image loading
  getOptimizedImageProps: (uri: string, width: number, height: number) => ({
    source: { uri },
    style: { width, height },
    resizeMode: 'cover' as const,
    ...(Platform.OS === 'android' && {
      fadeDuration: 0, // Disable fade animation on Android for better performance
    }),
  }),

  // Database query optimization
  optimizeQuery: {
    // Limit results for large datasets
    withLimit: (query: string, limit: number = 100) => 
      `${query} LIMIT ${limit}`,
    
    // Add pagination
    withPagination: (query: string, page: number, pageSize: number = 50) => 
      `${query} LIMIT ${pageSize} OFFSET ${page * pageSize}`,
    
    // Add indexes hint
    withIndex: (query: string, indexName: string) => 
      `${query} INDEXED BY ${indexName}`,
  },

  // Memory management
  memory: {
    // Clear caches
    clearCaches: () => {
      // Implementation would clear various caches
      console.log('Clearing performance caches');
    },
    
    // Monitor memory usage (development only)
    logMemoryUsage: () => {
      if (__DEV__) {
        console.log('Memory usage monitoring - implement native bridge if needed');
      }
    },
  },

  // Animation optimization
  animation: {
    // Use native driver when possible
    useNativeDriver: Platform.select({
      ios: true,
      android: true,
      default: false,
    }),
    
    // Optimized timing config
    timing: {
      duration: 250,
      useNativeDriver: true,
    },
    
    // Optimized spring config
    spring: {
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    },
  },

  // Network optimization
  network: {
    // Request timeout
    timeout: 10000,
    
    // Retry configuration
    retry: {
      attempts: 3,
      delay: 1000,
      backoff: 2,
    },
    
    // Cache configuration
    cache: {
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxSize: 50, // 50 items
    },
  },
};

// Performance monitoring utilities
export const performanceMonitor = {
  // Measure function execution time
  measure: <T extends (...args: any[]) => any>(
    name: string,
    fn: T
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = Date.now();
      const result = fn(...args);
      const end = Date.now();
      
      if (__DEV__) {
        console.log(`Performance: ${name} took ${end - start}ms`);
      }
      
      return result;
    }) as T;
  },

  // Measure async function execution time
  measureAsync: <T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T
  ): T => {
    return (async (...args: Parameters<T>) => {
      const start = Date.now();
      const result = await fn(...args);
      const end = Date.now();
      
      if (__DEV__) {
        console.log(`Performance: ${name} took ${end - start}ms`);
      }
      
      return result;
    }) as T;
  },

  // Track render performance
  trackRender: (componentName: string) => {
    if (__DEV__) {
      const start = Date.now();
      return () => {
        const end = Date.now();
        console.log(`Render: ${componentName} took ${end - start}ms`);
      };
    }
    return () => {};
  },
};

// Large dataset optimization utilities
export const datasetOptimization = {
  // Virtual scrolling configuration
  virtualScrolling: {
    itemHeight: 60,
    windowSize: 10,
    initialNumToRender: 10,
    maxToRenderPerBatch: 5,
    updateCellsBatchingPeriod: 50,
    removeClippedSubviews: true,
  },

  // Enhanced virtual scrolling for comparison cards
  enhancedComparisonScrolling: {
    itemHeight: 120, // Taller for enhanced cards
    windowSize: 8,
    initialNumToRender: 8,
    maxToRenderPerBatch: 4,
    updateCellsBatchingPeriod: 100,
    removeClippedSubviews: true,
    getItemLayout: (data: any, index: number) => ({
      length: 120,
      offset: 120 * index,
      index,
    }),
  },

  // Chunk large arrays for processing
  chunkArray: <T>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  },

  // Filter large datasets efficiently
  efficientFilter: <T>(
    items: T[],
    predicate: (item: T) => boolean,
    maxResults: number = 100
  ): T[] => {
    const results: T[] = [];
    for (const item of items) {
      if (predicate(item)) {
        results.push(item);
        if (results.length >= maxResults) break;
      }
    }
    return results;
  },

  // Search large datasets efficiently
  efficientSearch: <T>(
    items: T[],
    searchTerm: string,
    getSearchableText: (item: T) => string,
    maxResults: number = 50
  ): T[] => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const results: T[] = [];
    
    for (const item of items) {
      const searchableText = getSearchableText(item).toLowerCase();
      if (searchableText.includes(lowerSearchTerm)) {
        results.push(item);
        if (results.length >= maxResults) break;
      }
    }
    
    return results;
  },

  // Lazy loading for enhanced comparison data
  lazyLoadComparisonData: async <T>(
    dataLoader: () => Promise<T[]>,
    pageSize: number = 20
  ): Promise<{
    loadPage: (page: number) => Promise<T[]>;
    getTotalCount: () => Promise<number>;
    preloadNext: (currentPage: number) => void;
  }> => {
    let cachedData: T[] | null = null;
    let loadingPromise: Promise<T[]> | null = null;

    const getData = async (): Promise<T[]> => {
      if (cachedData) return cachedData;
      if (loadingPromise) return loadingPromise;

      loadingPromise = dataLoader();
      cachedData = await loadingPromise;
      loadingPromise = null;
      return cachedData;
    };

    return {
      loadPage: async (page: number) => {
        const data = await getData();
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;
        return data.slice(startIndex, endIndex);
      },
      getTotalCount: async () => {
        const data = await getData();
        return data.length;
      },
      preloadNext: (currentPage: number) => {
        // Preload next page in background
        setTimeout(() => {
          getData().then(data => {
            const nextStartIndex = (currentPage + 1) * pageSize;
            if (nextStartIndex < data.length) {
              // Data is already cached, so this is essentially a no-op
              // but ensures the data is ready
            }
          });
        }, 100);
      },
    };
  },
};

// Enhanced visualization performance utilities
export const visualizationPerformance = {
  // Optimize color calculations for layered progress bars
  colorCache: new Map<string, string>(),
  
  getCachedColor: (baseColor: string, opacity: number): string => {
    const key = `${baseColor}-${opacity}`;
    if (visualizationPerformance.colorCache.has(key)) {
      return visualizationPerformance.colorCache.get(key)!;
    }
    
    // Convert hex to rgba with opacity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    
    visualizationPerformance.colorCache.set(key, color);
    return color;
  },

  // Batch animation updates for multiple progress bars
  batchAnimationUpdates: (animations: Array<() => void>, batchSize: number = 5) => {
    const batches = [];
    for (let i = 0; i < animations.length; i += batchSize) {
      batches.push(animations.slice(i, i + batchSize));
    }

    batches.forEach((batch, index) => {
      if (index === 0) {
        // Execute first batch immediately
        batch.forEach(animation => animation());
      } else {
        // Stagger subsequent batches
        setTimeout(() => {
          batch.forEach(animation => animation());
        }, index * 50);
      }
    });
  },

  // Optimize progress bar rendering
  optimizeProgressBarRendering: {
    // Use transform instead of width changes for better performance
    useTransform: true,
    
    // Reduce animation complexity for large datasets
    getAnimationConfig: (itemCount: number) => ({
      duration: itemCount > 50 ? 200 : 400,
      useNativeDriver: true,
      stagger: itemCount > 20 ? 10 : 50,
    }),

    // Throttle progress bar updates
    throttleUpdates: performance.throttle((callback: () => void) => {
      callback();
    }, 16), // 60fps
  },

  // Memory management for complex visualizations
  memoryManagement: {
    // Clear animation caches periodically
    clearAnimationCaches: () => {
      visualizationPerformance.colorCache.clear();
    },

    // Optimize image memory usage
    optimizeImageMemory: (imageCount: number) => {
      if (imageCount > 100) {
        // Implement image recycling or lazy loading
        console.log('Optimizing memory for large image count:', imageCount);
      }
    },

    // Monitor memory usage for visualizations
    monitorVisualizationMemory: () => {
      if (__DEV__) {
        const cacheSize = visualizationPerformance.colorCache.size;
        if (cacheSize > 1000) {
          console.warn('Color cache size is large:', cacheSize);
          // Clear half of the cache
          const entries = Array.from(visualizationPerformance.colorCache.entries());
          entries.slice(0, Math.floor(entries.length / 2)).forEach(([key]) => {
            visualizationPerformance.colorCache.delete(key);
          });
        }
      }
    },
  },

  // Efficient calculation utilities for enhanced comparisons
  calculations: {
    // Memoized percentage calculations
    calculatePercentage: performance.memoize((value: number, reference: number): number => {
      if (reference === 0) return 0;
      return Math.min((value / reference) * 100, 200); // Cap at 200%
    }),

    // Batch calculate multiple percentages
    batchCalculatePercentages: (
      values: number[], 
      references: number[]
    ): number[] => {
      return values.map((value, index) => {
        const reference = references[index];
        if (reference === undefined) {
          // If no reference provided, return the value as percentage of 100
          return Math.min((value / 100) * 100, 200);
        }
        return visualizationPerformance.calculations.calculatePercentage(value, reference);
      });
    },

    // Efficient layer width calculations
    calculateLayerWidths: performance.memoize((
      layers: Array<{value: number, percentage: number}>,
      maxWidth: number
    ): number[] => {
      return layers.map(layer => 
        Math.min(maxWidth * (layer.percentage / 100), maxWidth)
      );
    }),
  },
};