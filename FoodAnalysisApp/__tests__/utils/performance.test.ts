import { InteractionManager } from 'react-native';
import { performance, performanceMonitor, datasetOptimization, visualizationPerformance } from '../../src/utils/performance';

// Mock InteractionManager
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));

describe('Performance Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = performance.debounce(mockFn, 100);

      debouncedFn('test1');
      debouncedFn('test2');
      debouncedFn('test3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test3');
    });
  });

  describe('Throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = performance.throttle(mockFn, 100);

      throttledFn('test1');
      throttledFn('test2');
      throttledFn('test3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test1');

      jest.advanceTimersByTime(100);

      throttledFn('test4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('test4');
    });
  });

  describe('Run After Interactions', () => {
    it('should run callback after interactions', () => {
      const callback = jest.fn();
      performance.runAfterInteractions(callback);
      expect(InteractionManager.runAfterInteractions).toHaveBeenCalledWith(callback);
    });
  });

  describe('Batch Processing', () => {
    it('should process items in batches', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processor = jest.fn((item: number) => item * 2);
      
      const results = await performance.batchProcess(items, processor, 3);
      
      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(processor).toHaveBeenCalledTimes(10);
      
      jest.useFakeTimers(); // Restore fake timers
    }, 15000);

    it('should handle async processors', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const items = [1, 2, 3];
      const processor = jest.fn(async (item: number) => {
        return item * 2;
      });
      
      const results = await performance.batchProcess(items, processor, 2);
      
      expect(results).toEqual([2, 4, 6]);
      expect(processor).toHaveBeenCalledTimes(3);
      
      jest.useFakeTimers(); // Restore fake timers
    }, 15000);
  });

  describe('Memoization', () => {
    it('should memoize function results', () => {
      const expensiveFn = jest.fn((x: number) => x * x);
      const memoizedFn = performance.memoize(expensiveFn);

      const result1 = memoizedFn(5);
      const result2 = memoizedFn(5);
      const result3 = memoizedFn(10);

      expect(result1).toBe(25);
      expect(result2).toBe(25);
      expect(result3).toBe(100);
      expect(expensiveFn).toHaveBeenCalledTimes(2); // Only called for unique inputs
    });
  });

  describe('Item Layout', () => {
    it('should generate correct item layout', () => {
      const getLayout = performance.getItemLayout(50);
      const layout = getLayout([], 3);

      expect(layout).toEqual({
        length: 50,
        offset: 150,
        index: 3,
      });
    });
  });

  describe('Query Optimization', () => {
    it('should add limit to queries', () => {
      const query = 'SELECT * FROM foods';
      const limitedQuery = performance.optimizeQuery.withLimit(query, 50);
      expect(limitedQuery).toBe('SELECT * FROM foods LIMIT 50');
    });

    it('should add pagination to queries', () => {
      const query = 'SELECT * FROM foods';
      const paginatedQuery = performance.optimizeQuery.withPagination(query, 2, 10);
      expect(paginatedQuery).toBe('SELECT * FROM foods LIMIT 10 OFFSET 20');
    });
  });
});

describe('Performance Monitor', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Measure Function', () => {
    it('should measure function execution time', () => {
      const testFn = jest.fn(() => 'result');
      const measuredFn = performanceMonitor.measure('testFunction', testFn);

      const result = measuredFn('arg1', 'arg2');

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(console.log).toHaveBeenCalledWith('Performance: testFunction took 100ms');
    });
  });

  describe('Measure Async Function', () => {
    it('should measure async function execution time', async () => {
      const testFn = jest.fn(async () => 'async result');
      const measuredFn = performanceMonitor.measureAsync('asyncFunction', testFn);

      const result = await measuredFn('arg1');

      expect(result).toBe('async result');
      expect(testFn).toHaveBeenCalledWith('arg1');
      expect(console.log).toHaveBeenCalledWith('Performance: asyncFunction took 100ms');
    });
  });
});

