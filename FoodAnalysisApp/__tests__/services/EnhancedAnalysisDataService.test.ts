import { EnhancedAnalysisDataService } from '../../src/services/EnhancedAnalysisDataService';
import { AnalysisResult, ChemicalSubstance, EnhancedComparisonData } from '../../src/models/types';

// Mock the DatabaseService
jest.mock('../../src/services/DatabaseService', () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      getSubstancesWithCategories: jest.fn(),
      getReferenceValues: jest.fn(),
    })),
  },
}));

// Mock the Colors import
jest.mock('../../src/constants/theme', () => ({
  Colors: {
    enhancedPrimary: '#75F5DB',
    enhancedSecondary1: '#67C7C1',
    enhancedSecondary2: '#509A9C',
    referenceBlue: '#4A78CF',
    referencePink: '#EA92BD',
  }
}));

// Mock the utility functions
jest.mock('../../src/utils/enhancedComparisonUtils', () => ({
  calculateConsumptionLayers: jest.fn(() => [
    {
      value: 100,
      percentage: 100,
      color: '#75F5DB',
      height: 4,
      width: 100,
      borderRadius: 10,
    }
  ]),
  calculateReferencePositions: jest.fn((consumed, refs) => 
    refs.map((ref: any) => ({ ...ref, position: 50 }))
  ),
}));

// Performance monitoring utilities
const performanceMonitor = {
  start: (label: string) => {
    const startTime = performance.now();
    return {
      end: () => performance.now() - startTime,
    };
  },
  memory: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return { heapUsed: 0, heapTotal: 0 };
  },
};

