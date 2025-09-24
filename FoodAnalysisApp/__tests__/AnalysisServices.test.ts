import { MockAIService } from '../src/services/MockAIService';
import { AnalysisServiceManager } from '../src/services/AnalysisServiceManager';
import { FoodItem, MealType, PortionSize } from '../src/models/types';

describe('MockAIService', () => {
  let mockService: MockAIService;

  beforeEach(() => {
    mockService = MockAIService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = MockAIService.getInstance();
      const instance2 = MockAIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('analyzeFoods', () => {
    it('should analyze foods and return results', async () => {
      const foods: FoodItem[] = [
        {
          id: '1',
          name: 'Apple',
          mealType: 'breakfast' as MealType,
          portion: '1/1' as PortionSize,
        },
      ];

      const results = await mockService.analyzeFoods(foods);

      expect(results).toHaveLength(1);
      expect(results[0].foodId).toBe('1');
      expect(results[0].ingredients).toBeDefined();
      expect(results[0].chemicalSubstances).toBeDefined();
      expect(results[0].chemicalSubstances.length).toBeGreaterThan(0);
    });

    it('should handle different portion sizes', async () => {
      const foods: FoodItem[] = [
        {
          id: '1',
          name: 'Apple',
          mealType: 'breakfast' as MealType,
          portion: '1/2' as PortionSize,
        },
      ];

      const results = await mockService.analyzeFoods(foods);
      const substances = results[0].chemicalSubstances;
      
      // Check that amounts are adjusted for half portion
      expect(substances.some(s => s.amount < 20)).toBe(true); // Should have smaller amounts
    });

    it('should categorize substances correctly', async () => {
      const foods: FoodItem[] = [
        {
          id: '1',
          name: 'Chicken',
          mealType: 'lunch' as MealType,
          portion: '1/1' as PortionSize,
        },
      ];

      const results = await mockService.analyzeFoods(foods);
      const substances = results[0].chemicalSubstances;
      
      // Check that we have different categories
      const categories = substances.map(s => s.category);
      expect(categories).toContain('good');
      expect(categories.some(c => ['neutral', 'bad'].includes(c))).toBe(true);
    });
  });

  describe('getRecommendedIntake', () => {
    it('should return recommended intake values', async () => {
      const intake = await mockService.getRecommendedIntake();

      expect(intake).toBeDefined();
      expect(intake.protein).toBeGreaterThan(0);
      expect(intake.carbohydrates).toBeGreaterThan(0);
      expect(intake.fat).toBeGreaterThan(0);
    });

    it('should handle different ages', async () => {
      const intake25 = await mockService.getRecommendedIntake(25);
      const intake30 = await mockService.getRecommendedIntake(30);

      expect(intake25).toBeDefined();
      expect(intake30).toBeDefined();
      // Mock service returns same values regardless of age
      expect(intake25.protein).toBe(intake30.protein);
    });
  });

  describe('testConnection', () => {
    it('should always return true for mock service', async () => {
      const result = await mockService.testConnection();
      expect(result).toBe(true);
    });
  });
});

describe('AnalysisServiceManager', () => {
  let manager: AnalysisServiceManager;

  beforeEach(() => {
    manager = AnalysisServiceManager.getInstance();
    // Reset to default mock configuration
    manager.enableMockService();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = AnalysisServiceManager.getInstance();
      const instance2 = AnalysisServiceManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('configuration', () => {
    it('should start with mock service enabled', () => {
      expect(manager.isUsingMockService()).toBe(true);
    });

    it('should allow switching to backend service', () => {
      manager.enableBackendService();
      expect(manager.isUsingMockService()).toBe(false);
    });

    it('should allow switching back to mock service', () => {
      manager.enableBackendService();
      manager.enableMockService();
      expect(manager.isUsingMockService()).toBe(true);
    });
  });

  describe('analyzeFoods', () => {
    it('should analyze foods using mock service', async () => {
      const foods: FoodItem[] = [
        {
          id: '1',
          name: 'Apple',
          mealType: 'breakfast' as MealType,
          portion: '1/1' as PortionSize,
        },
      ];

      const results = await manager.analyzeFoods(foods);

      expect(results).toHaveLength(1);
      expect(results[0].foodId).toBe('1');
    });
  });

  describe('getRecommendedIntake', () => {
    it('should get recommended intake using mock service', async () => {
      const intake = await manager.getRecommendedIntake();

      expect(intake).toBeDefined();
      expect(intake.protein).toBeGreaterThan(0);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully with mock service', async () => {
      const result = await manager.testConnection();
      expect(result).toBe(true);
    });
  });
});