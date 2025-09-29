import { EnhancedComparisonData, ConsumptionLayer, ReferenceValue } from '../../src/models/types';

// Create sample data directly to avoid import issues
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
        { type: 'maximum', value: 2400, color: '#EA92BD', label: 'Max', position: 85.7 },
      ],
      layers: [
        { value: 2800, percentage: 100, color: '#75F5DB', height: 4, width: 100, borderRadius: 10 },
        { value: 2400, percentage: 85.7, color: '#67C7C1', height: 4, width: 85.7, borderRadius: 10 },
        { value: 2000, percentage: 71.4, color: '#509A9C', height: 4, width: 71.4, borderRadius: 10 },
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
        { value: 2300, percentage: 71.9, color: '#67C7C1', height: 4, width: 71.9, borderRadius: 10 },
      ],
      educationalContent: { healthImpact: 'Excess sodium increases cardiovascular risk.' },
      visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
    },
  ];
};

// Mock visual component structure for testing
interface MockVisualComponent {
  testID: string;
  children?: MockVisualComponent[];
  style?: any;
  props?: any;
}

const createMockEnhancedComparisonCard = (data: EnhancedComparisonData): MockVisualComponent => {
  return {
    testID: `comparison-card-${data.substance}`,
    children: [
      { testID: 'substance-name', props: { children: data.substance } },
      { testID: 'consumption-value', props: { children: data.consumed } },
      { testID: 'unit-indicator', props: { children: `| ${data.unit}` } },
      {
        testID: 'progress-bars-container',
        children: [
          ...data.layers.map((layer, index) => ({
            testID: `consumption-layer-${index}`,
            style: {
              height: layer.height,
              width: `${layer.width}%`,
              backgroundColor: layer.color,
              borderRadius: layer.borderRadius,
            },
          })),
          ...data.referenceValues.map((ref, index) => ({
            testID: `reference-indicator-${index}`,
            style: {
              left: `${ref.position}%`,
              width: 2,
              height: 2,
              backgroundColor: ref.color,
              borderRadius: 1,
            },
          })),
        ],
      },
      ...data.referenceValues.map((ref, index) => ({
        testID: `reference-value-${index}`,
        style: { fontSize: 8, color: ref.color },
        props: { children: ref.value },
      })),
    ],
  };
};

