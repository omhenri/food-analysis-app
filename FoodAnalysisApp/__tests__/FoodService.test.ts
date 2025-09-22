import { FoodService } from '../src/services/FoodService';
import { FoodItem, FoodEntry, MealType, PortionSize } from '../src/models/types';

// Mock DatabaseService
jest.mock('../src/services/DatabaseService', () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      initializeDatabase: jest.fn(),
      getCurrentDay: jest.fn(() => Promise.resolve({
        id: 1,
        weekId: 1,
        dayNumber: 1,
        date: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z',
      })),
      saveFoodEntry: jest.fn((entry) => Promise.resolve(1)),
      getFoodEntriesForDay: jest.fn(() => Promise.resolve([])),
      getCurrentWeek: jest.fn(() => Promise.resolve({
        id: 1,
        weekNumber: 1,
        startDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z',
      })),
      getDaysForWeek: jest.fn(() => Promise.resolve([])),
    })),
  },
}));

describe('FoodService', () => {
  let foodService: FoodService;

  beforeEach(() => {
    foodService = FoodService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = FoodService.getInstance();
      const instance2 = FoodService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('convertEntryToFoodItem', () => {
    it('should convert FoodEntry to FoodItem correctly', () => {
      const entry: FoodEntry = {
        id: 1,
        dayId: 1,
        foodName: 'Apple',
        mealType: 'breakfast' as MealType,
        portion: '1/1' as PortionSize,
        createdAt: '2024-01-01T00:00:00Z',
      };

      const foodItem = foodService.convertEntryToFoodItem(entry);

      expect(foodItem).toEqual({
        id: '1',
        name: 'Apple',
        mealType: 'breakfast',
        portion: '1/1',
      });
    });

    it('should handle entry without ID', () => {
      const entry: FoodEntry = {
        dayId: 1,
        foodName: 'Banana',
        mealType: 'snack' as MealType,
        portion: '1/2' as PortionSize,
      };

      const foodItem = foodService.convertEntryToFoodItem(entry);

      expect(foodItem).toEqual({
        id: '',
        name: 'Banana',
        mealType: 'snack',
        portion: '1/2',
      });
    });
  });

  describe('convertEntriesToFoodItems', () => {
    it('should convert multiple entries correctly', () => {
      const entries: FoodEntry[] = [
        {
          id: 1,
          dayId: 1,
          foodName: 'Apple',
          mealType: 'breakfast' as MealType,
          portion: '1/1' as PortionSize,
        },
        {
          id: 2,
          dayId: 1,
          foodName: 'Banana',
          mealType: 'snack' as MealType,
          portion: '1/2' as PortionSize,
        },
      ];

      const foodItems = foodService.convertEntriesToFoodItems(entries);

      expect(foodItems).toHaveLength(2);
      expect(foodItems[0].name).toBe('Apple');
      expect(foodItems[1].name).toBe('Banana');
    });

    it('should handle empty entries array', () => {
      const foodItems = foodService.convertEntriesToFoodItems([]);
      expect(foodItems).toEqual([]);
    });
  });

  describe('saveFoodItems', () => {
    it('should reject invalid food items', async () => {
      const invalidFoods: FoodItem[] = [
        {
          id: '1',
          name: '', // Invalid: empty name
          mealType: 'breakfast' as MealType,
          portion: '1/1' as PortionSize,
        },
      ];

      await expect(foodService.saveFoodItems(invalidFoods)).rejects.toThrow('Validation failed');
    });
  });
});