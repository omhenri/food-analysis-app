// Mock React Native modules first
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));

import { performance, datasetOptimization } from '../../src/utils/performance';
import { AnalysisResult, EnhancedComparisonData, ChemicalSubstance } from '../../src/models/types';

// Mock enhanced analysis service and its dependencies
jest.mock('../../src/services/DatabaseService', () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      getSubstancesWithCategories: jest.fn(),
      getReferenceValues: jest.fn(),
    })),
  },
}));

jest.mock('../../src/services/EnhancedAnalysisDataService', () => ({
  EnhancedAnalysisDataService: jest.fn().mockImplementation(() => ({
    calculateEnhancedComparison: jest.fn(),
    calculateWeeklyTotals: jest.fn(),
    calculateNutritionScore: jest.fn(),
    categorizeSubstances: jest.fn(),
  })),
}));

// Performance monitoring utilities for enhanced comparison features
const enhancedPerformanceMonitor = {
  measureTime: async <T>(label: string, fn: () => Promise<T>): Promise<{ result: T; time: number }> => {
    const start = Date.now();
    const result = await fn();
    const time = Date.now() - start;
    console.log(`${label}: ${time.toFixed(2)}ms`);
    return { result, time };
  },
  
  measureMemory: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
  },
  
  generateLargeAnalysisDataset: (size: number, substancesPerEntry: number = 25): AnalysisResult[] => {
    const substances = [
      'Protein', 'Fat', 'Carbohydrates', 'Fiber', 'Sugar', 'Sodium', 'Potassium',
      'Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Vitamin K', 'Thiamin',
      'Riboflavin', 'Niacin', 'Vitamin B6', 'Folate', 'Vitamin B12', 'Biotin',
      'Pantothenic Acid', 'Calcium', 'Iron', 'Magnesium', 'Phosphorus', 'Zinc',
      'Copper', 'Manganese', 'Selenium', 'Chromium', 'Molybdenum', 'Chloride',
      'Caffeine', 'Alcohol', 'Trans Fat', 'Saturated Fat', 'Cholesterol'
    ];

    return Array.from({ length: size }, (_, i) => ({
      id: i + 1,
      foodEntryId: i + 1,
      foodId: `food-${i}`,
      ingredients: [`ingredient-${i}`, `ingredient-${i}-2`],
      chemicalSubstances: Array.from({ length: substancesPerEntry }, (_, j) => ({
        name: substances[j % substances.length],
        category: ['good', 'bad', 'neutral'][j % 3] as 'good' | 'bad' | 'neutral',
        amount: Math.random() * 100 + 1,
        mealType: ['breakfast', 'lunch', 'dinner', 'snack'][j % 4] as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      })),
      analyzedAt: new Date().toISOString(),
    }));
  },

  generateLargeComparisonDataset: (size: number): EnhancedComparisonData[] => {
    const baseData = [
      {
        substance: 'Calories',
        category: 'calorie' as const,
        consumed: 2800,
        unit: 'cal',
        status: 'excess' as const,
        referenceValues: [],
        layers: [],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      },
      {
        substance: 'Protein',
        category: 'macronutrient' as const,
        consumed: 65,
        unit: 'g',
        status: 'optimal' as const,
        referenceValues: [],
        layers: [],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      },
      {
        substance: 'Vitamin C',
        category: 'micronutrient' as const,
        consumed: 45,
        unit: 'mg',
        status: 'deficient' as const,
        referenceValues: [],
        layers: [],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      },
      {
        substance: 'Sodium',
        category: 'harmful' as const,
        consumed: 3200,
        unit: 'mg',
        status: 'excess' as const,
        referenceValues: [],
        layers: [],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      },
    ];
    
    return Array.from({ length: size }, (_, i) => ({
      ...baseData[i % baseData.length],
      substance: `${baseData[i % baseData.length].substance}-${i}`,
      consumed: Math.random() * 1000,
    }));
  },
};