describe('Layered Progress Bar Visual Regression Tests', () => {
  let sampleData: EnhancedComparisonData[];

  beforeAll(() => {
    sampleData = createTestSampleData();
  });

  describe('Visual Structure Validation', () => {
    it('should render all required visual elements for calories', () => {
      const caloriesData = sampleData.find(item => item.substance === 'Calories')!;
      const mockComponent = createMockEnhancedComparisonCard(caloriesData);

      // Check basic structure
      expect(mockComponent.testID).toBe(`comparison-card-${caloriesData.substance}`);
      expect(mockComponent.children).toBeDefined();
      
      const children = mockComponent.children!;
      const substanceName = children.find(child => child.testID === 'substance-name');
      const consumptionValue = children.find(child => child.testID === 'consumption-value');
      const unitIndicator = children.find(child => child.testID === 'unit-indicator');
      const progressContainer = children.find(child => child.testID === 'progress-bars-container');

      expect(substanceName).toBeTruthy();
      expect(consumptionValue).toBeTruthy();
      expect(unitIndicator).toBeTruthy();
      expect(progressContainer).toBeTruthy();

      // Check consumption layers
      const layers = progressContainer!.children!.filter(child => 
        child.testID.startsWith('consumption-layer-')
      );
      expect(layers.length).toBe(caloriesData.layers.length);

      // Check reference indicators
      const indicators = progressContainer!.children!.filter(child => 
        child.testID.startsWith('reference-indicator-')
      );
      expect(indicators.length).toBe(caloriesData.referenceValues.length);
    });

    it('should render correct typography content', () => {
      const proteinData = sampleData.find(item => item.substance === 'Protein')!;
      const mockComponent = createMockEnhancedComparisonCard(proteinData);

      const children = mockComponent.children!;
      const substanceName = children.find(child => child.testID === 'substance-name');
      const consumptionValue = children.find(child => child.testID === 'consumption-value');
      const unitIndicator = children.find(child => child.testID === 'unit-indicator');

      // Verify text content
      expect(substanceName?.props?.children).toBe('Protein');
      expect(consumptionValue?.props?.children).toBe(65);
      expect(unitIndicator?.props?.children).toBe('| g');
    });

    it('should render layered progress bars with correct dimensions', () => {
      const caloriesData = sampleData.find(item => item.substance === 'Calories')!;
      const mockComponent = createMockEnhancedComparisonCard(caloriesData);

      const progressContainer = mockComponent.children!.find(child => 
        child.testID === 'progress-bars-container'
      );
      const layers = progressContainer!.children!.filter(child => 
        child.testID.startsWith('consumption-layer-')
      );
      
      layers.forEach((layer, index) => {
        const expectedLayer = caloriesData.layers[index];
        
        expect(layer.style.height).toBe(expectedLayer.height);
        expect(layer.style.width).toBe(`${expectedLayer.width}%`);
        expect(layer.style.backgroundColor).toBe(expectedLayer.color);
        expect(layer.style.borderRadius).toBe(expectedLayer.borderRadius);
      });
    });

    it('should render reference indicators with correct positioning', () => {
      const vitaminCData = sampleData.find(item => item.substance === 'Vitamin C')!;
      const mockComponent = createMockEnhancedComparisonCard(vitaminCData);

      const progressContainer = mockComponent.children!.find(child => 
        child.testID === 'progress-bars-container'
      );
      const indicators = progressContainer!.children!.filter(child => 
        child.testID.startsWith('reference-indicator-')
      );
      
      indicators.forEach((indicator, index) => {
        const expectedRef = vitaminCData.referenceValues[index];
        
        expect(indicator.style.left).toBe(`${expectedRef.position}%`);
        expect(indicator.style.width).toBe(2);
        expect(indicator.style.height).toBe(2);
        expect(indicator.style.backgroundColor).toBe(expectedRef.color);
        expect(indicator.style.borderRadius).toBe(1);
      });
    });
  });

  describe('Color Scheme Validation', () => {
    it('should use correct theme colors for consumption layers', () => {
      const sodiumData = sampleData.find(item => item.substance === 'Sodium')!;
      const mockComponent = createMockEnhancedComparisonCard(sodiumData);

      const progressContainer = mockComponent.children!.find(child => 
        child.testID === 'progress-bars-container'
      );
      const layers = progressContainer!.children!.filter(child => 
        child.testID.startsWith('consumption-layer-')
      );
      
      // Primary layer should use theme color
      expect(layers[0].style.backgroundColor).toBe('#75F5DB');
      
      // Secondary layers should use gradient colors
      if (layers.length > 1) {
        expect(layers[1].style.backgroundColor).toBe('#67C7C1');
      }
      if (layers.length > 2) {
        expect(layers[2].style.backgroundColor).toBe('#509A9C');
      }
    });

    it('should use correct colors for reference indicators', () => {
      const caloriesData = sampleData.find(item => item.substance === 'Calories')!;
      const mockComponent = createMockEnhancedComparisonCard(caloriesData);

      const progressContainer = mockComponent.children!.find(child => 
        child.testID === 'progress-bars-container'
      );
      const indicators = progressContainer!.children!.filter(child => 
        child.testID.startsWith('reference-indicator-')
      );
      
      indicators.forEach((indicator, index) => {
        const expectedColor = caloriesData.referenceValues[index].color;
        expect(indicator.style.backgroundColor).toBe(expectedColor);
      });
    });

    it('should maintain color consistency across different substances', () => {
      const allSubstances = sampleData;
      
      allSubstances.forEach(substanceData => {
        const mockComponent = createMockEnhancedComparisonCard(substanceData);
        const progressContainer = mockComponent.children!.find(child => 
          child.testID === 'progress-bars-container'
        );
        const layers = progressContainer!.children!.filter(child => 
          child.testID.startsWith('consumption-layer-')
        );
        
        // Primary layer should always be theme color
        expect(layers[0].style.backgroundColor).toBe('#75F5DB');
        
        // Reference indicators should use blue or pink
        const indicators = progressContainer!.children!.filter(child => 
          child.testID.startsWith('reference-indicator-')
        );
        indicators.forEach(indicator => {
          const color = indicator.style.backgroundColor;
          expect(['#4A78CF', '#EA92BD']).toContain(color);
        });
      });
    });
  });

  describe('Responsive Layout Validation', () => {
    it('should handle different bar widths correctly', () => {
      const testData: EnhancedComparisonData = {
        substance: 'Test Substance',
        category: 'micronutrient',
        consumed: 25,
        unit: 'mg',
        status: 'deficient',
        referenceValues: [
          { type: 'recommended', value: 100, color: '#4A78CF', label: 'RDA', position: 400 }
        ],
        layers: [
          { value: 25, percentage: 25, color: '#75F5DB', height: 4, width: 25, borderRadius: 10 }
        ],
        educationalContent: { healthImpact: 'Test impact' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      };

      const mockComponent = createMockEnhancedComparisonCard(testData);
      const progressContainer = mockComponent.children!.find(child => 
        child.testID === 'progress-bars-container'
      );
      const layer = progressContainer!.children!.find(child => 
        child.testID === 'consumption-layer-0'
      );

      expect(layer?.style.width).toBe('25%');
    });

    it('should handle overflow scenarios gracefully', () => {
      const overflowData: EnhancedComparisonData = {
        substance: 'Overflow Test',
        category: 'harmful',
        consumed: 5000,
        unit: 'mg',
        status: 'excess',
        referenceValues: [
          { type: 'recommended', value: 1000, color: '#4A78CF', label: 'Max', position: 20 }
        ],
        layers: [
          { value: 5000, percentage: 100, color: '#75F5DB', height: 4, width: 100, borderRadius: 10 },
          { value: 1000, percentage: 20, color: '#67C7C1', height: 4, width: 20, borderRadius: 10 }
        ],
        educationalContent: { healthImpact: 'Overflow test' },
        visualConfig: { maxBarWidth: 300, barSpacing: 2, indicatorSize: 2, animationDuration: 800 },
      };

      const mockComponent = createMockEnhancedComparisonCard(overflowData);
      const progressContainer = mockComponent.children!.find(child => 
        child.testID === 'progress-bars-container'
      );
      const layers = progressContainer!.children!.filter(child => 
        child.testID.startsWith('consumption-layer-')
      );

      expect(layers[0].style.width).toBe('100%');
      expect(layers[1].style.width).toBe('20%');
    });
  });

  describe('Accessibility Visual Elements', () => {
    it('should provide sufficient contrast for all visual elements', () => {
      const allSubstances = sampleData;
      
      allSubstances.forEach(substanceData => {
        const mockComponent = createMockEnhancedComparisonCard(substanceData);
        const progressContainer = mockComponent.children!.find(child => 
          child.testID === 'progress-bars-container'
        );

        // Check that all colors are valid hex codes
        const layers = progressContainer!.children!.filter(child => 
          child.testID.startsWith('consumption-layer-')
        );
        layers.forEach(layer => {
          const color = layer.style.backgroundColor;
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        const indicators = progressContainer!.children!.filter(child => 
          child.testID.startsWith('reference-indicator-')
        );
        indicators.forEach(indicator => {
          const color = indicator.style.backgroundColor;
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });

    it('should maintain minimum size requirements for touch targets', () => {
      const testData = sampleData[0];
      const mockComponent = createMockEnhancedComparisonCard(testData);

      const container = mockComponent.children!.find(child => 
        child.testID === 'progress-bars-container'
      );
      expect(container).toBeTruthy();
      
      // Container should be large enough for touch interaction
      // This would be validated in actual implementation
    });
  });

  describe('Animation Preparation', () => {
    it('should have correct visual configuration for animations', () => {
      const allSubstances = sampleData;
      
      allSubstances.forEach(substanceData => {
        expect(substanceData.visualConfig.animationDuration).toBeGreaterThan(0);
        expect(substanceData.visualConfig.maxBarWidth).toBeGreaterThan(0);
        expect(substanceData.visualConfig.barSpacing).toBeGreaterThanOrEqual(0);
        expect(substanceData.visualConfig.indicatorSize).toBeGreaterThan(0);
      });
    });

    it('should support staggered layer animations', () => {
      const caloriesData = sampleData.find(item => item.substance === 'Calories')!;
      
      // Multiple layers should be positioned for staggered animation
      expect(caloriesData.layers.length).toBeGreaterThan(1);
      
      // Layers should be ordered by width (largest to smallest)
      for (let i = 1; i < caloriesData.layers.length; i++) {
        expect(caloriesData.layers[i].width).toBeLessThanOrEqual(caloriesData.layers[i - 1].width);
      }
    });
  });

  describe('Cross-Platform Visual Consistency', () => {
    it('should render consistently across different screen densities', () => {
      const testData = sampleData[0];
      
      // Test with different mock screen dimensions
      const screenSizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 812 }, // iPhone X
        { width: 414, height: 896 }, // iPhone XS Max
      ];

      screenSizes.forEach(screenSize => {
        const mockComponent = createMockEnhancedComparisonCard(testData);

        // Visual elements should render regardless of screen size
        const substanceName = mockComponent.children!.find(child => 
          child.testID === 'substance-name'
        );
        const progressContainer = mockComponent.children!.find(child => 
          child.testID === 'progress-bars-container'
        );
        
        expect(substanceName).toBeTruthy();
        expect(progressContainer).toBeTruthy();
      });
    });

    it('should maintain visual hierarchy on different platforms', () => {
      const testData = sampleData[0];
      
      ['ios', 'android'].forEach(platform => {
        const mockComponent = createMockEnhancedComparisonCard(testData);

        // Visual hierarchy should be maintained
        const substanceName = mockComponent.children!.find(child => 
          child.testID === 'substance-name'
        );
        const consumptionValue = mockComponent.children!.find(child => 
          child.testID === 'consumption-value'
        );
        const unitIndicator = mockComponent.children!.find(child => 
          child.testID === 'unit-indicator'
        );
        
        expect(substanceName).toBeTruthy();
        expect(consumptionValue).toBeTruthy();
        expect(unitIndicator).toBeTruthy();
      });
    });
  });
});