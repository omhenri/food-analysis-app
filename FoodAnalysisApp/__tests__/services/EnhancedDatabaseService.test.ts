import { DatabaseService } from '../../src/services/DatabaseService';
import { SUBSTANCE_CATEGORIES, REFERENCE_VALUES } from '../../src/data/referenceData';

// Mock SQLite to avoid React Native dependencies
jest.mock('react-native-sqlite-storage', () => ({
  DEBUG: jest.fn(),
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => ({
    executeSql: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('Enhanced Database Service', () => {
  let databaseService: DatabaseService;
  let mockDatabase: any;

  beforeEach(() => {
    // Reset the singleton instance
    (DatabaseService as any).instance = null;
    databaseService = DatabaseService.getInstance();
    
    // Mock database methods
    mockDatabase = {
      executeSql: jest.fn(),
      close: jest.fn(),
    };
    
    // Set the mock database
    (databaseService as any).database = mockDatabase;
  });

  describe('Reference Data Structure', () => {
    it('has correct substance categories structure', () => {
      expect(SUBSTANCE_CATEGORIES).toBeDefined();
      expect(SUBSTANCE_CATEGORIES.length).toBeGreaterThan(0);

      const calorieCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'calorie');
      expect(calorieCategory).toBeDefined();
      expect(calorieCategory?.name).toBe('Calories');
      expect(calorieCategory?.type).toBe('calorie');
      expect(calorieCategory?.default_unit).toBe('cal');

      const macroCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'macronutrient');
      expect(macroCategory).toBeDefined();
      expect(macroCategory?.name).toBe('Macronutrients');
      expect(macroCategory?.type).toBe('macronutrient');

      const microCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'micronutrient');
      expect(microCategory).toBeDefined();
      expect(microCategory?.name).toBe('Micronutrients');
      expect(microCategory?.type).toBe('micronutrient');

      const harmfulCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'harmful');
      expect(harmfulCategory).toBeDefined();
      expect(harmfulCategory?.name).toBe('Harmful Substances');
      expect(harmfulCategory?.type).toBe('harmful');
    });

    it('has correct reference values structure', () => {
      expect(REFERENCE_VALUES).toBeDefined();
      expect(REFERENCE_VALUES.length).toBeGreaterThan(0);

      // Check calories reference values
      const caloriesRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Calories');
      expect(caloriesRefs.length).toBeGreaterThan(0);
      
      const caloriesMaleRef = caloriesRefs.find(ref => ref.gender === 'male' && ref.type === 'recommended');
      expect(caloriesMaleRef).toBeDefined();
      expect(caloriesMaleRef?.value).toBe(2400);
      expect(caloriesMaleRef?.unit).toBe('cal');

      const caloriesFemaleRef = caloriesRefs.find(ref => ref.gender === 'female' && ref.type === 'recommended');
      expect(caloriesFemaleRef).toBeDefined();
      expect(caloriesFemaleRef?.value).toBe(2000);
      expect(caloriesFemaleRef?.unit).toBe('cal');

      // Check protein reference values
      const proteinRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Protein');
      expect(proteinRefs.length).toBeGreaterThan(0);

      const proteinMaleRef = proteinRefs.find(ref => ref.gender === 'male' && ref.type === 'recommended');
      expect(proteinMaleRef).toBeDefined();
      expect(proteinMaleRef?.value).toBe(56);
      expect(proteinMaleRef?.unit).toBe('g');

      // Check harmful substances
      const sodiumRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Sodium');
      expect(sodiumRefs.length).toBeGreaterThan(0);

      const sodiumUpperLimit = sodiumRefs.find(ref => ref.type === 'upper_limit');
      expect(sodiumUpperLimit).toBeDefined();
      expect(sodiumUpperLimit?.value).toBe(2300);
      expect(sodiumUpperLimit?.unit).toBe('mg');
    });

    it('covers all required substance categories', () => {
      const categoryTypes = SUBSTANCE_CATEGORIES.map(cat => cat.type);
      expect(categoryTypes).toContain('calorie');
      expect(categoryTypes).toContain('macronutrient');
      expect(categoryTypes).toContain('micronutrient');
      expect(categoryTypes).toContain('harmful');
    });

    it('has reference values for all major nutrients', () => {
      const substances = [...new Set(REFERENCE_VALUES.map(ref => ref.substance_name))];
      
      // Check for essential nutrients
      expect(substances).toContain('Calories');
      expect(substances).toContain('Protein');
      expect(substances).toContain('Fat');
      expect(substances).toContain('Carbohydrates');
      expect(substances).toContain('Vitamin C');
      expect(substances).toContain('Calcium');
      expect(substances).toContain('Iron');
      expect(substances).toContain('Sodium');
    });

    it('has correct reference value types', () => {
      const types = [...new Set(REFERENCE_VALUES.map(ref => ref.type))];
      expect(types).toContain('recommended');
      expect(types).toContain('minimum');
      expect(types).toContain('maximum');
      expect(types).toContain('upper_limit');
    });

    it('has gender-specific values where appropriate', () => {
      const genders = [...new Set(REFERENCE_VALUES.map(ref => ref.gender))];
      expect(genders).toContain('male');
      expect(genders).toContain('female');
      expect(genders).toContain('all');

      // Check that calories have gender-specific recommendations
      const caloriesRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Calories');
      const hasGenderSpecific = caloriesRefs.some(ref => ref.gender === 'male') && 
                                caloriesRefs.some(ref => ref.gender === 'female');
      expect(hasGenderSpecific).toBe(true);
    });
  });

  describe('Database Methods', () => {
    it('should call executeSql for getting substance categories', async () => {
      const mockResults = {
        rows: {
          length: 2,
          item: jest.fn()
            .mockReturnValueOnce({ id: 'calorie', name: 'Calories', type: 'calorie' })
            .mockReturnValueOnce({ id: 'macronutrient', name: 'Macronutrients', type: 'macronutrient' }),
        },
      };

      mockDatabase.executeSql.mockResolvedValueOnce([mockResults]);

      const categories = await databaseService.getSubstanceCategories();

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        'SELECT * FROM substance_categories ORDER BY display_order'
      );
      expect(categories).toHaveLength(2);
    });

    it('should call executeSql for getting reference values', async () => {
      const mockResults = {
        rows: {
          length: 1,
          item: jest.fn().mockReturnValueOnce({
            substance_name: 'Calories',
            type: 'recommended',
            value: 2000,
            unit: 'cal',
          }),
        },
      };

      mockDatabase.executeSql.mockResolvedValueOnce([mockResults]);

      const refValues = await databaseService.getReferenceValues('Calories', '18-29', 'female');

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        'SELECT * FROM reference_values WHERE substance_name = ? AND age_group = ? AND (gender = ? OR gender = "all") ORDER BY value',
        ['Calories', '18-29', 'female']
      );
      expect(refValues).toHaveLength(1);
    });

    it('should check if reference data exists', async () => {
      const mockResults = {
        rows: {
          item: jest.fn().mockReturnValueOnce({ count: 4 }),
        },
      };

      mockDatabase.executeSql.mockResolvedValueOnce([mockResults]);

      const hasData = await databaseService.hasReferenceData();

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM substance_categories'
      );
      expect(hasData).toBe(true);
    });

    it('should get substances with categories', async () => {
      const mockResults = {
        rows: {
          length: 2,
          item: jest.fn()
            .mockReturnValueOnce({
              substance_name: 'Calories',
              category_id: 'calorie',
              category_name: 'Calories',
              type: 'calorie',
              default_unit: 'cal',
            })
            .mockReturnValueOnce({
              substance_name: 'Protein',
              category_id: 'macronutrient',
              category_name: 'Macronutrients',
              type: 'macronutrient',
              default_unit: 'g',
            }),
        },
      };

      mockDatabase.executeSql.mockResolvedValueOnce([mockResults]);

      const substances = await databaseService.getSubstancesWithCategories();

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(expect.stringContaining('SELECT DISTINCT rv.substance_name'));
      expect(substances).toHaveLength(2);
      expect(substances[0].substance_name).toBe('Calories');
      expect(substances[1].substance_name).toBe('Protein');
    });
  });
});