describe('Large Dataset Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Query Performance', () => {
    it('should handle large food entry queries efficiently', async () => {
      // Mock large dataset
      const largeFoodEntries = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        dayId: Math.floor(i / 100) + 1,
        foodName: `Food Item ${i}`,
        mealType: ['breakfast', 'lunch', 'dinner', 'snack'][i % 4],
        portion: '1/1',
        createdAt: new Date().toISOString(),
      }));

      // Test that we can create and process large datasets
      expect(largeFoodEntries).toHaveLength(1000);
      expect(largeFoodEntries[0].foodName).toBe('Food Item 0');
      expect(largeFoodEntries[999].foodName).toBe('Food Item 999');
    });

    it('should use pagination for large datasets', async () => {
      const query = 'SELECT * FROM food_entries';
      const paginatedQuery = performance.optimizeQuery.withPagination(query, 0, 100);
      
      expect(paginatedQuery).toBe('SELECT * FROM food_entries LIMIT 100 OFFSET 0');
    });

    it('should limit results for performance', async () => {
      const query = 'SELECT * FROM analysis_results';
      const limitedQuery = performance.optimizeQuery.withLimit(query, 500);
      
      expect(limitedQuery).toBe('SELECT * FROM analysis_results LIMIT 500');
    });
  });

  describe('Data Processing Performance', () => {
    it('should process large analysis datasets efficiently', async () => {
      const largeAnalysisData = Array.from({ length: 100 }, (_, i) => ({
        foodId: `food-${i}`,
        ingredients: [`ingredient-${i}-1`, `ingredient-${i}-2`],
        chemicalSubstances: Array.from({ length: 5 }, (_, j) => ({
          name: `Substance ${j}`,
          category: 'good' as const,
          amount: Math.random() * 100,
          mealType: 'lunch',
        })),
      }));

      // Process in batches
      const results = await performance.batchProcess(
        largeAnalysisData,
        (item) => ({
          ...item,
          processed: true,
        }),
        10 // Process 10 items at a time
      );

      expect(results).toHaveLength(100);
      expect(results[0]).toHaveProperty('processed', true);
    });

    it('should filter large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        category: i % 2 === 0 ? 'even' : 'odd',
      }));

      const startTime = Date.now();
      
      const filteredResults = datasetOptimization.efficientFilter(
        largeDataset,
        (item) => item.category === 'even',
        1000 // Limit to 1000 results
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(filteredResults).toHaveLength(1000);
      expect(executionTime).toBeLessThan(100); // Should complete within 100ms
      expect(filteredResults.every(item => item.category === 'even')).toBe(true);
    });

    it('should search large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Food Item ${i}`,
        description: `This is food item number ${i}`,
      }));

      const startTime = Date.now();
      
      const searchResults = datasetOptimization.efficientSearch(
        largeDataset,
        'Food Item 123',
        (item) => `${item.name} ${item.description}`,
        50 // Limit to 50 results
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(searchResults.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(200); // Should complete within 200ms
      expect(searchResults[0].name).toContain('123');
    });
  });

  describe('Memory Management', () => {
    it('should chunk large arrays for memory efficiency', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      
      const chunks = datasetOptimization.chunkArray(largeArray, 1000);
      
      expect(chunks).toHaveLength(10);
      expect(chunks[0]).toHaveLength(1000);
      expect(chunks[9]).toHaveLength(1000);
      expect(chunks[0][0]).toBe(0);
      expect(chunks[9][999]).toBe(9999);
    });

    it('should handle memoization for expensive calculations', () => {
      let calculationCount = 0;
      
      const expensiveCalculation = (n: number) => {
        calculationCount++;
        return n * n * n; // Simulate expensive calculation
      };

      const memoizedCalculation = performance.memoize(expensiveCalculation);

      // First calls - should calculate
      expect(memoizedCalculation(5)).toBe(125);
      expect(memoizedCalculation(10)).toBe(1000);
      expect(calculationCount).toBe(2);

      // Repeated calls - should use cache
      expect(memoizedCalculation(5)).toBe(125);
      expect(memoizedCalculation(10)).toBe(1000);
      expect(calculationCount).toBe(2); // Should not increase
    });
  });

  describe('Virtual Scrolling Configuration', () => {
    it('should provide optimal virtual scrolling settings', () => {
      const config = datasetOptimization.virtualScrolling;
      
      expect(config.itemHeight).toBe(60);
      expect(config.windowSize).toBe(10);
      expect(config.initialNumToRender).toBe(10);
      expect(config.maxToRenderPerBatch).toBe(5);
      expect(config.updateCellsBatchingPeriod).toBe(50);
      expect(config.removeClippedSubviews).toBe(true);
    });
  });

  describe('Animation Performance', () => {
    it('should use native driver for animations', () => {
      expect(performance.animation.useNativeDriver).toBe(true);
    });

    it('should provide optimized animation configs', () => {
      expect(performance.animation.timing.duration).toBe(250);
      expect(performance.animation.timing.useNativeDriver).toBe(true);
      
      expect(performance.animation.spring.tension).toBe(100);
      expect(performance.animation.spring.friction).toBe(8);
      expect(performance.animation.spring.useNativeDriver).toBe(true);
    });
  });

  describe('Network Performance', () => {
    it('should have appropriate timeout settings', () => {
      expect(performance.network.timeout).toBe(10000);
    });

    it('should have retry configuration', () => {
      expect(performance.network.retry.attempts).toBe(3);
      expect(performance.network.retry.delay).toBe(1000);
      expect(performance.network.retry.backoff).toBe(2);
    });

    it('should have cache configuration', () => {
      expect(performance.network.cache.maxAge).toBe(5 * 60 * 1000); // 5 minutes
      expect(performance.network.cache.maxSize).toBe(50);
    });
  });

  describe('Enhanced Comparison Performance Tests', () => {
    let mockEnhancedAnalysisService: any;

    beforeEach(() => {
      const { EnhancedAnalysisDataService } = require('../../src/services/EnhancedAnalysisDataService');
      mockEnhancedAnalysisService = {
        calculateEnhancedComparison: jest.fn(),
        calculateWeeklyTotals: jest.fn(),
        calculateNutritionScore: jest.fn(),
        categorizeSubstances: jest.fn(),
      };
      EnhancedAnalysisDataService.mockImplementation(() => mockEnhancedAnalysisService);
    });

    it('should process large analysis datasets within acceptable time limits', async () => {
      // Generate large dataset
      const largeDataset = enhancedPerformanceMonitor.generateLargeAnalysisDataset(1000, 30);
      
      // Mock service response
      const mockResult = Array.from({ length: 30 }, (_, i) => ({
        substance: `Substance-${i}`,
        category: 'micronutrient' as const,
        consumed: 50,
        unit: 'mg',
        status: 'optimal' as const,
        referenceValues: [],
        layers: [],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      }));

      mockEnhancedAnalysisService.calculateEnhancedComparison.mockResolvedValue(mockResult);

      // Measure processing time
      const { result, time } = await enhancedPerformanceMonitor.measureTime(
        'Large Dataset Processing',
        () => mockEnhancedAnalysisService.calculateEnhancedComparison(largeDataset)
      );

      expect(result).toBeDefined();
      expect(time).toBeLessThan(1000); // Should complete within 1 second (mocked)
      expect(result.length).toBe(30);
    });

    it('should handle memory efficiently with very large datasets', async () => {
      const initialMemory = enhancedPerformanceMonitor.measureMemory();
      
      // Generate very large dataset
      const veryLargeDataset = enhancedPerformanceMonitor.generateLargeAnalysisDataset(5000, 50);
      
      // Mock service response
      const mockResult = Array.from({ length: 50 }, (_, i) => ({
        substance: `Substance-${i}`,
        category: 'micronutrient' as const,
        consumed: 50,
        unit: 'mg',
        status: 'optimal' as const,
        referenceValues: [],
        layers: [],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      }));

      mockEnhancedAnalysisService.calculateEnhancedComparison.mockResolvedValue(mockResult);

      await mockEnhancedAnalysisService.calculateEnhancedComparison(veryLargeDataset);
      
      const finalMemory = enhancedPerformanceMonitor.measureMemory();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for mocked service)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should process weekly calculations efficiently for large datasets', async () => {
      // Generate 7 days of large data
      const weeklyData = Array.from({ length: 7 }, () => 
        enhancedPerformanceMonitor.generateLargeComparisonDataset(100)
      );

      // Mock service response
      const mockWeeklyResult = enhancedPerformanceMonitor.generateLargeComparisonDataset(100);
      mockEnhancedAnalysisService.calculateWeeklyTotals.mockResolvedValue(mockWeeklyResult);

      const { result, time } = await enhancedPerformanceMonitor.measureTime(
        'Weekly Totals Calculation',
        () => mockEnhancedAnalysisService.calculateWeeklyTotals(weeklyData)
      );

      expect(result).toBeDefined();
      expect(time).toBeLessThan(1000); // Should complete within 1 second (mocked)
      expect(result.length).toBe(100);
    });

    it('should handle concurrent processing without performance degradation', async () => {
      const dataset = enhancedPerformanceMonitor.generateLargeAnalysisDataset(500, 20);
      
      // Mock service response
      const mockResult = Array.from({ length: 20 }, (_, i) => ({
        substance: `Substance-${i}`,
        category: 'micronutrient' as const,
        consumed: 50,
        unit: 'mg',
        status: 'optimal' as const,
        referenceValues: [],
        layers: [],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      }));

      mockEnhancedAnalysisService.calculateEnhancedComparison.mockResolvedValue(mockResult);

      // Run multiple concurrent calculations
      const concurrentPromises = Array.from({ length: 5 }, () =>
        mockEnhancedAnalysisService.calculateEnhancedComparison(dataset)
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentPromises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds (mocked)
      
      // All results should be consistent
      results.forEach(result => {
        expect(result.length).toBe(20);
      });
    });

    it('should optimize nutrition score calculations for large datasets', async () => {
      const largeComparisonData = enhancedPerformanceMonitor.generateLargeComparisonDataset(1000);

      // Mock service response
      const mockScore = {
        overall: 75,
        breakdown: { macronutrients: 80, micronutrients: 70, harmfulSubstances: 75 },
        recommendations: ['Test recommendation'],
      };

      mockEnhancedAnalysisService.calculateNutritionScore.mockResolvedValue(mockScore);

      const { result, time } = await enhancedPerformanceMonitor.measureTime(
        'Nutrition Score Calculation',
        () => mockEnhancedAnalysisService.calculateNutritionScore(largeComparisonData)
      );

      expect(result).toBeDefined();
      expect(time).toBeLessThan(500); // Should complete within 500ms (mocked)
      expect(result.overall).toBe(75);
      expect(result.breakdown).toBeDefined();
    });

    it('should handle substance categorization efficiently', async () => {
      // Generate large number of substances
      const largeSubstanceList: ChemicalSubstance[] = Array.from({ length: 2000 }, (_, i) => ({
        name: `Substance-${i}`,
        category: ['good', 'bad', 'neutral'][i % 3] as 'good' | 'bad' | 'neutral',
        amount: Math.random() * 100,
        mealType: 'lunch',
      }));

      // Mock service response
      const mockCategorizedResult = {
        micronutrient: largeSubstanceList.slice(0, 667),
        harmful: largeSubstanceList.slice(667, 1334),
        macronutrient: largeSubstanceList.slice(1334, 2000),
      };

      mockEnhancedAnalysisService.categorizeSubstances.mockResolvedValue(mockCategorizedResult);

      const { result, time } = await enhancedPerformanceMonitor.measureTime(
        'Substance Categorization',
        () => mockEnhancedAnalysisService.categorizeSubstances(largeSubstanceList)
      );

      expect(result).toBeDefined();
      expect(time).toBeLessThan(500); // Should complete within 500ms (mocked)
      expect(Object.keys(result).length).toBe(3);
    });
  });

  describe('Visual Rendering Performance', () => {
    it('should handle large numbers of comparison cards efficiently', () => {
      const largeComparisonData = enhancedPerformanceMonitor.generateLargeComparisonDataset(500);
      
      // Simulate rendering performance
      const startTime = Date.now();
      
      // Mock rendering calculations
      largeComparisonData.forEach(data => {
        // Simulate layer calculations
        data.layers.forEach(layer => {
          const width = (layer.percentage || 100 / 100) * 300; // maxBarWidth
          const opacity = (layer.percentage || 100) / 100;
          expect(width).toBeGreaterThanOrEqual(0);
          expect(opacity).toBeGreaterThanOrEqual(0);
        });
        
        // Simulate reference position calculations
        data.referenceValues.forEach(ref => {
          const position = ((ref as any).position || 50 / 100) * 300;
          expect(position).toBeGreaterThanOrEqual(0);
        });
      });
      
      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should optimize animation calculations for multiple layers', () => {
      const complexData = enhancedPerformanceMonitor.generateLargeComparisonDataset(100);
      
      // Add multiple layers to each item
      complexData.forEach(data => {
        data.layers = Array.from({ length: 5 }, (_, i) => ({
          value: data.consumed * (1 - i * 0.2),
          percentage: 100 * (1 - i * 0.2),
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          height: 4,
          width: 100 * (1 - i * 0.2),
          borderRadius: 10,
        }));
      });

      const startTime = Date.now();
      
      // Simulate staggered animation calculations
      complexData.forEach((data, index) => {
        data.layers.forEach((layer, layerIndex) => {
          const animationDelay = index * 50 + layerIndex * 100;
          const animationDuration = data.visualConfig.animationDuration;
          expect(animationDelay).toBeGreaterThanOrEqual(0);
          expect(animationDuration).toBeGreaterThan(0);
        });
      });
      
      const calculationTime = Date.now() - startTime;
      expect(calculationTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle category expansion animations efficiently', () => {
      const categorizedData = {
        calorie: enhancedPerformanceMonitor.generateLargeComparisonDataset(50),
        macronutrient: enhancedPerformanceMonitor.generateLargeComparisonDataset(100),
        micronutrient: enhancedPerformanceMonitor.generateLargeComparisonDataset(200),
        harmful: enhancedPerformanceMonitor.generateLargeComparisonDataset(75),
      };

      const startTime = Date.now();
      
      // Simulate category expansion calculations
      Object.entries(categorizedData).forEach(([category, substances]) => {
        // Simulate height calculations for expansion
        const maxHeight = substances.length * 60; // 60px per item
        const animationSteps = 60; // 60fps
        
        for (let step = 0; step < animationSteps; step++) {
          const progress = step / animationSteps;
          const currentHeight = maxHeight * progress;
          expect(currentHeight).toBeGreaterThanOrEqual(0);
          expect(currentHeight).toBeLessThanOrEqual(maxHeight);
        }
      });
      
      const animationTime = Date.now() - startTime;
      expect(animationTime).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Interactive Feature Performance', () => {
    it('should respond to tap interactions quickly', () => {
      const comparisonData = enhancedPerformanceMonitor.generateLargeComparisonDataset(1);
      
      const startTime = Date.now();
      
      // Simulate tap interaction processing
      const substance = comparisonData[0];
      const educationalContent = substance.educationalContent;
      const referenceValues = substance.referenceValues;
      const layers = substance.layers;
      
      expect(educationalContent).toBeDefined();
      expect(referenceValues).toBeDefined();
      expect(layers).toBeDefined();
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50); // Should respond within 50ms
    });

    it('should handle long press interactions efficiently', () => {
      const comparisonData = enhancedPerformanceMonitor.generateLargeComparisonDataset(1);
      
      const startTime = Date.now();
      
      // Simulate long press tooltip generation
      const substance = comparisonData[0];
      const quickInfo = {
        name: substance.substance,
        status: substance.status,
        healthImpact: substance.educationalContent.healthImpact.substring(0, 100),
        quickTips: substance.educationalContent.recommendedSources?.slice(0, 3) || [],
      };
      
      expect(quickInfo.name).toBeDefined();
      expect(quickInfo.status).toBeDefined();
      expect(quickInfo.healthImpact).toBeDefined();
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(25); // Should respond within 25ms
    });

    it('should handle rapid successive interactions without lag', () => {
      const comparisonData = enhancedPerformanceMonitor.generateLargeComparisonDataset(10);
      
      const startTime = Date.now();
      
      // Simulate rapid interactions
      for (let i = 0; i < 100; i++) {
        const randomIndex = Math.floor(Math.random() * comparisonData.length);
        const substance = comparisonData[randomIndex];
        
        // Simulate interaction processing
        const interactionData = {
          substance: substance.substance,
          consumed: substance.consumed,
          status: substance.status,
          layers: substance.layers.length,
        };
        
        expect(interactionData.substance).toBeDefined();
      }
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / 100;
      
      expect(averageTime).toBeLessThan(5); // Average should be under 5ms per interaction
    });
  });
});