describe('Dataset Optimization', () => {
  describe('Chunk Array', () => {
    it('should chunk array into smaller arrays', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = datasetOptimization.chunkArray(array, 3);

      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10],
      ]);
    });
  });

  describe('Efficient Filter', () => {
    it('should filter items efficiently with max results', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const predicate = (item: number) => item % 2 === 0;
      const results = datasetOptimization.efficientFilter(items, predicate, 3);

      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('Efficient Search', () => {
    it('should search items efficiently', () => {
      const items = [
        { name: 'Apple' },
        { name: 'Banana' },
        { name: 'Orange' },
        { name: 'Grape' },
      ];
      const getSearchableText = (item: { name: string }) => item.name;
      const results = datasetOptimization.efficientSearch(items, 'ap', getSearchableText, 10);

      expect(results).toEqual([
        { name: 'Apple' },
        { name: 'Grape' },
      ]);
    });

    it('should respect max results limit', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ name: `Item ${i}` }));
      const getSearchableText = (item: { name: string }) => item.name;
      const results = datasetOptimization.efficientSearch(items, 'Item', getSearchableText, 5);

      expect(results).toHaveLength(5);
    });
  });

  describe('Enhanced Comparison Scrolling', () => {
    it('should provide optimized scrolling configuration for enhanced comparison cards', () => {
      const config = datasetOptimization.enhancedComparisonScrolling;
      
      expect(config.itemHeight).toBe(120);
      expect(config.windowSize).toBe(8);
      expect(config.initialNumToRender).toBe(8);
      expect(config.maxToRenderPerBatch).toBe(4);
      expect(config.removeClippedSubviews).toBe(true);
    });

    it('should calculate item layout for enhanced comparison cards', () => {
      const config = datasetOptimization.enhancedComparisonScrolling;
      const layout = config.getItemLayout([], 5);

      expect(layout).toEqual({
        length: 120,
        offset: 600, // 120 * 5
        index: 5,
      });
    });
  });

  describe('Lazy Loading', () => {
    it('should implement lazy loading for comparison data', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      const dataLoader = jest.fn().mockResolvedValue(mockData);

      const lazyLoader = await datasetOptimization.lazyLoadComparisonData(dataLoader, 20);

      // Load first page
      const page1 = await lazyLoader.loadPage(0);
      expect(page1).toHaveLength(20);
      expect(page1[0]).toEqual({ id: 0, name: 'Item 0' });
      expect(page1[19]).toEqual({ id: 19, name: 'Item 19' });

      // Load second page
      const page2 = await lazyLoader.loadPage(1);
      expect(page2).toHaveLength(20);
      expect(page2[0]).toEqual({ id: 20, name: 'Item 20' });

      // Get total count
      const totalCount = await lazyLoader.getTotalCount();
      expect(totalCount).toBe(100);

      // Data loader should only be called once due to caching
      expect(dataLoader).toHaveBeenCalledTimes(1);
    });

    it('should handle preloading', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      const dataLoader = jest.fn().mockResolvedValue(mockData);

      const lazyLoader = await datasetOptimization.lazyLoadComparisonData(dataLoader, 10);

      // Preload next page (should not throw)
      lazyLoader.preloadNext(0);
      
      // Wait a bit for preload to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(dataLoader).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Visualization Performance', () => {
  beforeEach(() => {
    visualizationPerformance.colorCache.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Color Caching', () => {
    it('should cache color calculations', () => {
      const color1 = visualizationPerformance.getCachedColor('#FF0000', 0.5);
      const color2 = visualizationPerformance.getCachedColor('#FF0000', 0.5);
      const color3 = visualizationPerformance.getCachedColor('#00FF00', 0.5);

      expect(color1).toBe('rgba(255, 0, 0, 0.5)');
      expect(color2).toBe(color1); // Should return cached value
      expect(color3).toBe('rgba(0, 255, 0, 0.5)');
      expect(visualizationPerformance.colorCache.size).toBe(2);
    });

    it('should handle different opacity values', () => {
      const color1 = visualizationPerformance.getCachedColor('#0000FF', 0.3);
      const color2 = visualizationPerformance.getCachedColor('#0000FF', 0.7);

      expect(color1).toBe('rgba(0, 0, 255, 0.3)');
      expect(color2).toBe('rgba(0, 0, 255, 0.7)');
      expect(visualizationPerformance.colorCache.size).toBe(2);
    });
  });

  describe('Batch Animation Updates', () => {
    it('should batch animation updates with staggered timing', () => {
      const animations = [
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ];

      visualizationPerformance.batchAnimationUpdates(animations, 3);

      // First batch should execute immediately
      expect(animations[0]).toHaveBeenCalled();
      expect(animations[1]).toHaveBeenCalled();
      expect(animations[2]).toHaveBeenCalled();
      expect(animations[3]).not.toHaveBeenCalled();

      // Advance time for second batch
      jest.advanceTimersByTime(50);
      expect(animations[3]).toHaveBeenCalled();
      expect(animations[4]).toHaveBeenCalled();
      expect(animations[5]).toHaveBeenCalled();
    });
  });

  describe('Progress Bar Rendering Optimization', () => {
    it('should provide animation config based on item count', () => {
      const smallDatasetConfig = visualizationPerformance.optimizeProgressBarRendering.getAnimationConfig(10);
      const largeDatasetConfig = visualizationPerformance.optimizeProgressBarRendering.getAnimationConfig(100);

      expect(smallDatasetConfig.duration).toBe(400);
      expect(smallDatasetConfig.stagger).toBe(50);
      expect(largeDatasetConfig.duration).toBe(200);
      expect(largeDatasetConfig.stagger).toBe(10);
      expect(smallDatasetConfig.useNativeDriver).toBe(true);
      expect(largeDatasetConfig.useNativeDriver).toBe(true);
    });

    it('should throttle progress bar updates', () => {
      const mockCallback = jest.fn();
      const throttledUpdate = visualizationPerformance.optimizeProgressBarRendering.throttleUpdates;

      throttledUpdate(mockCallback);
      throttledUpdate(mockCallback);
      throttledUpdate(mockCallback);

      expect(mockCallback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(16);
      throttledUpdate(mockCallback);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Management', () => {
    it('should clear animation caches', () => {
      // Add some items to cache
      visualizationPerformance.getCachedColor('#FF0000', 0.5);
      visualizationPerformance.getCachedColor('#00FF00', 0.5);
      expect(visualizationPerformance.colorCache.size).toBe(2);

      visualizationPerformance.memoryManagement.clearAnimationCaches();
      expect(visualizationPerformance.colorCache.size).toBe(0);
    });

    it('should monitor visualization memory usage', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Fill cache with many items to trigger warning
      for (let i = 0; i < 1001; i++) {
        visualizationPerformance.getCachedColor(`#${i.toString(16).padStart(6, '0')}`, 0.5);
      }

      visualizationPerformance.memoryManagement.monitorVisualizationMemory();

      expect(consoleSpy).toHaveBeenCalledWith('Color cache size is large:', 1001);
      expect(visualizationPerformance.colorCache.size).toBeLessThan(1001); // Should have been reduced

      consoleSpy.mockRestore();
    });

    it('should optimize image memory for large counts', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      visualizationPerformance.memoryManagement.optimizeImageMemory(150);

      expect(consoleSpy).toHaveBeenCalledWith('Optimizing memory for large image count:', 150);

      consoleSpy.mockRestore();
    });
  });

  describe('Efficient Calculations', () => {
    it('should memoize percentage calculations', () => {
      const result1 = visualizationPerformance.calculations.calculatePercentage(75, 100);
      const result2 = visualizationPerformance.calculations.calculatePercentage(75, 100);
      const result3 = visualizationPerformance.calculations.calculatePercentage(150, 100);

      expect(result1).toBe(75);
      expect(result2).toBe(75); // Should return cached result
      expect(result3).toBe(150);
    });

    it('should handle zero reference values', () => {
      const result = visualizationPerformance.calculations.calculatePercentage(50, 0);
      expect(result).toBe(0);
    });

    it('should cap percentages at 200%', () => {
      const result = visualizationPerformance.calculations.calculatePercentage(300, 100);
      expect(result).toBe(200);
    });

    it('should batch calculate multiple percentages', () => {
      const values = [50, 75, 100, 150];
      const references = [100, 100, 100, 100];

      const results = visualizationPerformance.calculations.batchCalculatePercentages(values, references);

      expect(results).toEqual([50, 75, 100, 150]);
    });

    it('should handle mismatched array lengths in batch calculations', () => {
      const values = [50, 75, 100];
      const references = [100, 100]; // Shorter array

      const results = visualizationPerformance.calculations.batchCalculatePercentages(values, references);

      expect(results).toEqual([50, 75, 100]); // Third value calculated as percentage of 100
    });

    it('should calculate layer widths efficiently', () => {
      const layers = [
        { value: 100, percentage: 100 },
        { value: 75, percentage: 75 },
        { value: 50, percentage: 50 },
      ];
      const maxWidth = 300;

      const widths = visualizationPerformance.calculations.calculateLayerWidths(layers, maxWidth);

      expect(widths).toEqual([300, 225, 150]);
    });

    it('should memoize layer width calculations', () => {
      const layers = [{ value: 100, percentage: 100 }];
      const maxWidth = 300;

      const widths1 = visualizationPerformance.calculations.calculateLayerWidths(layers, maxWidth);
      const widths2 = visualizationPerformance.calculations.calculateLayerWidths(layers, maxWidth);

      expect(widths1).toEqual(widths2);
      expect(widths1).toEqual([300]);
    });
  });
});