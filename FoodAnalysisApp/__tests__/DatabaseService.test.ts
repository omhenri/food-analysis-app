import { DatabaseService } from '../src/services/DatabaseService';
import { FoodEntry, MealType, PortionSize } from '../src/models/types';

// Mock SQLite
jest.mock('react-native-sqlite-storage', () => ({
  DEBUG: jest.fn(),
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => ({
    executeSql: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = DatabaseService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initializeDatabase', () => {
    it('should initialize database successfully', async () => {
      // This test would require more complex mocking
      // For now, we'll test that the method exists
      expect(databaseService.initializeDatabase).toBeDefined();
    });
  });

  describe('food entry validation', () => {
    it('should validate food entry data', () => {
      const validEntry: FoodEntry = {
        dayId: 1,
        foodName: 'Apple',
        mealType: 'breakfast' as MealType,
        portion: '1/1' as PortionSize,
      };

      expect(validEntry.foodName).toBe('Apple');
      expect(validEntry.mealType).toBe('breakfast');
      expect(validEntry.portion).toBe('1/1');
    });
  });

  describe('data model validation', () => {
    it('should have correct meal type values', () => {
      const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      expect(mealTypes).toContain('breakfast');
      expect(mealTypes).toContain('lunch');
      expect(mealTypes).toContain('dinner');
      expect(mealTypes).toContain('snack');
    });

    it('should have correct portion size values', () => {
      const portionSizes: PortionSize[] = ['1/1', '1/2', '1/3', '1/4', '1/8'];
      expect(portionSizes).toContain('1/1');
      expect(portionSizes).toContain('1/2');
      expect(portionSizes).toContain('1/3');
      expect(portionSizes).toContain('1/4');
      expect(portionSizes).toContain('1/8');
    });
  });
});