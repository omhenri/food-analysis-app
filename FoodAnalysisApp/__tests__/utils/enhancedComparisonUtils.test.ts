import { 
  calculateConsumptionLayers, 
  calculateReferencePositions 
} from '../../src/utils/enhancedComparisonUtils';
import { ReferenceValue } from '../../src/models/types';

// Mock the Colors import to avoid React Native dependencies
jest.mock('../../src/constants/theme', () => ({
  Colors: {
    enhancedPrimary: '#75F5DB',
    enhancedSecondary1: '#67C7C1',
    enhancedSecondary2: '#509A9C',
    referenceBlue: '#4A78CF',
    referencePink: '#EA92BD',
  }
}));

describe('Enhanced Comparison Utils', () => {
  describe('calculateConsumptionLayers', () => {
    it('creates correct consumption layers for excess consumption', () => {
      const consumed = 2800;
      const referenceValues: ReferenceValue[] = [
        {
          type: 'recommended',
          value: 2000,
          color: '#4A78CF',
          label: 'RDA',
          position: 71.4,
        },
        {
          type: 'maximum',
          value: 2400,
          color: '#EA92BD',
          label: 'Max',
          position: 85.7,
        },
      ];

      const layers = calculateConsumptionLayers(consumed, referenceValues);

      expect(layers).toBeDefined();
      expect(layers.length).toBeGreaterThan(0);
      
      // First layer should always be the main consumption (100%)
      expect(layers[0].percentage).toBe(100);
      expect(layers[0].height).toBe(4);
      expect(layers[0].borderRadius).toBe(10);
      expect(layers[0].color).toBe('#75F5DB'); // enhancedPrimary
    });

    it('creates correct consumption layers for deficient consumption', () => {
      const consumed = 45;
      const referenceValues: ReferenceValue[] = [
        {
          type: 'recommended',
          value: 90,
          color: '#4A78CF',
          label: 'RDA',
          position: 200,
        },
      ];

      const layers = calculateConsumptionLayers(consumed, referenceValues);

      expect(layers).toBeDefined();
      expect(layers.length).toBe(1); // Only main layer since reference is higher than consumed
      expect(layers[0].percentage).toBe(100);
      expect(layers[0].value).toBe(consumed);
    });

    it('creates secondary layers for reference values below consumption', () => {
      const consumed = 3200;
      const referenceValues: ReferenceValue[] = [
        {
          type: 'recommended',
          value: 2300,
          color: '#4A78CF',
          label: 'Max',
          position: 71.9,
        },
      ];

      const layers = calculateConsumptionLayers(consumed, referenceValues);

      expect(layers.length).toBe(2); // Main layer + one secondary layer
      expect(layers[1].value).toBe(2300);
      expect(layers[1].percentage).toBeCloseTo(71.875); // 2300/3200 * 100
      expect(layers[1].color).toBe('#67C7C1'); // enhancedSecondary1
    });
  });

  describe('calculateReferencePositions', () => {
    it('calculates correct positions for reference values', () => {
      const consumed = 2800;
      const referenceValues: ReferenceValue[] = [
        {
          type: 'recommended',
          value: 2000,
          color: '#4A78CF',
          label: 'RDA',
          position: 0, // Will be calculated
        },
        {
          type: 'maximum',
          value: 2400,
          color: '#EA92BD',
          label: 'Max',
          position: 0, // Will be calculated
        },
      ];

      const updatedRefs = calculateReferencePositions(consumed, referenceValues);

      expect(updatedRefs[0].position).toBeCloseTo(71.43, 1); // 2000/2800 * 100
      expect(updatedRefs[1].position).toBeCloseTo(85.71, 1); // 2400/2800 * 100
    });

    it('caps positions at 100% when reference exceeds consumption', () => {
      const consumed = 45;
      const referenceValues: ReferenceValue[] = [
        {
          type: 'recommended',
          value: 90,
          color: '#4A78CF',
          label: 'RDA',
          position: 0,
        },
      ];

      const updatedRefs = calculateReferencePositions(consumed, referenceValues);

      expect(updatedRefs[0].position).toBe(100); // Capped at 100%
    });

    it('handles multiple reference values correctly', () => {
      const consumed = 100;
      const referenceValues: ReferenceValue[] = [
        {
          type: 'minimum',
          value: 25,
          color: '#4A78CF',
          label: 'Min',
          position: 0,
        },
        {
          type: 'recommended',
          value: 50,
          color: '#4A78CF',
          label: 'RDA',
          position: 0,
        },
        {
          type: 'maximum',
          value: 75,
          color: '#EA92BD',
          label: 'Max',
          position: 0,
        },
      ];

      const updatedRefs = calculateReferencePositions(consumed, referenceValues);

      expect(updatedRefs[0].position).toBe(25); // 25/100 * 100
      expect(updatedRefs[1].position).toBe(50); // 50/100 * 100
      expect(updatedRefs[2].position).toBe(75); // 75/100 * 100
    });
  });
});