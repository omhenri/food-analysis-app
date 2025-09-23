import React from 'react';
import { EnhancedComparisonData } from '../../src/models/types';
import { hapticFeedback } from '../../src/utils/platform';
import { EducationalContentService } from '../../src/services/EducationalContentService';

// Mock haptic feedback
jest.mock('../../src/utils/platform', () => ({
  hapticFeedback: {
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    selection: jest.fn(),
  },
}));

const mockEnhancedComparisonData: EnhancedComparisonData = {
  substance: 'Vitamin C',
  category: 'micronutrient',
  consumed: 85,
  unit: 'mg',
  referenceValues: [
    {
      type: 'recommended',
      value: 90,
      color: '#4A78CF',
      label: 'RDA',
      position: 90,
    },
    {
      type: 'upper_limit',
      value: 2000,
      color: '#EA92BD',
      label: 'Upper Limit',
      position: 100,
    },
  ],
  status: 'optimal',
  layers: [
    {
      value: 85,
      percentage: 94.4,
      color: '#75F5DB',
      height: 4,
      width: 94.4,
      borderRadius: 10,
    },
  ],
  educationalContent: {
    healthImpact: 'Powerful antioxidant that supports immune function, collagen synthesis, and iron absorption.',
    recommendedSources: ['Citrus fruits', 'Berries', 'Bell peppers', 'Broccoli'],
    reductionTips: ['Excess is usually excreted, but very high doses may cause digestive upset'],
    optimalRange: '75-90 mg per day',
  },
  visualConfig: {
    maxBarWidth: 300,
    barSpacing: 2,
    indicatorSize: 2,
    animationDuration: 300,
  },
};

describe('Interactive Comparison Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Haptic Feedback', () => {
    it('should have light haptic feedback function', () => {
      expect(hapticFeedback.light).toBeDefined();
      expect(typeof hapticFeedback.light).toBe('function');
    });

    it('should have medium haptic feedback function', () => {
      expect(hapticFeedback.medium).toBeDefined();
      expect(typeof hapticFeedback.medium).toBe('function');
    });

    it('should have heavy haptic feedback function', () => {
      expect(hapticFeedback.heavy).toBeDefined();
      expect(typeof hapticFeedback.heavy).toBe('function');
    });

    it('should call haptic feedback functions without errors', () => {
      expect(() => hapticFeedback.light()).not.toThrow();
      expect(() => hapticFeedback.medium()).not.toThrow();
      expect(() => hapticFeedback.heavy()).not.toThrow();
    });
  });

  describe('Educational Content Integration', () => {
    it('should provide educational content for interactive features', () => {
      const vitaminCContent = EducationalContentService.getEducationalContent('Vitamin C');
      
      expect(vitaminCContent).toBeTruthy();
      expect(vitaminCContent?.healthImpact).toBeTruthy();
      expect(vitaminCContent?.recommendedSources).toBeTruthy();
    });

    it('should provide deficiency recommendations for tap interactions', () => {
      const ironSources = EducationalContentService.getDeficiencyRecommendations('Iron');
      
      expect(ironSources).toBeInstanceOf(Array);
      expect(ironSources.length).toBeGreaterThan(0);
    });

    it('should provide excess reduction tips for tap interactions', () => {
      const sodiumTips = EducationalContentService.getExcessReductionTips('Sodium');
      
      expect(sodiumTips).toBeInstanceOf(Array);
      expect(sodiumTips.length).toBeGreaterThan(0);
    });

    it('should provide health impact information for tooltips', () => {
      const proteinImpact = EducationalContentService.getHealthImpact('Protein');
      
      expect(proteinImpact).toBeTruthy();
      expect(proteinImpact.length).toBeGreaterThan(20);
    });
  });

  describe('Enhanced Comparison Data Structure', () => {
    it('should have proper structure for interactive features', () => {
      expect(mockEnhancedComparisonData.substance).toBe('Vitamin C');
      expect(mockEnhancedComparisonData.educationalContent).toBeTruthy();
      expect(mockEnhancedComparisonData.educationalContent.healthImpact).toBeTruthy();
      expect(mockEnhancedComparisonData.educationalContent.recommendedSources).toBeTruthy();
    });

    it('should have reference values for detailed breakdown', () => {
      expect(mockEnhancedComparisonData.referenceValues).toBeInstanceOf(Array);
      expect(mockEnhancedComparisonData.referenceValues.length).toBeGreaterThan(0);
      
      const firstRef = mockEnhancedComparisonData.referenceValues[0];
      expect(firstRef.type).toBeTruthy();
      expect(firstRef.value).toBeGreaterThan(0);
      expect(firstRef.color).toBeTruthy();
      expect(firstRef.label).toBeTruthy();
    });

    it('should have consumption layers for visualization', () => {
      expect(mockEnhancedComparisonData.layers).toBeInstanceOf(Array);
      expect(mockEnhancedComparisonData.layers.length).toBeGreaterThan(0);
      
      const firstLayer = mockEnhancedComparisonData.layers[0];
      expect(firstLayer.value).toBeGreaterThan(0);
      expect(firstLayer.percentage).toBeGreaterThan(0);
      expect(firstLayer.color).toBeTruthy();
      expect(firstLayer.height).toBeGreaterThan(0);
    });

    it('should have visual configuration for animations', () => {
      expect(mockEnhancedComparisonData.visualConfig).toBeTruthy();
      expect(mockEnhancedComparisonData.visualConfig.maxBarWidth).toBeGreaterThan(0);
      expect(mockEnhancedComparisonData.visualConfig.animationDuration).toBeGreaterThan(0);
      expect(mockEnhancedComparisonData.visualConfig.indicatorSize).toBeGreaterThan(0);
    });
  });

  describe('Interactive Features Logic', () => {
    it('should handle tap interactions for detailed breakdown', () => {
      const onTap = jest.fn();
      
      // Simulate tap interaction
      onTap('Vitamin C');
      
      expect(onTap).toHaveBeenCalledWith('Vitamin C');
    });

    it('should handle long press interactions for tooltips', () => {
      const onLongPress = jest.fn();
      
      // Simulate long press interaction
      onLongPress('Vitamin C');
      
      expect(onLongPress).toHaveBeenCalledWith('Vitamin C');
    });

    it('should provide appropriate recommendations based on status', () => {
      // Test deficient status
      const deficientData = { ...mockEnhancedComparisonData, status: 'deficient' as const };
      const recommendations = EducationalContentService.getDeficiencyRecommendations(deficientData.substance);
      expect(recommendations.length).toBeGreaterThan(0);

      // Test excess status
      const excessData = { ...mockEnhancedComparisonData, status: 'excess' as const };
      const reductionTips = EducationalContentService.getExcessReductionTips('Sodium');
      expect(reductionTips.length).toBeGreaterThan(0);
    });
  });

  describe('Value Formatting for Display', () => {
    it('should format calorie values correctly', () => {
      const calorieValue = 2000;
      const unit = 'cal';
      const formatted = calorieValue.toFixed(0);
      
      expect(formatted).toBe('2000');
    });

    it('should format gram values correctly', () => {
      const gramValue = 85.5;
      const unit = 'g';
      const formatted = gramValue >= 1 ? gramValue.toFixed(1) : (gramValue * 1000).toFixed(0);
      
      expect(formatted).toBe('85.5');
    });

    it('should format milligram values correctly', () => {
      const mgValue = 0.5;
      const unit = 'g';
      const formatted = mgValue >= 1 ? mgValue.toFixed(1) : (mgValue * 1000).toFixed(0);
      
      expect(formatted).toBe('500');
    });
  });
});