describe('EnhancedAnalysisDataService', () => {
  let service: EnhancedAnalysisDataService;
  let mockDatabaseService: any;

  beforeEach(() => {
    const { DatabaseService } = require('../../src/services/DatabaseService');
    mockDatabaseService = {
      getSubstancesWithCategories: jest.fn(),
      getReferenceValues: jest.fn(),
    };
    DatabaseService.getInstance.mockReturnValue(mockDatabaseService);
    service = new EnhancedAnalysisDataService();
  });

  describe('calculateEnhancedComparison', () => {
    it('should process analysis results and return enhanced comparison data', async () => {
      // Mock data
      const analysisResults: AnalysisResult[] = [
        {
          id: 1,
          foodEntryId: 1,
          foodId: 'apple',
          ingredients: ['apple'],
          chemicalSubstances: [
            { name: 'Vitamin C', category: 'good', amount: 45, mealType: 'breakfast' },
            { name: 'Calories', category: 'neutral', amount: 95, mealType: 'breakfast' },
          ],
          analyzedAt: '2023-01-01',
        },
      ];

      // Mock database responses
      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        {
          substance_name: 'Vitamin C',
          category_id: 'micronutrient',
          type: 'micronutrient',
          default_unit: 'mg',
        },
        {
          substance_name: 'Calories',
          category_id: 'calorie',
          type: 'calorie',
          default_unit: 'cal',
        },
      ]);

      mockDatabaseService.getReferenceValues
        .mockResolvedValueOnce([
          {
            type: 'recommended',
            value: 75,
            color: '#4A78CF',
            label: 'RDA',
          },
        ])
        .mockResolvedValueOnce([
          {
            type: 'recommended',
            value: 2000,
            color: '#4A78CF',
            label: 'RDA',
          },
        ]);

      const result = await service.calculateEnhancedComparison(analysisResults);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].substance).toBe('Calories'); // Should be sorted by category order
      expect(result[1].substance).toBe('Vitamin C');
    });

    it('should handle substances without category information', async () => {
      const analysisResults: AnalysisResult[] = [
        {
          id: 1,
          foodEntryId: 1,
          foodId: 'unknown',
          ingredients: ['unknown'],
          chemicalSubstances: [
            { name: 'Unknown Substance', category: 'neutral', amount: 10, mealType: 'lunch' },
          ],
          analyzedAt: '2023-01-01',
        },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([]);
      mockDatabaseService.getReferenceValues.mockResolvedValue([]);

      const result = await service.calculateEnhancedComparison(analysisResults);

      expect(result).toBeDefined();
      expect(result.length).toBe(0); // Should skip unknown substances
    });

    it('should aggregate substances from multiple analysis results', async () => {
      const analysisResults: AnalysisResult[] = [
        {
          id: 1,
          foodEntryId: 1,
          foodId: 'apple',
          ingredients: ['apple'],
          chemicalSubstances: [
            { name: 'Vitamin C', category: 'good', amount: 25, mealType: 'breakfast' },
          ],
          analyzedAt: '2023-01-01',
        },
        {
          id: 2,
          foodEntryId: 2,
          foodId: 'orange',
          ingredients: ['orange'],
          chemicalSubstances: [
            { name: 'Vitamin C', category: 'good', amount: 35, mealType: 'lunch' },
          ],
          analyzedAt: '2023-01-01',
        },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        {
          substance_name: 'Vitamin C',
          category_id: 'micronutrient',
          type: 'micronutrient',
          default_unit: 'mg',
        },
      ]);

      mockDatabaseService.getReferenceValues.mockResolvedValue([
        {
          type: 'recommended',
          value: 75,
          color: '#4A78CF',
          label: 'RDA',
        },
      ]);

      const result = await service.calculateEnhancedComparison(analysisResults);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].consumed).toBe(60); // 25 + 35 = 60
    });
  });

  describe('categorizeSubstances', () => {
    it('should categorize substances by their type', async () => {
      const substances: ChemicalSubstance[] = [
        { name: 'Protein', category: 'good', amount: 25, mealType: 'lunch' },
        { name: 'Vitamin C', category: 'good', amount: 45, mealType: 'breakfast' },
        { name: 'Sodium', category: 'bad', amount: 1200, mealType: 'dinner' },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        { substance_name: 'Protein', type: 'macronutrient' },
        { substance_name: 'Vitamin C', type: 'micronutrient' },
        { substance_name: 'Sodium', type: 'harmful' },
      ]);

      const result = await service.categorizeSubstances(substances);

      expect(result).toBeDefined();
      expect(result.macronutrient).toBeDefined();
      expect(result.macronutrient.length).toBe(1);
      expect(result.macronutrient[0].name).toBe('Protein');
      
      expect(result.micronutrient).toBeDefined();
      expect(result.micronutrient.length).toBe(1);
      expect(result.micronutrient[0].name).toBe('Vitamin C');
      
      expect(result.harmful).toBeDefined();
      expect(result.harmful.length).toBe(1);
      expect(result.harmful[0].name).toBe('Sodium');
    });

    it('should handle unknown substances', async () => {
      const substances: ChemicalSubstance[] = [
        { name: 'Unknown Substance', category: 'neutral', amount: 10, mealType: 'snack' },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([]);

      const result = await service.categorizeSubstances(substances);

      expect(result).toBeDefined();
      expect(result.unknown).toBeDefined();
      expect(result.unknown.length).toBe(1);
      expect(result.unknown[0].name).toBe('Unknown Substance');
    });
  });

  describe('calculateNutritionScore', () => {
    it('should calculate nutrition score based on comparison data', async () => {
      const comparisonData: EnhancedComparisonData[] = [
        {
          substance: 'Protein',
          category: 'macronutrient',
          consumed: 60,
          unit: 'g',
          status: 'optimal',
          referenceValues: [],
          layers: [],
          educationalContent: { healthImpact: 'Good for muscles' },
          visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
        },
        {
          substance: 'Vitamin C',
          category: 'micronutrient',
          consumed: 45,
          unit: 'mg',
          status: 'deficient',
          referenceValues: [],
          layers: [],
          educationalContent: { healthImpact: 'Important for immunity' },
          visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
        },
        {
          substance: 'Sodium',
          category: 'harmful',
          consumed: 3000,
          unit: 'mg',
          status: 'excess',
          referenceValues: [],
          layers: [],
          educationalContent: { healthImpact: 'Too much can cause high blood pressure' },
          visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
        },
      ];

      const result = await service.calculateNutritionScore(comparisonData);

      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.breakdown.macronutrients).toBe(100); // Optimal protein
      expect(result.breakdown.micronutrients).toBe(40); // Deficient vitamin C
      expect(result.breakdown.harmfulSubstances).toBe(20); // Excess sodium (harmful)
      expect(result.recommendations).toContain('Increase Vitamin C intake');
      expect(result.recommendations).toContain('Reduce Sodium intake');
    });

    it('should handle empty comparison data', async () => {
      const result = await service.calculateNutritionScore([]);

      expect(result).toBeDefined();
      expect(result.overall).toBe(0);
      expect(result.breakdown.macronutrients).toBe(0);
      expect(result.breakdown.micronutrients).toBe(0);
      expect(result.breakdown.harmfulSubstances).toBe(0);
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('calculateWeeklyTotals', () => {
    it('should aggregate daily data into weekly totals', async () => {
      const dailyData: EnhancedComparisonData[][] = [
        [
          {
            substance: 'Protein',
            category: 'macronutrient',
            consumed: 50,
            unit: 'g',
            status: 'optimal',
            referenceValues: [{ type: 'recommended', value: 56, color: '#4A78CF', label: 'RDA', position: 50 }],
            layers: [],
            educationalContent: { healthImpact: 'Good for muscles' },
            visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
          },
        ],
        [
          {
            substance: 'Protein',
            category: 'macronutrient',
            consumed: 60,
            unit: 'g',
            status: 'optimal',
            referenceValues: [{ type: 'recommended', value: 56, color: '#4A78CF', label: 'RDA', position: 50 }],
            layers: [],
            educationalContent: { healthImpact: 'Good for muscles' },
            visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
          },
        ],
      ];

      const result = await service.calculateWeeklyTotals(dailyData);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].substance).toBe('Protein');
      expect(result[0].consumed).toBe(110); // 50 + 60
      expect(result[0].referenceValues[0].value).toBe(392); // 56 * 7
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      const timer = performanceMonitor.start('large-dataset-processing');
      
      // Create large dataset with 1000 analysis results
      const largeAnalysisResults: AnalysisResult[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        foodEntryId: i + 1,
        foodId: `food-${i}`,
        ingredients: [`ingredient-${i}`],
        chemicalSubstances: [
          { name: 'Protein', category: 'good', amount: Math.random() * 50, mealType: 'lunch' },
          { name: 'Vitamin C', category: 'good', amount: Math.random() * 100, mealType: 'breakfast' },
          { name: 'Sodium', category: 'bad', amount: Math.random() * 2000, mealType: 'dinner' },
        ],
        analyzedAt: '2023-01-01',
      }));

      // Mock database responses for large dataset
      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        { substance_name: 'Protein', category_id: 'macronutrient', type: 'macronutrient', default_unit: 'g' },
        { substance_name: 'Vitamin C', category_id: 'micronutrient', type: 'micronutrient', default_unit: 'mg' },
        { substance_name: 'Sodium', category_id: 'harmful', type: 'harmful', default_unit: 'mg' },
      ]);

      mockDatabaseService.getReferenceValues.mockResolvedValue([
        { type: 'recommended', value: 50, color: '#4A78CF', label: 'RDA' },
      ]);

      const result = await service.calculateEnhancedComparison(largeAnalysisResults);
      const processingTime = timer.end();

      expect(result).toBeDefined();
      expect(result.length).toBe(3); // Protein, Vitamin C, Sodium
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle memory efficiently with large datasets', async () => {
      const initialMemory = performanceMonitor.memory();
      
      // Create very large dataset
      const veryLargeAnalysisResults: AnalysisResult[] = Array.from({ length: 5000 }, (_, i) => ({
        id: i + 1,
        foodEntryId: i + 1,
        foodId: `food-${i}`,
        ingredients: [`ingredient-${i}`],
        chemicalSubstances: Array.from({ length: 20 }, (_, j) => ({
          name: `Substance-${j}`,
          category: 'neutral',
          amount: Math.random() * 100,
          mealType: 'lunch',
        })),
        analyzedAt: '2023-01-01',
      }));

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          substance_name: `Substance-${i}`,
          category_id: 'micronutrient',
          type: 'micronutrient',
          default_unit: 'mg',
        }))
      );

      mockDatabaseService.getReferenceValues.mockResolvedValue([
        { type: 'recommended', value: 50, color: '#4A78CF', label: 'RDA' },
      ]);

      await service.calculateEnhancedComparison(veryLargeAnalysisResults);
      
      const finalMemory = performanceMonitor.memory();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle edge cases with zero and negative values', async () => {
      const edgeCaseResults: AnalysisResult[] = [
        {
          id: 1,
          foodEntryId: 1,
          foodId: 'edge-case',
          ingredients: ['test'],
          chemicalSubstances: [
            { name: 'Zero Substance', category: 'neutral', amount: 0, mealType: 'breakfast' },
            { name: 'Negative Substance', category: 'bad', amount: -5, mealType: 'lunch' },
            { name: 'Very Small', category: 'good', amount: 0.001, mealType: 'dinner' },
            { name: 'Very Large', category: 'neutral', amount: 999999, mealType: 'snack' },
          ],
          analyzedAt: '2023-01-01',
        },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        { substance_name: 'Zero Substance', type: 'micronutrient', default_unit: 'mg' },
        { substance_name: 'Negative Substance', type: 'harmful', default_unit: 'mg' },
        { substance_name: 'Very Small', type: 'micronutrient', default_unit: 'μg' },
        { substance_name: 'Very Large', type: 'calorie', default_unit: 'cal' },
      ]);

      mockDatabaseService.getReferenceValues.mockResolvedValue([
        { type: 'recommended', value: 10, color: '#4A78CF', label: 'RDA' },
      ]);

      const result = await service.calculateEnhancedComparison(edgeCaseResults);

      expect(result).toBeDefined();
      // Should handle edge cases gracefully without throwing errors
      expect(() => service.calculateEnhancedComparison(edgeCaseResults)).not.toThrow();
    });

    it('should handle concurrent calculations without race conditions', async () => {
      const analysisResults: AnalysisResult[] = [
        {
          id: 1,
          foodEntryId: 1,
          foodId: 'concurrent-test',
          ingredients: ['test'],
          chemicalSubstances: [
            { name: 'Concurrent Substance', category: 'good', amount: 25, mealType: 'lunch' },
          ],
          analyzedAt: '2023-01-01',
        },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        { substance_name: 'Concurrent Substance', type: 'micronutrient', default_unit: 'mg' },
      ]);

      mockDatabaseService.getReferenceValues.mockResolvedValue([
        { type: 'recommended', value: 50, color: '#4A78CF', label: 'RDA' },
      ]);

      // Run multiple concurrent calculations
      const promises = Array.from({ length: 10 }, () => 
        service.calculateEnhancedComparison(analysisResults)
      );

      const results = await Promise.all(promises);

      // All results should be identical
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveLength(1);
        expect(result[0].substance).toBe('Concurrent Substance');
        expect(result[0].consumed).toBe(25);
      });
    });
  });

  describe('Unit Conversion and Display Logic', () => {
    it('should convert units correctly for display', async () => {
      const conversionResults: AnalysisResult[] = [
        {
          id: 1,
          foodEntryId: 1,
          foodId: 'conversion-test',
          ingredients: ['test'],
          chemicalSubstances: [
            { name: 'Milligram Test', category: 'good', amount: 1500, mealType: 'lunch' }, // Should convert to 1.5g
            { name: 'Microgram Test', category: 'good', amount: 2500, mealType: 'lunch' }, // Should convert to 2.5mg
            { name: 'Gram Test', category: 'good', amount: 0.5, mealType: 'lunch' }, // Should convert to 500mg
          ],
          analyzedAt: '2023-01-01',
        },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        { substance_name: 'Milligram Test', type: 'micronutrient', default_unit: 'mg' },
        { substance_name: 'Microgram Test', type: 'micronutrient', default_unit: 'μg' },
        { substance_name: 'Gram Test', type: 'macronutrient', default_unit: 'g' },
      ]);

      mockDatabaseService.getReferenceValues.mockResolvedValue([
        { type: 'recommended', value: 1000, color: '#4A78CF', label: 'RDA' },
      ]);

      const result = await service.calculateEnhancedComparison(conversionResults);

      expect(result).toHaveLength(3);
      
      // Check unit conversions
      const milligramTest = result.find(r => r.substance === 'Milligram Test');
      const microgramTest = result.find(r => r.substance === 'Microgram Test');
      const gramTest = result.find(r => r.substance === 'Gram Test');

      expect(milligramTest?.consumed).toBe(1.5);
      expect(milligramTest?.unit).toBe('g');
      
      expect(microgramTest?.consumed).toBe(2.5);
      expect(microgramTest?.unit).toBe('mg');
      
      expect(gramTest?.consumed).toBe(500);
      expect(gramTest?.unit).toBe('mg');
    });
  });

  describe('Nutritional Status Determination', () => {
    it('should correctly determine status for different nutrient categories', async () => {
      const statusResults: AnalysisResult[] = [
        {
          id: 1,
          foodEntryId: 1,
          foodId: 'status-test',
          ingredients: ['test'],
          chemicalSubstances: [
            { name: 'Optimal Nutrient', category: 'good', amount: 50, mealType: 'lunch' },
            { name: 'Deficient Nutrient', category: 'good', amount: 20, mealType: 'lunch' },
            { name: 'Excess Nutrient', category: 'good', amount: 150, mealType: 'lunch' },
            { name: 'Harmful Excess', category: 'bad', amount: 3000, mealType: 'lunch' },
          ],
          analyzedAt: '2023-01-01',
        },
      ];

      mockDatabaseService.getSubstancesWithCategories.mockResolvedValue([
        { substance_name: 'Optimal Nutrient', type: 'micronutrient', default_unit: 'mg' },
        { substance_name: 'Deficient Nutrient', type: 'micronutrient', default_unit: 'mg' },
        { substance_name: 'Excess Nutrient', type: 'micronutrient', default_unit: 'mg' },
        { substance_name: 'Harmful Excess', type: 'harmful', default_unit: 'mg' },
      ]);

      // Mock different reference values for each substance
      mockDatabaseService.getReferenceValues
        .mockResolvedValueOnce([
          { type: 'recommended', value: 50, color: '#4A78CF', label: 'RDA' },
        ])
        .mockResolvedValueOnce([
          { type: 'recommended', value: 50, color: '#4A78CF', label: 'RDA' },
        ])
        .mockResolvedValueOnce([
          { type: 'recommended', value: 50, color: '#4A78CF', label: 'RDA' },
          { type: 'upper_limit', value: 100, color: '#EA92BD', label: 'UL' },
        ])
        .mockResolvedValueOnce([
          { type: 'recommended', value: 2300, color: '#4A78CF', label: 'Max' },
        ]);

      const result = await service.calculateEnhancedComparison(statusResults);

      expect(result).toHaveLength(4);
      
      const optimal = result.find(r => r.substance === 'Optimal Nutrient');
      const deficient = result.find(r => r.substance === 'Deficient Nutrient');
      const excess = result.find(r => r.substance === 'Excess Nutrient');
      const harmful = result.find(r => r.substance === 'Harmful Excess');

      expect(optimal?.status).toBe('optimal');
      expect(deficient?.status).toBe('deficient');
      expect(excess?.status).toBe('excess');
      expect(harmful?.status).toBe('excess');
    });
  });
});