import { SUBSTANCE_CATEGORIES, REFERENCE_VALUES } from '../../src/data/referenceData';

// Mock the Colors import to avoid React Native dependencies
jest.mock('../../src/constants/theme', () => ({
  Colors: {
    referenceBlue: '#4A78CF',
    referencePink: '#EA92BD',
  }
}));

describe('Reference Data', () => {
  describe('Substance Categories', () => {
    it('has correct structure and required categories', () => {
      expect(SUBSTANCE_CATEGORIES).toBeDefined();
      expect(SUBSTANCE_CATEGORIES.length).toBe(4);

      const categoryIds = SUBSTANCE_CATEGORIES.map(cat => cat.id);
      expect(categoryIds).toContain('calorie');
      expect(categoryIds).toContain('macronutrient');
      expect(categoryIds).toContain('micronutrient');
      expect(categoryIds).toContain('harmful');
    });

    it('has correct calorie category', () => {
      const calorieCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'calorie');
      expect(calorieCategory).toBeDefined();
      expect(calorieCategory?.name).toBe('Calories');
      expect(calorieCategory?.type).toBe('calorie');
      expect(calorieCategory?.default_unit).toBe('cal');
      expect(calorieCategory?.display_order).toBe(1);
    });

    it('has correct macronutrient category', () => {
      const macroCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'macronutrient');
      expect(macroCategory).toBeDefined();
      expect(macroCategory?.name).toBe('Macronutrients');
      expect(macroCategory?.type).toBe('macronutrient');
      expect(macroCategory?.default_unit).toBe('g');
      expect(macroCategory?.display_order).toBe(2);
    });

    it('has correct micronutrient category', () => {
      const microCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'micronutrient');
      expect(microCategory).toBeDefined();
      expect(microCategory?.name).toBe('Micronutrients');
      expect(microCategory?.type).toBe('micronutrient');
      expect(microCategory?.default_unit).toBe('mg');
      expect(microCategory?.display_order).toBe(3);
    });

    it('has correct harmful category', () => {
      const harmfulCategory = SUBSTANCE_CATEGORIES.find(cat => cat.id === 'harmful');
      expect(harmfulCategory).toBeDefined();
      expect(harmfulCategory?.name).toBe('Harmful Substances');
      expect(harmfulCategory?.type).toBe('harmful');
      expect(harmfulCategory?.default_unit).toBe('mg');
      expect(harmfulCategory?.display_order).toBe(4);
    });
  });

  describe('Reference Values', () => {
    it('has reference values for all essential nutrients', () => {
      const substances = [...new Set(REFERENCE_VALUES.map(ref => ref.substance_name))];
      
      // Essential nutrients
      expect(substances).toContain('Calories');
      expect(substances).toContain('Protein');
      expect(substances).toContain('Fat');
      expect(substances).toContain('Carbohydrates');
      
      // Important vitamins and minerals
      expect(substances).toContain('Vitamin C');
      expect(substances).toContain('Vitamin D');
      expect(substances).toContain('Calcium');
      expect(substances).toContain('Iron');
      
      // Harmful substances to limit
      expect(substances).toContain('Sodium');
      expect(substances).toContain('Saturated Fat');
      expect(substances).toContain('Added Sugar');
      expect(substances).toContain('Trans Fat');
    });

    it('has correct calorie reference values', () => {
      const caloriesRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Calories');
      expect(caloriesRefs.length).toBe(3); // male, female, max

      const maleRef = caloriesRefs.find(ref => ref.gender === 'male' && ref.type === 'recommended');
      expect(maleRef).toBeDefined();
      expect(maleRef?.value).toBe(2400);
      expect(maleRef?.unit).toBe('cal');
      expect(maleRef?.category_id).toBe('calorie');

      const femaleRef = caloriesRefs.find(ref => ref.gender === 'female' && ref.type === 'recommended');
      expect(femaleRef).toBeDefined();
      expect(femaleRef?.value).toBe(2000);
      expect(femaleRef?.unit).toBe('cal');

      const maxRef = caloriesRefs.find(ref => ref.type === 'maximum');
      expect(maxRef).toBeDefined();
      expect(maxRef?.value).toBe(3000);
      expect(maxRef?.gender).toBe('all');
    });

    it('has correct protein reference values', () => {
      const proteinRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Protein');
      expect(proteinRefs.length).toBe(3); // min, male, female

      const maleRef = proteinRefs.find(ref => ref.gender === 'male' && ref.type === 'recommended');
      expect(maleRef).toBeDefined();
      expect(maleRef?.value).toBe(56);
      expect(maleRef?.unit).toBe('g');
      expect(maleRef?.category_id).toBe('macronutrient');

      const femaleRef = proteinRefs.find(ref => ref.gender === 'female' && ref.type === 'recommended');
      expect(femaleRef).toBeDefined();
      expect(femaleRef?.value).toBe(46);
      expect(femaleRef?.unit).toBe('g');

      const minRef = proteinRefs.find(ref => ref.type === 'minimum');
      expect(minRef).toBeDefined();
      expect(minRef?.value).toBe(46);
      expect(minRef?.gender).toBe('all');
    });

    it('has correct vitamin C reference values', () => {
      const vitaminCRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Vitamin C');
      expect(vitaminCRefs.length).toBe(3); // male, female, upper limit

      const maleRef = vitaminCRefs.find(ref => ref.gender === 'male' && ref.type === 'recommended');
      expect(maleRef).toBeDefined();
      expect(maleRef?.value).toBe(90);
      expect(maleRef?.unit).toBe('mg');
      expect(maleRef?.category_id).toBe('micronutrient');

      const femaleRef = vitaminCRefs.find(ref => ref.gender === 'female' && ref.type === 'recommended');
      expect(femaleRef).toBeDefined();
      expect(femaleRef?.value).toBe(75);
      expect(femaleRef?.unit).toBe('mg');

      const upperLimitRef = vitaminCRefs.find(ref => ref.type === 'upper_limit');
      expect(upperLimitRef).toBeDefined();
      expect(upperLimitRef?.value).toBe(2000);
      expect(upperLimitRef?.gender).toBe('all');
    });

    it('has correct sodium reference values (harmful substance)', () => {
      const sodiumRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Sodium');
      expect(sodiumRefs.length).toBe(2); // recommended, upper limit

      const recommendedRef = sodiumRefs.find(ref => ref.type === 'recommended');
      expect(recommendedRef).toBeDefined();
      expect(recommendedRef?.value).toBe(1500);
      expect(recommendedRef?.unit).toBe('mg');
      expect(recommendedRef?.category_id).toBe('harmful');
      expect(recommendedRef?.label).toBe('AI');

      const upperLimitRef = sodiumRefs.find(ref => ref.type === 'upper_limit');
      expect(upperLimitRef).toBeDefined();
      expect(upperLimitRef?.value).toBe(2300);
      expect(upperLimitRef?.unit).toBe('mg');
      expect(upperLimitRef?.label).toBe('UL');
    });

    it('has correct reference value types', () => {
      const types = [...new Set(REFERENCE_VALUES.map(ref => ref.type))];
      expect(types).toContain('recommended');
      expect(types).toContain('minimum');
      expect(types).toContain('maximum');
      expect(types).toContain('upper_limit');
    });

    it('has correct age group and gender specifications', () => {
      // All reference values should be for age group 18-29
      const ageGroups = [...new Set(REFERENCE_VALUES.map(ref => ref.age_group))];
      expect(ageGroups).toEqual(['18-29']);

      // Should have gender-specific and gender-neutral values
      const genders = [...new Set(REFERENCE_VALUES.map(ref => ref.gender))];
      expect(genders).toContain('male');
      expect(genders).toContain('female');
      expect(genders).toContain('all');
    });

    it('has correct color assignments', () => {
      const colors = [...new Set(REFERENCE_VALUES.map(ref => ref.color))];
      expect(colors).toContain('#4A78CF'); // referenceBlue
      expect(colors).toContain('#EA92BD'); // referencePink

      // Recommended values should use blue
      const recommendedRefs = REFERENCE_VALUES.filter(ref => ref.type === 'recommended');
      recommendedRefs.forEach(ref => {
        expect(ref.color).toBe('#4A78CF');
      });

      // Upper limits should use pink
      const upperLimitRefs = REFERENCE_VALUES.filter(ref => ref.type === 'upper_limit');
      upperLimitRefs.forEach(ref => {
        expect(ref.color).toBe('#EA92BD');
      });
    });

    it('has appropriate labels for different reference types', () => {
      const labels = [...new Set(REFERENCE_VALUES.map(ref => ref.label))];
      expect(labels).toContain('RDA'); // Recommended Dietary Allowance
      expect(labels).toContain('UL');  // Upper Limit
      expect(labels).toContain('AI');  // Adequate Intake
      expect(labels).toContain('Min'); // Minimum
      expect(labels).toContain('Max'); // Maximum
    });

    it('has valid units for different substance types', () => {
      // Calories should use 'cal'
      const caloriesRefs = REFERENCE_VALUES.filter(ref => ref.substance_name === 'Calories');
      caloriesRefs.forEach(ref => {
        expect(ref.unit).toBe('cal');
      });

      // Macronutrients should use 'g'
      const macroRefs = REFERENCE_VALUES.filter(ref => 
        ['Protein', 'Fat', 'Carbohydrates', 'Saturated Fat', 'Added Sugar', 'Trans Fat'].includes(ref.substance_name)
      );
      macroRefs.forEach(ref => {
        expect(ref.unit).toBe('g');
      });

      // Most micronutrients should use 'mg' or 'μg'
      const microRefs = REFERENCE_VALUES.filter(ref => 
        ['Vitamin C', 'Calcium', 'Iron', 'Sodium'].includes(ref.substance_name)
      );
      microRefs.forEach(ref => {
        expect(['mg', 'μg'].includes(ref.unit)).toBe(true);
      });
    });
  });
});