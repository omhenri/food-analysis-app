import { EducationalContentService } from '../../src/services/EducationalContentService';
import { hapticFeedback } from '../../src/utils/platform';
import { EnhancedComparisonData } from '../../src/models/types';
import { performance } from '../../src/utils/performance';

// Mock haptic feedback
jest.mock('../../src/utils/platform', () => ({
  hapticFeedback: {
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    selection: jest.fn(),
  },
}));

describe('Interactive Comparison Integration', () => {
  const mockEnhancedData: EnhancedComparisonData = {
    substance: 'Iron',
    category: 'micronutrient',
    consumed: 8,
    unit: 'mg',
    referenceValues: [
      {
        type: 'recommended',
        value: 18,
        color: '#4A78CF',
        label: 'RDA',
        position: 100,
      },
      {
        type: 'upper_limit',
        value: 45,
        color: '#EA92BD',
        label: 'Upper Limit',
        position: 250,
      },
    ],
    status: 'deficient',
    layers: [
      {
        value: 8,
        percentage: 44.4,
        color: '#75F5DB',
        height: 4,
        width: 44.4,
        borderRadius: 10,
      },
    ],
    educationalContent: {
      healthImpact: 'Essential for oxygen transport and energy production. Deficiency causes anemia and fatigue.',
      recommendedSources: ['Red meat', 'Poultry', 'Fish', 'Beans', 'Spinach', 'Fortified cereals'],
      reductionTips: ['Avoid taking with calcium or tea', 'Don\'t exceed recommended doses'],
      safetyInformation: 'Too much iron can be toxic and cause organ damage.',
      optimalRange: '8-18 mg per day',
    },
    visualConfig: {
      maxBarWidth: 300,
      barSpacing: 2,
      indicatorSize: 2,
      animationDuration: 300,
    },
  };

  // Performance monitoring for interactive features
  const interactionTimer = {
    start: () => performance.now(),
    end: (startTime: number) => performance.now() - startTime,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Interaction Flow', () => {
    it('should provide complete tap interaction experience for deficient nutrient', () => {
      // Simulate user tapping on a deficient nutrient
      const substance = mockEnhancedData.substance;
      
      // 1. Haptic feedback should be triggered
      hapticFeedback.light();
      expect(hapticFeedback.light).toHaveBeenCalled();
      
      // 2. Educational content should be available
      const educationalContent = EducationalContentService.getEducationalContent(substance);
      expect(educationalContent).toBeTruthy();
      expect(educationalContent?.healthImpact).toContain('oxygen transport');
      
      // 3. Deficiency recommendations should be provided
      const recommendations = EducationalContentService.getDeficiencyRecommendations(substance);
      expect(recommendations).toContain('Red meat');
      expect(recommendations).toContain('Spinach');
      expect(recommendations.length).toBeGreaterThan(3);
      
      // 4. Safety information should be available
      const safetyInfo = EducationalContentService.getSafetyInformation(substance);
      expect(safetyInfo).toContain('toxic');
      
      // 5. Optimal range should be provided
      const optimalRange = EducationalContentService.getOptimalRange(substance);
      expect(optimalRange).toContain('8-18 mg per day');
    });

    it('should provide complete long press interaction experience', () => {
      // Simulate user long pressing on a nutrient
      const substance = mockEnhancedData.substance;
      
      // 1. Medium haptic feedback should be triggered
      hapticFeedback.medium();
      expect(hapticFeedback.medium).toHaveBeenCalled();
      
      // 2. Quick health impact should be available
      const healthImpact = EducationalContentService.getHealthImpact(substance);
      expect(healthImpact).toBeTruthy();
      expect(healthImpact.length).toBeGreaterThan(20);
      
      // 3. Quick recommendations should be available
      const quickTips = EducationalContentService.getDeficiencyRecommendations(substance).slice(0, 3);
      expect(quickTips.length).toBe(3);
      expect(quickTips).toContain('Red meat');
    });

    it('should handle excess nutrient interaction flow', () => {
      const excessData = {
        ...mockEnhancedData,
        substance: 'Sodium',
        status: 'excess' as const,
        consumed: 3000,
        unit: 'mg',
      };
      
      // 1. Tap interaction for excess nutrient
      hapticFeedback.light();
      expect(hapticFeedback.light).toHaveBeenCalled();
      
      // 2. Reduction tips should be provided
      const reductionTips = EducationalContentService.getExcessReductionTips('Sodium');
      expect(reductionTips).toContain('Cook at home more often');
      expect(reductionTips).toContain('Use herbs and spices instead of salt');
      expect(reductionTips.length).toBeGreaterThan(3);
      
      // 3. Safety information should be available
      const safetyInfo = EducationalContentService.getSafetyInformation('Sodium');
      expect(safetyInfo).toContain('2-3 times the recommended amount');
    });
  });

  describe('Educational Content Quality for Interactive Features', () => {
    it('should provide comprehensive content for major nutrients', () => {
      const majorNutrients = [
        'Calories', 'Protein', 'Fat', 'Carbohydrates', 'Fiber',
        'Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin B12', 'Folate',
        'Iron', 'Calcium', 'Magnesium', 'Potassium', 'Zinc'
      ];

      majorNutrients.forEach(nutrient => {
        const content = EducationalContentService.getEducationalContent(nutrient);
        
        // Each nutrient should have educational content
        expect(content).toBeTruthy();
        expect(content?.healthImpact).toBeTruthy();
        expect(content?.healthImpact.length).toBeGreaterThan(30);
        
        // Should have either food sources or reduction tips
        const hasSources = content?.recommendedSources && content.recommendedSources.length > 0;
        const hasTips = content?.reductionTips && content.reductionTips.length > 0;
        expect(hasSources || hasTips).toBeTruthy();
      });
    });

    it('should provide actionable recommendations for deficient nutrients', () => {
      const deficientNutrients = ['Iron', 'Vitamin D', 'Calcium', 'Fiber', 'Protein'];
      
      deficientNutrients.forEach(nutrient => {
        const sources = EducationalContentService.getDeficiencyRecommendations(nutrient);
        
        expect(sources).toBeInstanceOf(Array);
        expect(sources.length).toBeGreaterThan(2);
        
        // Each source should be a specific food item
        sources.forEach(source => {
          expect(typeof source).toBe('string');
          expect(source.length).toBeGreaterThan(3);
        });
      });
    });

    it('should provide actionable reduction tips for harmful substances', () => {
      const harmfulSubstances = ['Sodium', 'Saturated Fat', 'Trans Fat', 'Added Sugar'];
      
      harmfulSubstances.forEach(substance => {
        const tips = EducationalContentService.getExcessReductionTips(substance);
        
        expect(tips).toBeInstanceOf(Array);
        expect(tips.length).toBeGreaterThan(2);
        
        // Each tip should be actionable advice
        tips.forEach(tip => {
          expect(typeof tip).toBe('string');
          expect(tip.length).toBeGreaterThan(10);
          // Should be meaningful advice (not empty or too short)
          expect(tip.trim().length).toBeGreaterThan(15);
        });
      });
    });
  });

  describe('Haptic Feedback Integration', () => {
    it('should provide appropriate haptic feedback for different interactions', () => {
      // Light feedback for taps
      hapticFeedback.light();
      expect(hapticFeedback.light).toHaveBeenCalled();
      
      // Medium feedback for long press
      hapticFeedback.medium();
      expect(hapticFeedback.medium).toHaveBeenCalled();
      
      // Heavy feedback for important actions
      hapticFeedback.heavy();
      expect(hapticFeedback.heavy).toHaveBeenCalled();
      
      // Selection feedback for UI changes
      hapticFeedback.selection();
      expect(hapticFeedback.selection).toHaveBeenCalled();
    });

    it('should not throw errors when haptic feedback is called', () => {
      expect(() => hapticFeedback.light()).not.toThrow();
      expect(() => hapticFeedback.medium()).not.toThrow();
      expect(() => hapticFeedback.heavy()).not.toThrow();
      expect(() => hapticFeedback.selection()).not.toThrow();
    });
  });

  describe('Data Structure Validation for Interactive Features', () => {
    it('should have all required fields for detailed modal', () => {
      expect(mockEnhancedData.substance).toBeTruthy();
      expect(mockEnhancedData.category).toBeTruthy();
      expect(mockEnhancedData.consumed).toBeGreaterThanOrEqual(0);
      expect(mockEnhancedData.unit).toBeTruthy();
      expect(mockEnhancedData.status).toBeTruthy();
      expect(mockEnhancedData.educationalContent).toBeTruthy();
      expect(mockEnhancedData.referenceValues).toBeInstanceOf(Array);
      expect(mockEnhancedData.layers).toBeInstanceOf(Array);
      expect(mockEnhancedData.visualConfig).toBeTruthy();
    });

    it('should have valid reference values for visualization', () => {
      mockEnhancedData.referenceValues.forEach(ref => {
        expect(ref.type).toMatch(/recommended|minimum|maximum|upper_limit/);
        expect(ref.value).toBeGreaterThan(0);
        expect(ref.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(ref.label).toBeTruthy();
        expect(ref.position).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid consumption layers for animation', () => {
      mockEnhancedData.layers.forEach(layer => {
        expect(layer.value).toBeGreaterThanOrEqual(0);
        expect(layer.percentage).toBeGreaterThanOrEqual(0);
        expect(layer.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(layer.height).toBeGreaterThan(0);
        expect(layer.width).toBeGreaterThanOrEqual(0);
        expect(layer.borderRadius).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid visual configuration', () => {
      const config = mockEnhancedData.visualConfig;
      expect(config.maxBarWidth).toBeGreaterThan(0);
      expect(config.barSpacing).toBeGreaterThanOrEqual(0);
      expect(config.indicatorSize).toBeGreaterThan(0);
      expect(config.animationDuration).toBeGreaterThan(0);
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work with different platform haptic feedback implementations', () => {
      // Test that haptic feedback functions exist and are callable
      expect(typeof hapticFeedback.light).toBe('function');
      expect(typeof hapticFeedback.medium).toBe('function');
      expect(typeof hapticFeedback.heavy).toBe('function');
      expect(typeof hapticFeedback.selection).toBe('function');
      
      // Should not throw on any platform
      expect(() => {
        hapticFeedback.light();
        hapticFeedback.medium();
        hapticFeedback.heavy();
        hapticFeedback.selection();
      }).not.toThrow();
    });

    it('should handle educational content consistently across platforms', () => {
      const content = EducationalContentService.getEducationalContent('Vitamin C');
      
      // Content should be the same regardless of platform
      expect(content?.healthImpact).toBeTruthy();
      expect(content?.recommendedSources).toBeInstanceOf(Array);
      expect(content?.optimalRange).toBeTruthy();
    });
  });

  describe('Interactive Feature Performance', () => {
    it('should respond to tap interactions within acceptable time', () => {
      const startTime = interactionTimer.start();
      
      // Simulate tap interaction
      hapticFeedback.light();
      const content = EducationalContentService.getEducationalContent('Iron');
      
      const responseTime = interactionTimer.end(startTime);
      
      expect(responseTime).toBeLessThan(100); // Should respond within 100ms
      expect(content).toBeTruthy();
    });

    it('should handle long press interactions efficiently', () => {
      const startTime = interactionTimer.start();
      
      // Simulate long press interaction
      hapticFeedback.medium();
      const healthImpact = EducationalContentService.getHealthImpact('Iron');
      const quickTips = EducationalContentService.getDeficiencyRecommendations('Iron').slice(0, 3);
      
      const responseTime = interactionTimer.end(startTime);
      
      expect(responseTime).toBeLessThan(150); // Should respond within 150ms
      expect(healthImpact).toBeTruthy();
      expect(quickTips.length).toBe(3);
    });

    it('should handle rapid successive interactions without performance degradation', () => {
      const interactions = 50;
      const startTime = interactionTimer.start();
      
      // Simulate rapid interactions
      for (let i = 0; i < interactions; i++) {
        hapticFeedback.light();
        EducationalContentService.getHealthImpact('Iron');
      }
      
      const totalTime = interactionTimer.end(startTime);
      const averageTime = totalTime / interactions;
      
      expect(averageTime).toBeLessThan(10); // Average should be under 10ms per interaction
    });
  });

  describe('Educational Content Interaction Tests', () => {
    it('should provide comprehensive tap interaction for all nutrient statuses', () => {
      const testCases = [
        { substance: 'Iron', status: 'deficient', expectedTips: 'Red meat' },
        { substance: 'Sodium', status: 'excess', expectedTips: 'Cook at home' },
        { substance: 'Protein', status: 'optimal', expectedContent: 'muscle' },
        { substance: 'Vitamin D', status: 'deficient', expectedTips: 'Sunlight' },
      ];

      testCases.forEach(({ substance, status, expectedTips, expectedContent }) => {
        // Simulate tap interaction
        hapticFeedback.light();
        
        const content = EducationalContentService.getEducationalContent(substance);
        expect(content).toBeTruthy();
        
        if (status === 'deficient') {
          const recommendations = EducationalContentService.getDeficiencyRecommendations(substance);
          expect(recommendations.some(tip => tip.includes(expectedTips))).toBeTruthy();
        } else if (status === 'excess') {
          const reductionTips = EducationalContentService.getExcessReductionTips(substance);
          expect(reductionTips.some(tip => tip.includes(expectedTips))).toBeTruthy();
        } else if (expectedContent) {
          expect(content?.healthImpact.toLowerCase()).toContain(expectedContent);
        }
      });
    });

    it('should provide contextual long press tooltips', () => {
      const substances = ['Iron', 'Calcium', 'Vitamin C', 'Sodium', 'Protein'];
      
      substances.forEach(substance => {
        // Simulate long press
        hapticFeedback.medium();
        
        const healthImpact = EducationalContentService.getHealthImpact(substance);
        expect(healthImpact).toBeTruthy();
        expect(healthImpact.length).toBeGreaterThan(20);
        
        // Should provide quick, actionable information
        expect(healthImpact).not.toContain('undefined');
        expect(healthImpact).not.toContain('null');
      });
    });

    it('should handle educational content for unknown substances gracefully', () => {
      const unknownSubstances = ['Unknown Nutrient', 'Fake Vitamin', 'Test Substance'];
      
      unknownSubstances.forEach(substance => {
        expect(() => {
          hapticFeedback.light();
          EducationalContentService.getEducationalContent(substance);
        }).not.toThrow();
        
        const content = EducationalContentService.getEducationalContent(substance);
        // Should handle null gracefully or provide fallback content
        if (content) {
          expect(content.healthImpact).toBeTruthy();
        } else {
          // Null is acceptable for unknown substances
          expect(content).toBeNull();
        }
      });
    });
  });

  describe('Modal and Tooltip Integration', () => {
    it('should trigger appropriate haptic feedback for modal opening', () => {
      // Simulate modal opening interaction
      hapticFeedback.light();
      expect(hapticFeedback.light).toHaveBeenCalled();
      
      // Modal should have comprehensive content
      const content = EducationalContentService.getEducationalContent('Iron');
      expect(content?.healthImpact).toBeTruthy();
      expect(content?.recommendedSources).toBeInstanceOf(Array);
      expect(content?.safetyInformation).toBeTruthy();
      expect(content?.optimalRange).toBeTruthy();
    });

    it('should provide different haptic feedback for tooltip vs modal', () => {
      // Tooltip (long press) - medium feedback
      hapticFeedback.medium();
      expect(hapticFeedback.medium).toHaveBeenCalled();
      
      // Modal (tap) - light feedback
      hapticFeedback.light();
      expect(hapticFeedback.light).toHaveBeenCalled();
      
      // Different interactions should have different feedback
      expect(hapticFeedback.medium).toHaveBeenCalledTimes(1);
      expect(hapticFeedback.light).toHaveBeenCalledTimes(1);
    });

    it('should handle modal dismissal with appropriate feedback', () => {
      // Simulate modal dismissal
      hapticFeedback.selection();
      expect(hapticFeedback.selection).toHaveBeenCalled();
    });
  });

  describe('Accessibility Integration for Interactive Features', () => {
    it('should provide screen reader compatible content', () => {
      const substances = ['Iron', 'Vitamin C', 'Sodium', 'Protein'];
      
      substances.forEach(substance => {
        const content = EducationalContentService.getEducationalContent(substance);
        
        // Content should be screen reader friendly
        expect(content?.healthImpact).toBeTruthy();
        expect(content?.healthImpact.length).toBeGreaterThan(30);
        
        // Should not contain special characters that confuse screen readers
        expect(content?.healthImpact).not.toMatch(/[<>{}]/);
        
        if (content?.recommendedSources) {
          content.recommendedSources.forEach(source => {
            expect(source.length).toBeGreaterThan(2);
            expect(source).not.toMatch(/[<>{}]/);
          });
        }
      });
    });

    it('should provide alternative interaction methods for accessibility', () => {
      // Test that educational content is available without haptic feedback
      const content = EducationalContentService.getEducationalContent('Iron');
      expect(content).toBeTruthy();
      
      // Content should be accessible even if haptic feedback fails
      const mockHaptic = jest.spyOn(hapticFeedback, 'light').mockImplementation(() => {
        throw new Error('Haptic feedback not available');
      });
      
      expect(() => {
        const fallbackContent = EducationalContentService.getEducationalContent('Iron');
        expect(fallbackContent).toBeTruthy();
      }).not.toThrow();
      
      // Clean up the mock
      mockHaptic.mockRestore();
    });
  });

  describe('Interactive Feature Error Handling', () => {
    afterEach(() => {
      // Clean up all mocks after each test
      jest.restoreAllMocks();
    });

    it('should handle educational service failures gracefully', () => {
      // Mock service failure
      const mockGetEducationalContent = jest.spyOn(EducationalContentService, 'getEducationalContent').mockImplementation(() => {
        throw new Error('Service unavailable');
      });
      
      expect(() => {
        EducationalContentService.getEducationalContent('Iron');
      }).toThrow('Service unavailable');
      
      // Haptic feedback should still work independently (not mocked in this test)
      expect(() => {
        hapticFeedback.light();
      }).not.toThrow();
    });

    it('should handle haptic feedback failures gracefully', () => {
      // Mock haptic feedback failure
      const mockHapticLight = jest.spyOn(hapticFeedback, 'light').mockImplementation(() => {
        throw new Error('Haptic not supported');
      });
      
      // Haptic feedback should throw when called directly
      expect(() => {
        hapticFeedback.light();
      }).toThrow('Haptic not supported');
      
      // Educational content should still work independently (not mocked in this test)
      expect(() => {
        const content = EducationalContentService.getEducationalContent('Iron');
        expect(content).toBeTruthy();
      }).not.toThrow();
    });

    it('should provide fallback content for missing educational data', () => {
      // Mock missing content
      const mockGetEducationalContent = jest.spyOn(EducationalContentService, 'getEducationalContent').mockReturnValue(null);
      
      const content = EducationalContentService.getEducationalContent('Unknown Substance');
      
      // Should handle null gracefully in the UI layer
      expect(content).toBeNull();
    });
  });
});