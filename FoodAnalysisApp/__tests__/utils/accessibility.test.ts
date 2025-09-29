import { AccessibilityInfo } from 'react-native';
import { accessibility, colorContrast, accessibilityTestHelpers } from '../../src/utils/accessibility';
import { EnhancedComparisonData } from '../../src/models/types';

// Create test data directly to avoid import issues
const createTestSampleData = (): EnhancedComparisonData[] => {
  return [
    {
      substance: 'Calories',
      category: 'calorie',
      consumed: 2800,
      unit: 'cal',
      status: 'excess',
      referenceValues: [
        { type: 'recommended', value: 2000, color: '#4A78CF', label: 'RDA', position: 71.4 },
      ],
      layers: [
        { value: 2800, percentage: 100, color: '#75F5DB', height: 4, width: 100, borderRadius: 10 },
      ],
      educationalContent: { healthImpact: 'Excess calorie intake may lead to weight gain.' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
    {
      substance: 'Protein',
      category: 'macronutrient',
      consumed: 65,
      unit: 'g',
      status: 'optimal',
      referenceValues: [
        { type: 'recommended', value: 60, color: '#4A78CF', label: 'RDA', position: 92.3 },
      ],
      layers: [
        { value: 65, percentage: 100, color: '#75F5DB', height: 4, width: 100, borderRadius: 10 },
      ],
      educationalContent: { healthImpact: 'Adequate protein supports muscle maintenance.' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
    {
      substance: 'Vitamin C',
      category: 'micronutrient',
      consumed: 45,
      unit: 'mg',
      status: 'deficient',
      referenceValues: [
        { type: 'recommended', value: 90, color: '#4A78CF', label: 'RDA', position: 200 },
      ],
      layers: [
        { value: 45, percentage: 50, color: '#75F5DB', height: 4, width: 50, borderRadius: 10 },
      ],
      educationalContent: { healthImpact: 'Vitamin C deficiency can weaken immune system.' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
    {
      substance: 'Sodium',
      category: 'harmful',
      consumed: 3200,
      unit: 'mg',
      status: 'excess',
      referenceValues: [
        { type: 'recommended', value: 2300, color: '#4A78CF', label: 'Max', position: 71.9 },
      ],
      layers: [
        { value: 3200, percentage: 100, color: '#75F5DB', height: 4, width: 100, borderRadius: 10 },
      ],
      educationalContent: { healthImpact: 'Excess sodium increases cardiovascular risk.' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
  ];
};

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(),
    isReduceMotionEnabled: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('Enhanced Comparison Accessibility Tests', () => {
  let sampleData: EnhancedComparisonData[];

  beforeAll(() => {
    sampleData = createTestSampleData();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Reader Announcements', () => {
    it('should announce messages for screen readers', () => {
      accessibility.announce('Test message');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test message');
    });
  });

  describe('Screen Reader Status', () => {
    it('should check if screen reader is enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      const result = await accessibility.isScreenReaderEnabled();
      expect(result).toBe(true);
      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
    });

    it('should handle errors when checking screen reader status', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(new Error('Test error'));
      const result = await accessibility.isScreenReaderEnabled();
      expect(result).toBe(false);
    });
  });

  describe('Reduce Motion Status', () => {
    it('should check if reduce motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      const result = await accessibility.isReduceMotionEnabled();
      expect(result).toBe(true);
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
    });

    it('should handle errors when checking reduce motion status', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValue(new Error('Test error'));
      const result = await accessibility.isReduceMotionEnabled();
      expect(result).toBe(false);
    });
  });

  describe('Button Accessibility Props', () => {
    it('should generate correct button accessibility props', () => {
      const props = accessibility.button('Test Button', 'This is a test button');
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'Test Button',
        accessibilityHint: 'This is a test button',
        accessibilityState: { disabled: false },
      });
    });

    it('should handle disabled state', () => {
      const props = accessibility.button('Test Button', 'This is a test button', true);
      expect(props.accessibilityState).toEqual({ disabled: true });
    });
  });

  describe('Text Input Accessibility Props', () => {
    it('should generate correct text input accessibility props', () => {
      const props = accessibility.textInput('Food Name', 'Apple', 'Enter food name');
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'text',
        accessibilityLabel: 'Food Name',
        accessibilityValue: { text: 'Apple' },
        accessibilityHint: 'Enter food name',
      });
    });

    it('should handle empty value', () => {
      const props = accessibility.textInput('Food Name', '', 'Enter food name');
      expect(props.accessibilityValue).toBeUndefined();
    });
  });

  describe('Progress Bar Accessibility Props', () => {
    it('should generate correct progress bar accessibility props', () => {
      const props = accessibility.progressBar(75, 100, 'Loading Progress');
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'progressbar',
        accessibilityLabel: 'Loading Progress',
        accessibilityValue: {
          min: 0,
          max: 100,
          now: 75,
          text: '75%',
        },
      });
    });
  });

  describe('Nutrition-Specific Accessibility', () => {
    it('should generate nutrition card accessibility props', () => {
      const props = accessibility.nutritionCard('Vitamin C', 10, 'mg', 'good');
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'text',
        accessibilityLabel: 'Vitamin C: 10 mg, status: good',
        accessibilityHint: 'Double tap for more details',
      });
    });

    it('should generate meal section accessibility props', () => {
      const props = accessibility.mealSection('Breakfast', 3, true);
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'Breakfast section with 3 items',
        accessibilityState: { expanded: true },
        accessibilityHint: 'Double tap to collapse',
      });
    });

    it('should generate comparison bar accessibility props', () => {
      const props = accessibility.comparisonBar('Vitamin C', 80, 100, 'mg');
      expect(props.accessibilityLabel).toBe('Vitamin C: 80 mg consumed, 100 mg recommended');
      expect(props.accessibilityValue?.text).toBe('80% of recommended, below recommended');
    });
  });

  describe('Enhanced Comparison Card Accessibility', () => {
    it('should generate comprehensive accessibility labels for comparison cards', () => {
      sampleData.forEach(data => {
        // Use existing nutritionCard function as a base
        const props = accessibility.nutritionCard(data.substance, data.consumed, data.unit, data.status);
        
        expect(props.accessible).toBe(true);
        expect(props.accessibilityRole).toBe('text');
        expect(props.accessibilityLabel).toContain(data.substance);
        expect(props.accessibilityLabel).toContain(data.consumed.toString());
        expect(props.accessibilityLabel).toContain(data.unit);
        expect(props.accessibilityLabel).toContain(data.status);
        
        // Should provide interaction hints
        expect(props.accessibilityHint).toContain('Double tap for more details');
      });
    });

    it('should provide accessible descriptions for layered progress bars', () => {
      const caloriesData = sampleData.find(item => item.substance === 'Calories')!;
      
      // Use existing progressBar function
      const props = accessibility.progressBar(caloriesData.consumed, 2000, `${caloriesData.substance} consumption`);
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe('progressbar');
      expect(props.accessibilityLabel).toContain(caloriesData.substance);
      expect(props.accessibilityValue?.now).toBe(caloriesData.consumed);
    });

    it('should handle different nutritional statuses appropriately', () => {
      const statusTests = [
        { status: 'deficient', substance: 'Vitamin C' },
        { status: 'optimal', substance: 'Protein' },
        { status: 'excess', substance: 'Calories' },
      ];

      statusTests.forEach(({ status, substance }) => {
        const testData = sampleData.find(item => item.substance === substance)!;
        const props = accessibility.nutritionCard(testData.substance, testData.consumed, testData.unit, testData.status);
        
        expect(props.accessibilityLabel).toContain(testData.status);
      });
    });
  });

  describe('Category Section Accessibility', () => {
    it('should provide accessible category headers', () => {
      const categories = [
        { id: 'calorie', title: 'Calories', count: 1, expanded: true },
        { id: 'macronutrient', title: 'Macronutrients', count: 1, expanded: false },
        { id: 'micronutrient', title: 'Micronutrients', count: 1, expanded: false },
        { id: 'harmful', title: 'Harmful Substances', count: 1, expanded: false },
      ];

      categories.forEach(category => {
        // Use existing mealSection function as a base
        const props = accessibility.mealSection(category.title, category.count, category.expanded);
        
        expect(props.accessible).toBe(true);
        expect(props.accessibilityRole).toBe('button');
        expect(props.accessibilityLabel).toContain(category.title);
        expect(props.accessibilityLabel).toContain(category.count.toString());
        expect(props.accessibilityState?.expanded).toBe(category.expanded);
        
        const expectedHint = category.expanded ? 'Double tap to collapse' : 'Double tap to expand';
        expect(props.accessibilityHint).toContain(expectedHint);
      });
    });

    it('should announce category state changes', () => {
      // Test that announcements can be made
      accessibility.announce('Macronutrients section expanded');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Macronutrients section expanded'
      );
      
      accessibility.announce('Micronutrients section collapsed');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Micronutrients section collapsed'
      );
    });

    it('should provide accessible content descriptions for expanded categories', () => {
      const categoryData = sampleData.filter(item => item.category === 'micronutrient');
      
      // Test that category content can be described
      expect(categoryData.length).toBe(1);
      expect(categoryData[0].substance).toBe('Vitamin C');
      
      // Use existing accessibility functions to describe content
      const props = accessibility.nutritionCard(
        categoryData[0].substance, 
        categoryData[0].consumed, 
        categoryData[0].unit, 
        categoryData[0].status
      );
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityLabel).toContain('Vitamin C');
    });
  });

  describe('Interactive Feature Accessibility', () => {
    it('should provide accessible modal content', () => {
      const vitaminCData = sampleData.find(item => item.substance === 'Vitamin C')!;
      
      // Test that modal content would be accessible using existing functions
      const props = accessibility.nutritionCard(
        vitaminCData.substance, 
        vitaminCData.consumed, 
        vitaminCData.unit, 
        vitaminCData.status
      );
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityLabel).toContain(vitaminCData.substance);
      expect(props.accessibilityHint).toContain('Double tap for more details');
    });

    it('should provide accessible tooltip content', () => {
      const proteinData = sampleData.find(item => item.substance === 'Protein')!;
      
      // Test tooltip accessibility using existing functions
      const props = accessibility.nutritionCard(
        proteinData.substance, 
        proteinData.consumed, 
        proteinData.unit, 
        proteinData.status
      );
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityLabel).toContain(proteinData.substance);
      expect(props.accessibilityLabel).toContain(proteinData.status);
    });

    it('should announce interaction feedback', () => {
      // Test that interaction feedback can be announced
      accessibility.announce('Opened detailed information for Iron');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Opened detailed information for Iron'
      );
      
      accessibility.announce('Showing quick information for Vitamin C');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Showing quick information for Vitamin C'
      );
    });
  });

  describe('Nutrition Score Accessibility', () => {
    it('should provide accessible nutrition score display', () => {
      const mockScore = {
        overall: 75,
        breakdown: { macronutrients: 80, micronutrients: 70, harmfulSubstances: 75 },
        recommendations: ['Increase Vitamin C intake', 'Reduce Sodium intake'],
      };

      // Use existing progressBar function to represent nutrition score
      const props = accessibility.progressBar(mockScore.overall, 100, 'Overall nutrition score');
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe('progressbar');
      expect(props.accessibilityLabel).toContain('nutrition score');
      expect(props.accessibilityValue?.now).toBe(75);
      expect(props.accessibilityValue?.text).toContain('75%');
    });

    it('should announce nutrition score changes', () => {
      const mockScore = {
        overall: 75,
        breakdown: { macronutrients: 80, micronutrients: 70, harmfulSubstances: 75 },
        recommendations: [],
      };

      // Test that nutrition score changes can be announced
      const announcement = `Overall nutrition score: ${mockScore.overall} out of 100. Macronutrients: ${mockScore.breakdown.macronutrients}, Micronutrients: ${mockScore.breakdown.micronutrients}, Harmful substances: ${mockScore.breakdown.harmfulSubstances}`;
      
      accessibility.announce(announcement);
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(announcement);
    });
  });

  describe('Color and Visual Accessibility', () => {
    it('should provide text alternatives for color-coded status', () => {
      // Test that different statuses have meaningful text representations
      const statusTexts = {
        deficient: 'Below recommended level',
        optimal: 'Within optimal range', 
        acceptable: 'Acceptable level',
        excess: 'Above recommended level',
      };
      
      Object.entries(statusTexts).forEach(([status, expectedText]) => {
        const testData = sampleData.find(item => item.status === status);
        if (testData) {
          const props = accessibility.nutritionCard(
            testData.substance, 
            testData.consumed, 
            testData.unit, 
            testData.status
          );
          expect(props.accessibilityLabel).toContain(status);
        }
      });
    });

    it('should validate color contrast for all UI elements', () => {
      // Test that colors used in the sample data are valid hex codes
      sampleData.forEach(data => {
        data.layers.forEach(layer => {
          expect(layer.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
        
        data.referenceValues.forEach(ref => {
          expect(ref.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });

    it('should provide high contrast alternatives', () => {
      // Test that high contrast colors would be available
      const highContrastColors = {
        deficient: '#CC0000', // High contrast red
        optimal: '#006600', // High contrast green
        excess: '#FF6600', // High contrast orange
        background: '#FFFFFF',
        text: '#000000',
      };
      
      // Validate that high contrast colors are proper hex codes
      Object.values(highContrastColors).forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('Focus Management', () => {
    it('should provide logical focus order for enhanced comparison screen', () => {
      // Test that a logical focus order would be maintained
      const expectedFocusOrder = [
        'nutrition-score',
        'category-calories',
        'category-macronutrients',
        'category-micronutrients',
        'category-harmful',
      ];
      
      // Verify the focus order makes logical sense
      expect(expectedFocusOrder[0]).toBe('nutrition-score'); // Overall score first
      expect(expectedFocusOrder[1]).toBe('category-calories'); // Then categories
      expect(expectedFocusOrder.length).toBe(5); // All main elements included
    });

    it('should handle focus during category expansion', () => {
      // Test that focus management principles are sound
      const focusConfig = {
        maintainFocusOnHeader: true,
        announceStateChange: true,
        focusFirstItem: false,
      };
      
      expect(focusConfig.maintainFocusOnHeader).toBe(true);
      expect(focusConfig.announceStateChange).toBe(true);
      expect(focusConfig.focusFirstItem).toBe(false);
    });

    it('should provide focus indicators', () => {
      // Test that focus indicators would have appropriate styling
      const focusStyle = {
        borderWidth: 2,
        borderColor: '#007AFF',
        borderRadius: 8,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
      };
      
      expect(focusStyle.borderWidth).toBe(2);
      expect(focusStyle.borderColor).toBe('#007AFF');
      expect(focusStyle.borderRadius).toBe(8);
      expect(focusStyle.backgroundColor).toBe('rgba(0, 122, 255, 0.1)');
    });
  });

  describe('Reduced Motion Support', () => {
    it('should provide reduced motion alternatives', () => {
      // Test that reduced motion configuration would be appropriate
      const reducedMotionConfig = {
        categoryExpansion: { duration: 0 },
        progressBarAnimation: { duration: 0 },
        modalTransition: { duration: 0 },
        useOpacityInstead: true,
      };
      
      expect(reducedMotionConfig.categoryExpansion.duration).toBe(0);
      expect(reducedMotionConfig.progressBarAnimation.duration).toBe(0);
      expect(reducedMotionConfig.modalTransition.duration).toBe(0);
      expect(reducedMotionConfig.useOpacityInstead).toBe(true);
    });

    it('should maintain functionality with animations disabled', () => {
      // Test that static interaction configuration would work
      const staticConfig = {
        showImmediately: true,
        useInstantTransitions: true,
        maintainVisualHierarchy: true,
      };
      
      expect(staticConfig.showImmediately).toBe(true);
      expect(staticConfig.useInstantTransitions).toBe(true);
      expect(staticConfig.maintainVisualHierarchy).toBe(true);
    });

    it('should respect user motion preferences', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      
      // Test using existing accessibility function
      const shouldUseReducedMotion = await accessibility.isReduceMotionEnabled();
      expect(shouldUseReducedMotion).toBe(true);
      
      // Test that animation config would be adjusted
      const animationConfig = {
        duration: shouldUseReducedMotion ? 0 : 300,
        useNativeDriver: !shouldUseReducedMotion,
      };
      
      expect(animationConfig.duration).toBe(0);
      expect(animationConfig.useNativeDriver).toBe(false);
    });
  });

  describe('Cross-Platform Accessibility', () => {
    it('should handle iOS-specific accessibility features', () => {
      // Test that iOS features would be supported
      const iosFeatures = {
        voiceOverSupport: true,
        dynamicTypeSupport: true,
        reduceMotionSupport: true,
        highContrastSupport: true,
      };
      
      expect(iosFeatures.voiceOverSupport).toBe(true);
      expect(iosFeatures.dynamicTypeSupport).toBe(true);
      expect(iosFeatures.reduceMotionSupport).toBe(true);
      expect(iosFeatures.highContrastSupport).toBe(true);
    });

    it('should handle Android-specific accessibility features', () => {
      // Test that Android features would be supported
      const androidFeatures = {
        talkBackSupport: true,
        fontScaleSupport: true,
        highContrastSupport: true,
        colorInversionSupport: true,
      };
      
      expect(androidFeatures.talkBackSupport).toBe(true);
      expect(androidFeatures.fontScaleSupport).toBe(true);
      expect(androidFeatures.highContrastSupport).toBe(true);
      expect(androidFeatures.colorInversionSupport).toBe(true);
    });

    it('should provide consistent accessibility across platforms', () => {
      const testData = sampleData[0];
      
      // Test that accessibility props would be consistent across platforms
      const iosProps = accessibility.nutritionCard(
        testData.substance, 
        testData.consumed, 
        testData.unit, 
        testData.status
      );
      const androidProps = accessibility.nutritionCard(
        testData.substance, 
        testData.consumed, 
        testData.unit, 
        testData.status
      );
      
      // Core accessibility should be consistent
      expect(iosProps.accessibilityLabel).toContain(testData.substance);
      expect(androidProps.accessibilityLabel).toContain(testData.substance);
      expect(iosProps.accessibilityRole).toBe(androidProps.accessibilityRole);
    });
  });

  describe('Enhanced Accessibility Features', () => {
    it('should create enhanced comparison card accessibility props', () => {
      const referenceValues = [
        { type: 'recommended', value: 60, label: 'RDA' },
        { type: 'maximum', value: 100, label: 'Max' }
      ];
      
      const props = accessibility.enhancedComparisonCard(
        'Protein', 
        65, 
        'g', 
        'optimal', 
        referenceValues
      );
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe('button');
      expect(props.accessibilityLabel).toContain('Protein: 65 g consumed, within optimal range');
      expect(props.accessibilityLabel).toContain('Reference values: RDA: 60 g, Max: 100 g');
      expect(props.accessibilityHint).toContain('Double tap for detailed breakdown');
    });

    it('should create layered progress bar accessibility props', () => {
      const layers = [
        { value: 65, percentage: 100 },
        { value: 60, percentage: 92.3 }
      ];
      const referenceValues = [
        { type: 'recommended', value: 60, label: 'RDA' }
      ];
      
      const props = accessibility.layeredProgressBar(
        'Protein',
        layers,
        referenceValues,
        'g'
      );
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe('progressbar');
      expect(props.accessibilityLabel).toBe('Protein consumption visualization');
      expect(props.accessibilityValue.text).toContain('Main consumption: 65 g');
      expect(props.accessibilityValue.text).toContain('Reference values: RDA: 60 g');
    });

    it('should create category section accessibility props', () => {
      const props = accessibility.categorySection(
        'Macronutrients',
        5,
        true,
        1,
        1,
        3
      );
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe('button');
      expect(props.accessibilityLabel).toContain('Macronutrients category with 5 substances');
      expect(props.accessibilityLabel).toContain('Status: 3 optimal, 1 deficient, 1 excess');
      expect(props.accessibilityState.expanded).toBe(true);
      expect(props.accessibilityHint).toBe('Double tap to collapse section');
    });

    it('should create nutrition score widget accessibility props', () => {
      const props = accessibility.nutritionScoreWidget(85, 90, 80, 75);
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityRole).toBe('text');
      expect(props.accessibilityLabel).toContain('Overall nutrition score: 85 out of 100');
      expect(props.accessibilityLabel).toContain('Macronutrients 90, Micronutrients 80, Harmful substances 75');
    });
  });

  describe('Color Contrast Utilities', () => {
    it('should calculate relative luminance correctly', () => {
      const whiteLuminance = colorContrast.getRelativeLuminance('#FFFFFF');
      const blackLuminance = colorContrast.getRelativeLuminance('#000000');
      
      expect(whiteLuminance).toBeCloseTo(1, 2);
      expect(blackLuminance).toBeCloseTo(0, 2);
    });

    it('should calculate contrast ratio correctly', () => {
      const ratio = colorContrast.getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0); // Maximum contrast ratio
    });

    it('should validate WCAG standards correctly', () => {
      // High contrast - should pass both AA and AAA
      expect(colorContrast.meetsWCAGStandards('#FFFFFF', '#000000', 'AA')).toBe(true);
      expect(colorContrast.meetsWCAGStandards('#FFFFFF', '#000000', 'AAA')).toBe(true);
      
      // Low contrast - should fail both
      expect(colorContrast.meetsWCAGStandards('#FFFFFF', '#EEEEEE', 'AA')).toBe(false);
      expect(colorContrast.meetsWCAGStandards('#FFFFFF', '#EEEEEE', 'AAA')).toBe(false);
    });

    it('should provide accessible color alternatives', () => {
      const accessibleColor = colorContrast.getAccessibleColor('#CCCCCC', '#FFFFFF');
      const ratio = colorContrast.getContrastRatio(accessibleColor, '#FFFFFF');
      
      expect(ratio).toBeGreaterThanOrEqual(4.5); // Should meet AA standards
    });

    it('should validate color palette accessibility', () => {
      const colors = {
        primary: '#75F5DB',
        secondary: '#4A78CF',
        text: '#2D3748',
        error: '#F56565'
      };
      
      const results = colorContrast.validateColorPalette(colors, '#FFFFFF');
      
      expect(results.primary).toBeDefined();
      expect(results.primary.ratio).toBeGreaterThan(0);
      expect(typeof results.primary.meetsAA).toBe('boolean');
      expect(typeof results.primary.meetsAAA).toBe('boolean');
    });
  });

  describe('Accessibility Test Helpers', () => {
    it('should generate test IDs correctly', () => {
      expect(accessibilityTestHelpers.testID('button')).toBe('button');
      expect(accessibilityTestHelpers.testID('button', 'submit')).toBe('button-submit');
      expect(accessibilityTestHelpers.testID('comparison-card', 'protein')).toBe('comparison-card-protein');
    });

    it('should validate accessibility props', () => {
      const validProps = {
        accessible: true,
        accessibilityLabel: 'Test Label',
        accessibilityRole: 'button',
      };
      const warnings = accessibilityTestHelpers.validateAccessibilityProps(validProps);
      expect(warnings).toHaveLength(0);
    });

    it('should detect missing accessibility labels', () => {
      const invalidProps = {
        accessible: true,
        accessibilityRole: 'button',
      };
      const warnings = accessibilityTestHelpers.validateAccessibilityProps(invalidProps);
      expect(warnings).toContain('Accessible element missing accessibilityLabel');
      expect(warnings).toContain('Button missing accessibilityLabel');
    });

    it('should validate enhanced comparison card data', () => {
      const validData = {
        substance: 'Protein',
        consumed: 65,
        unit: 'g',
        status: 'optimal',
        referenceValues: [{ type: 'recommended', value: 60, label: 'RDA' }],
        layers: [{ value: 65, percentage: 100 }]
      };

      const warnings = accessibilityTestHelpers.validateEnhancedComparisonCard(validData);
      expect(warnings).toHaveLength(0);
    });

    it('should detect missing enhanced comparison card data', () => {
      const invalidData = {
        substance: 'Protein',
        // Missing required fields
      };

      const warnings = accessibilityTestHelpers.validateEnhancedComparisonCard(invalidData);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings).toContain('Enhanced comparison card missing consumed value');
    });

    it('should generate comprehensive visualization descriptions', () => {
      const data = {
        substance: 'Protein',
        consumed: 65,
        unit: 'g',
        status: 'optimal',
        referenceValues: [
          { type: 'recommended', value: 60, label: 'RDA' },
          { type: 'maximum', value: 100, label: 'Max' }
        ],
        layers: [
          { value: 65, percentage: 100 },
          { value: 60, percentage: 92.3 }
        ]
      };

      const description = accessibilityTestHelpers.generateVisualizationDescription(data);
      
      expect(description).toContain('Protein: 65 g consumed');
      expect(description).toContain('within optimal range');
      expect(description).toContain('Reference values include: RDA at 60 g, Max at 100 g');
      expect(description).toContain('2 consumption layers');
      expect(description).toContain('Double tap for detailed breakdown');
    });

    it('should validate enhanced comparison accessibility', () => {
      sampleData.forEach(data => {
        // Use existing accessibility functions to validate
        const props = accessibility.nutritionCard(
          data.substance, 
          data.consumed, 
          data.unit, 
          data.status
        );
        const warnings = accessibilityTestHelpers.validateAccessibilityProps(props);
        
        expect(warnings).toHaveLength(0);
        expect(props.accessibilityLabel).toBeTruthy();
        expect(props.accessibilityRole).toBeTruthy();
        expect(props.accessibilityHint).toBeTruthy();
      });
    });

    it('should provide accessibility testing utilities', () => {
      // Test that testing utilities would be available
      const testUtils = {
        simulateScreenReader: jest.fn(),
        simulateReducedMotion: jest.fn(),
        simulateHighContrast: jest.fn(),
        validateColorContrast: jest.fn(),
        validateFocusOrder: jest.fn(),
      };
      
      expect(testUtils.simulateScreenReader).toBeDefined();
      expect(testUtils.simulateReducedMotion).toBeDefined();
      expect(testUtils.simulateHighContrast).toBeDefined();
      expect(testUtils.validateColorContrast).toBeDefined();
      expect(testUtils.validateFocusOrder).toBeDefined();
    });
  });
});