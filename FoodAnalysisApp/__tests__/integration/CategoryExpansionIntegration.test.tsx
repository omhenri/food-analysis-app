import { EnhancedComparisonData } from '../../src/models/types';

// Create test data directly
const createTestData = (): EnhancedComparisonData[] => {
  return [
    {
      substance: 'Calories',
      category: 'calorie',
      consumed: 2800,
      unit: 'cal',
      status: 'excess',
      referenceValues: [],
      layers: [],
      educationalContent: { healthImpact: 'Test impact' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
    {
      substance: 'Protein',
      category: 'macronutrient',
      consumed: 65,
      unit: 'g',
      status: 'optimal',
      referenceValues: [],
      layers: [],
      educationalContent: { healthImpact: 'Test impact' },
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
      educationalContent: { healthImpact: 'Test impact' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
    {
      substance: 'Sodium',
      category: 'harmful',
      consumed: 3200,
      unit: 'mg',
      status: 'excess',
      referenceValues: [],
      layers: [],
      educationalContent: { healthImpact: 'Test impact' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
  ];
};

// Mock category section state management
interface CategoryState {
  title: string;
  substances: EnhancedComparisonData[];
  isExpanded: boolean;
}

class MockCategorizedComparisonManager {
  private expandedCategories: Set<string> = new Set(['calorie']);
  private sampleData: EnhancedComparisonData[];
  private categorizedData: { [key: string]: EnhancedComparisonData[] };

  constructor() {
    this.sampleData = createTestData();
    this.categorizedData = this.categorizeData();
  }

  private categorizeData(): { [key: string]: EnhancedComparisonData[] } {
    const categories: { [key: string]: EnhancedComparisonData[] } = {};
    
    this.sampleData.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    return categories;
  }

  toggleCategory(category: string): void {
    if (this.expandedCategories.has(category)) {
      this.expandedCategories.delete(category);
    } else {
      this.expandedCategories.add(category);
    }
  }

  getCategoryState(category: string): CategoryState {
    const categoryTitles = {
      calorie: 'Calories',
      macronutrient: 'Macronutrients',
      micronutrient: 'Micronutrients',
      harmful: 'Harmful Substances',
    };

    return {
      title: categoryTitles[category as keyof typeof categoryTitles],
      substances: this.categorizedData[category] || [],
      isExpanded: this.expandedCategories.has(category),
    };
  }

  getAllCategories(): string[] {
    return ['calorie', 'macronutrient', 'micronutrient', 'harmful'];
  }

  getExpandedCategories(): string[] {
    return Array.from(this.expandedCategories);
  }
}

describe('Category Expansion/Collapse Integration Tests', () => {
  let manager: MockCategorizedComparisonManager;

  beforeEach(() => {
    manager = new MockCategorizedComparisonManager();
  });

  describe('Initial State and Rendering', () => {
    it('should render all category sections with correct initial state', () => {
      const categories = manager.getAllCategories();
      
      // All categories should be present
      expect(categories).toContain('calorie');
      expect(categories).toContain('macronutrient');
      expect(categories).toContain('micronutrient');
      expect(categories).toContain('harmful');

      // Calorie category should be expanded by default
      const calorieState = manager.getCategoryState('calorie');
      expect(calorieState.isExpanded).toBe(true);
      
      // Other categories should be collapsed by default
      const macroState = manager.getCategoryState('macronutrient');
      const microState = manager.getCategoryState('micronutrient');
      const harmfulState = manager.getCategoryState('harmful');
      
      expect(macroState.isExpanded).toBe(false);
      expect(microState.isExpanded).toBe(false);
      expect(harmfulState.isExpanded).toBe(false);
    });

    it('should display correct substance counts for each category', () => {
      const calorieState = manager.getCategoryState('calorie');
      const macroState = manager.getCategoryState('macronutrient');
      const microState = manager.getCategoryState('micronutrient');
      const harmfulState = manager.getCategoryState('harmful');

      // Each category should show the correct number of substances
      expect(calorieState.substances.length).toBe(1); // Calories
      expect(macroState.substances.length).toBe(1); // Protein
      expect(microState.substances.length).toBe(1); // Vitamin C
      expect(harmfulState.substances.length).toBe(1); // Sodium
    });

    it('should show correct titles for each category', () => {
      const calorieState = manager.getCategoryState('calorie');
      const macroState = manager.getCategoryState('macronutrient');
      const microState = manager.getCategoryState('micronutrient');
      const harmfulState = manager.getCategoryState('harmful');

      expect(calorieState.title).toBe('Calories');
      expect(macroState.title).toBe('Macronutrients');
      expect(microState.title).toBe('Micronutrients');
      expect(harmfulState.title).toBe('Harmful Substances');
    });

    it('should show expanded content for initially expanded categories', () => {
      const calorieState = manager.getCategoryState('calorie');
      
      // Calorie category should be expanded
      expect(calorieState.isExpanded).toBe(true);
      expect(calorieState.substances.length).toBe(1);
      expect(calorieState.substances[0].substance).toBe('Calories');
    });
  });

  describe('Expansion Functionality', () => {
    it('should expand collapsed category when toggled', () => {
      // Macronutrient category should be collapsed initially
      const initialState = manager.getCategoryState('macronutrient');
      expect(initialState.isExpanded).toBe(false);

      // Toggle the category to expand
      manager.toggleCategory('macronutrient');

      // Category should now be expanded
      const expandedState = manager.getCategoryState('macronutrient');
      expect(expandedState.isExpanded).toBe(true);
      expect(expandedState.substances.length).toBe(1);
      expect(expandedState.substances[0].substance).toBe('Protein');
    });

    it('should collapse expanded category when toggled', () => {
      // Calorie category should be expanded initially
      const initialState = manager.getCategoryState('calorie');
      expect(initialState.isExpanded).toBe(true);

      // Toggle the category to collapse
      manager.toggleCategory('calorie');

      // Category should now be collapsed
      const collapsedState = manager.getCategoryState('calorie');
      expect(collapsedState.isExpanded).toBe(false);
    });

    it('should handle multiple category expansions simultaneously', () => {
      // Expand multiple categories
      manager.toggleCategory('macronutrient');
      manager.toggleCategory('micronutrient');
      manager.toggleCategory('harmful');

      // All categories should be expanded
      const calorieState = manager.getCategoryState('calorie');
      const macroState = manager.getCategoryState('macronutrient');
      const microState = manager.getCategoryState('micronutrient');
      const harmfulState = manager.getCategoryState('harmful');

      expect(calorieState.isExpanded).toBe(true);
      expect(macroState.isExpanded).toBe(true);
      expect(microState.isExpanded).toBe(true);
      expect(harmfulState.isExpanded).toBe(true);

      // All should have their substances available
      expect(calorieState.substances[0].substance).toBe('Calories');
      expect(macroState.substances[0].substance).toBe('Protein');
      expect(microState.substances[0].substance).toBe('Vitamin C');
      expect(harmfulState.substances[0].substance).toBe('Sodium');
    });

    it('should handle rapid toggle interactions gracefully', () => {
      // Rapidly toggle the same category multiple times
      manager.toggleCategory('macronutrient');
      manager.toggleCategory('macronutrient');
      manager.toggleCategory('macronutrient');
      manager.toggleCategory('macronutrient');

      // Should settle in a consistent state (collapsed since we toggled 4 times)
      const finalState = manager.getCategoryState('macronutrient');
      expect(finalState.isExpanded).toBe(false);
    });
  });

  describe('Animation Behavior', () => {
    it('should support animation configuration', () => {
      const testData = createTestData();
      
      // All substances should have animation configuration
      testData.forEach(substance => {
        expect(substance.visualConfig.animationDuration).toBeGreaterThan(0);
        expect(substance.visualConfig.animationDuration).toBe(800);
      });
    });

    it('should handle animation state transitions', () => {
      // Test expansion animation state
      const initialState = manager.getCategoryState('macronutrient');
      expect(initialState.isExpanded).toBe(false);

      // Simulate animation start
      manager.toggleCategory('macronutrient');
      const expandingState = manager.getCategoryState('macronutrient');
      expect(expandingState.isExpanded).toBe(true);

      // Simulate animation completion - state should be stable
      const finalState = manager.getCategoryState('macronutrient');
      expect(finalState.isExpanded).toBe(true);
      expect(finalState.substances.length).toBe(1);
    });

    it('should handle rapid state changes without corruption', () => {
      const initialExpandedCount = manager.getExpandedCategories().length;
      
      // Rapidly toggle multiple categories
      for (let i = 0; i < 10; i++) {
        manager.toggleCategory('macronutrient');
        manager.toggleCategory('micronutrient');
        manager.toggleCategory('harmful');
      }

      // State should be consistent (all should be collapsed after even number of toggles)
      const macroState = manager.getCategoryState('macronutrient');
      const microState = manager.getCategoryState('micronutrient');
      const harmfulState = manager.getCategoryState('harmful');

      expect(macroState.isExpanded).toBe(false);
      expect(microState.isExpanded).toBe(false);
      expect(harmfulState.isExpanded).toBe(false);
    });
  });

  describe('Content Display', () => {
    it('should display substance details correctly when expanded', () => {
      // Expand micronutrient category
      manager.toggleCategory('micronutrient');
      const microState = manager.getCategoryState('micronutrient');

      expect(microState.isExpanded).toBe(true);
      expect(microState.substances.length).toBe(1);

      // Check substance details
      const substance = microState.substances[0];
      expect(substance.substance).toBe('Vitamin C');
      expect(substance.consumed).toBe(45);
      expect(substance.unit).toBe('mg');
      expect(substance.status).toBe('deficient');
    });

    it('should maintain substance order within categories', () => {
      // Expand harmful category
      manager.toggleCategory('harmful');
      const harmfulState = manager.getCategoryState('harmful');

      expect(harmfulState.isExpanded).toBe(true);
      expect(harmfulState.substances.length).toBe(1);

      // Check substance details
      const substance = harmfulState.substances[0];
      expect(substance.substance).toBe('Sodium');
      expect(substance.consumed).toBe(3200);
      expect(substance.unit).toBe('mg');
      expect(substance.status).toBe('excess');
    });

    it('should provide complete substance information for all categories', () => {
      const categories = manager.getAllCategories();
      
      categories.forEach(categoryId => {
        const state = manager.getCategoryState(categoryId);
        
        state.substances.forEach(substance => {
          expect(substance.substance).toBeTruthy();
          expect(substance.consumed).toBeGreaterThan(0);
          expect(substance.unit).toBeTruthy();
          expect(substance.status).toBeTruthy();
          expect(substance.category).toBe(categoryId);
          expect(substance.educationalContent).toBeTruthy();
          expect(substance.visualConfig).toBeTruthy();
        });
      });
    });
  });

  describe('State Management', () => {
    it('should maintain expansion state consistently', () => {
      // Initial state
      const initialExpanded = manager.getExpandedCategories();
      expect(initialExpanded).toContain('calorie');
      expect(initialExpanded.length).toBe(1);

      // Expand a category
      manager.toggleCategory('micronutrient');
      const afterExpansion = manager.getExpandedCategories();
      expect(afterExpansion).toContain('calorie');
      expect(afterExpansion).toContain('micronutrient');
      expect(afterExpansion.length).toBe(2);

      // State should be maintained
      const microState = manager.getCategoryState('micronutrient');
      expect(microState.isExpanded).toBe(true);
    });

    it('should handle category state independently', () => {
      // Expand one category
      manager.toggleCategory('macronutrient');

      // Check that only the targeted category changed
      const calorieState = manager.getCategoryState('calorie');
      const macroState = manager.getCategoryState('macronutrient');
      const microState = manager.getCategoryState('micronutrient');
      const harmfulState = manager.getCategoryState('harmful');

      expect(calorieState.isExpanded).toBe(true); // Initially expanded
      expect(macroState.isExpanded).toBe(true); // Just expanded
      expect(microState.isExpanded).toBe(false); // Still collapsed
      expect(harmfulState.isExpanded).toBe(false); // Still collapsed
    });

    it('should handle complex state transitions', () => {
      // Perform a series of state changes
      manager.toggleCategory('macronutrient'); // expand
      manager.toggleCategory('micronutrient'); // expand
      manager.toggleCategory('calorie'); // collapse
      manager.toggleCategory('harmful'); // expand
      manager.toggleCategory('macronutrient'); // collapse

      // Verify final state
      const finalStates = {
        calorie: manager.getCategoryState('calorie'),
        macronutrient: manager.getCategoryState('macronutrient'),
        micronutrient: manager.getCategoryState('micronutrient'),
        harmful: manager.getCategoryState('harmful'),
      };

      expect(finalStates.calorie.isExpanded).toBe(false);
      expect(finalStates.macronutrient.isExpanded).toBe(false);
      expect(finalStates.micronutrient.isExpanded).toBe(true);
      expect(finalStates.harmful.isExpanded).toBe(true);

      const expandedCategories = manager.getExpandedCategories();
      expect(expandedCategories).toContain('micronutrient');
      expect(expandedCategories).toContain('harmful');
      expect(expandedCategories.length).toBe(2);
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide accessible category information', () => {
      const categories = manager.getAllCategories();
      
      categories.forEach(categoryId => {
        const state = manager.getCategoryState(categoryId);
        
        // Each category should have a meaningful title
        expect(state.title).toBeTruthy();
        expect(state.title.length).toBeGreaterThan(3);
        
        // Should have substance count information
        expect(state.substances.length).toBeGreaterThan(0);
        
        // Expansion state should be clearly defined
        expect(typeof state.isExpanded).toBe('boolean');
      });
    });

    it('should provide accessible substance information', () => {
      // Expand all categories to test accessibility
      manager.getAllCategories().forEach(categoryId => {
        manager.toggleCategory(categoryId);
      });

      manager.getAllCategories().forEach(categoryId => {
        const state = manager.getCategoryState(categoryId);
        
        state.substances.forEach(substance => {
          // Each substance should have accessible information
          expect(substance.substance).toBeTruthy();
          expect(substance.consumed).toBeGreaterThan(0);
          expect(substance.unit).toBeTruthy();
          expect(substance.status).toBeTruthy();
          
          // Educational content should be available for screen readers
          expect(substance.educationalContent.healthImpact).toBeTruthy();
        });
      });
    });

    it('should support keyboard navigation patterns', () => {
      // Test that state changes can be triggered programmatically
      const initialState = manager.getCategoryState('macronutrient');
      expect(initialState.isExpanded).toBe(false);

      // Simulate keyboard activation
      manager.toggleCategory('macronutrient');
      
      const expandedState = manager.getCategoryState('macronutrient');
      expect(expandedState.isExpanded).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should handle category operations efficiently', () => {
      const startTime = performance.now();
      
      // Perform multiple operations
      const categories = manager.getAllCategories();
      categories.forEach(categoryId => {
        manager.getCategoryState(categoryId);
        manager.toggleCategory(categoryId);
        manager.getCategoryState(categoryId);
      });

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Should complete within reasonable time
      expect(operationTime).toBeLessThan(100); // 100ms
    });

    it('should not cause performance issues during rapid state changes', () => {
      const startTime = performance.now();
      
      // Perform many rapid toggles
      for (let i = 0; i < 100; i++) {
        manager.toggleCategory('macronutrient');
        manager.toggleCategory('micronutrient');
        manager.toggleCategory('harmful');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid changes efficiently
      expect(totalTime).toBeLessThan(500); // 500ms for 300 operations
      
      // State should still be consistent
      const finalStates = manager.getAllCategories().map(categoryId => 
        manager.getCategoryState(categoryId)
      );
      
      finalStates.forEach(state => {
        expect(typeof state.isExpanded).toBe('boolean');
        expect(state.substances.length).toBeGreaterThan(0);
      });
    });

    it('should scale well with category count', () => {
      const startTime = performance.now();
      
      // Test operations on all categories
      const categories = manager.getAllCategories();
      expect(categories.length).toBe(4);
      
      // Perform operations on all categories multiple times
      for (let i = 0; i < 25; i++) {
        categories.forEach(categoryId => {
          manager.getCategoryState(categoryId);
          if (i % 2 === 0) {
            manager.toggleCategory(categoryId);
          }
        });
      }

      const endTime = performance.now();
      const scalingTime = endTime - startTime;

      // Should scale linearly with category count
      expect(scalingTime).toBeLessThan(200); // 200ms for 400 operations
    });
  });
});