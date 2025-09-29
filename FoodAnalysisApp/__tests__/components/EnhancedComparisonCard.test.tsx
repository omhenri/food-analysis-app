import { createSampleEnhancedComparisonData } from '../../src/utils/enhancedComparisonUtils';
import { EnhancedComparisonData } from '../../src/models/types';

describe('EnhancedComparisonCard Data', () => {
  let sampleData: EnhancedComparisonData[];

  beforeAll(() => {
    sampleData = createSampleEnhancedComparisonData();
  });

  it('creates sample data correctly', () => {
    expect(sampleData).toBeDefined();
    expect(sampleData.length).toBeGreaterThan(0);
  });

  it('has correct data structure for calories', () => {
    const caloriesData = sampleData.find(item => item.substance === 'Calories');
    expect(caloriesData).toBeDefined();
    expect(caloriesData?.category).toBe('calorie');
    expect(caloriesData?.consumed).toBe(2800);
    expect(caloriesData?.unit).toBe('cal');
    expect(caloriesData?.status).toBe('excess');
    expect(caloriesData?.referenceValues).toBeDefined();
    expect(caloriesData?.layers).toBeDefined();
    expect(caloriesData?.educationalContent).toBeDefined();
    expect(caloriesData?.visualConfig).toBeDefined();
  });

  it('has correct data structure for protein', () => {
    const proteinData = sampleData.find(item => item.substance === 'Protein');
    expect(proteinData).toBeDefined();
    expect(proteinData?.category).toBe('macronutrient');
    expect(proteinData?.consumed).toBe(65);
    expect(proteinData?.unit).toBe('g');
    expect(proteinData?.status).toBe('optimal');
  });

  it('has correct data structure for vitamin C', () => {
    const vitaminCData = sampleData.find(item => item.substance === 'Vitamin C');
    expect(vitaminCData).toBeDefined();
    expect(vitaminCData?.category).toBe('micronutrient');
    expect(vitaminCData?.consumed).toBe(45);
    expect(vitaminCData?.unit).toBe('mg');
    expect(vitaminCData?.status).toBe('deficient');
  });

  it('has correct data structure for sodium', () => {
    const sodiumData = sampleData.find(item => item.substance === 'Sodium');
    expect(sodiumData).toBeDefined();
    expect(sodiumData?.category).toBe('harmful');
    expect(sodiumData?.consumed).toBe(3200);
    expect(sodiumData?.unit).toBe('mg');
    expect(sodiumData?.status).toBe('excess');
  });

  it('has correct reference values structure', () => {
    const caloriesData = sampleData.find(item => item.substance === 'Calories');
    expect(caloriesData?.referenceValues).toBeDefined();
    expect(caloriesData?.referenceValues.length).toBeGreaterThan(0);
    
    const firstRef = caloriesData?.referenceValues[0];
    expect(firstRef?.type).toBeDefined();
    expect(firstRef?.value).toBeDefined();
    expect(firstRef?.color).toBeDefined();
    expect(firstRef?.label).toBeDefined();
    expect(firstRef?.position).toBeDefined();
  });

  it('has correct consumption layers structure', () => {
    const caloriesData = sampleData.find(item => item.substance === 'Calories');
    expect(caloriesData?.layers).toBeDefined();
    expect(caloriesData?.layers.length).toBeGreaterThan(0);
    
    const firstLayer = caloriesData?.layers[0];
    expect(firstLayer?.value).toBeDefined();
    expect(firstLayer?.percentage).toBeDefined();
    expect(firstLayer?.color).toBeDefined();
    expect(firstLayer?.height).toBe(4); // Main consumption bars should be 4px
    expect(firstLayer?.width).toBeDefined();
    expect(firstLayer?.borderRadius).toBe(10); // Should be 10px for rounded ends
  });

  it('has correct educational content structure', () => {
    const caloriesData = sampleData.find(item => item.substance === 'Calories');
    expect(caloriesData?.educationalContent).toBeDefined();
    expect(caloriesData?.educationalContent.healthImpact).toBeDefined();
    expect(typeof caloriesData?.educationalContent.healthImpact).toBe('string');
  });

  it('has correct visual configuration', () => {
    const caloriesData = sampleData.find(item => item.substance === 'Calories');
    expect(caloriesData?.visualConfig).toBeDefined();
    expect(caloriesData?.visualConfig.maxBarWidth).toBe(300);
    expect(caloriesData?.visualConfig.barSpacing).toBe(2);
    expect(caloriesData?.visualConfig.indicatorSize).toBe(2);
    expect(caloriesData?.visualConfig.animationDuration).toBe(800);
  });

  it('covers all required categories', () => {
    const categories = sampleData.map(item => item.category);
    expect(categories).toContain('calorie');
    expect(categories).toContain('macronutrient');
    expect(categories).toContain('micronutrient');
    expect(categories).toContain('harmful');
  });

  it('covers all required status types', () => {
    const statuses = sampleData.map(item => item.status);
    expect(statuses).toContain('excess');
    expect(statuses).toContain('optimal');
    expect(statuses).toContain('deficient');
  });
});