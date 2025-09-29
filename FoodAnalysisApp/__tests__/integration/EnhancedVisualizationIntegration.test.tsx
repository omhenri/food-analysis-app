import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { store } from '../../src/store';
import { EnhancedComparisonDemoScreen } from '../../src/screens/EnhancedComparisonDemoScreen';
import { CategorizedComparisonScreen } from '../../src/screens/CategorizedComparisonScreen';
import { EnhancedAnalysisDataService } from '../../src/services/EnhancedAnalysisDataService';

// Mock services
jest.mock('../../src/services/EnhancedAnalysisDataService');

const MockedEnhancedAnalysisDataService = EnhancedAnalysisDataService as jest.MockedClass<typeof EnhancedAnalysisDataService>;

const mockEnhancedComparisonData = [
  {
    substance: 'Protein',
    category: 'macronutrient' as const,
    consumed: 75,
    unit: 'g',
    referenceValues: [
      { type: 'recommended' as const, value: 50, color: '#4A78CF', label: 'RDA', position: 50 },
      { type: 'upper_limit' as const, value: 100, color: '#EA92BD', label: 'UL', position: 100 },
    ],
    status: 'optimal' as const,
    layers: [
      { value: 75, percentage: 75, color: '#75F5DB', height: 4, width: 150, borderRadius: 10 },
      { value: 50, percentage: 50, color: '#67C7C1', height: 2, width: 100, borderRadius: 10 },
    ],
    educationalContent: {
      healthImpact: 'Protein is essential for muscle building and repair.',
      recommendedSources: ['Chicken', 'Fish', 'Beans', 'Nuts'],
      optimalRange: '50-100g per day for adults',
    },
  },
  {
    substance: 'Vitamin C',
    category: 'micronutrient' as const,
    consumed: 30,
    unit: 'mg',
    referenceValues: [
      { type: 'recommended' as const, value: 90, color: '#4A78CF', label: 'RDA', position: 90 },
    ],
    status: 'deficient' as const,
    layers: [
      { value: 30, percentage: 33, color: '#75F5DB', height: 4, width: 66, borderRadius: 10 },
    ],
    educationalContent: {
      healthImpact: 'Vitamin C deficiency can lead to scurvy and weakened immune system.',
      recommendedSources: ['Citrus fruits', 'Bell peppers', 'Strawberries', 'Broccoli'],
      optimalRange: '90mg per day for adult men, 75mg for women',
    },
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('Enhanced Visualization Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock enhanced analysis service
    const mockServiceInstance = {
      calculateEnhancedComparison: jest.fn().mockResolvedValue(mockEnhancedComparisonData),
      categorizeSubstances: jest.fn().mockResolvedValue({
        macronutrients: [mockEnhancedComparisonData[0]],
        micronutrients: [mockEnhancedComparisonData[1]],
        harmfulSubstances: [],
        calories: [],
      }),
      calculateNutritionScore: jest.fn().mockResolvedValue({
        overall: 75,
        breakdown: {
          macronutrients: 85,
          micronutrients: 65,
          harmfulSubstances: 90,
        },
        recommendations: ['Increase Vitamin C intake', 'Maintain protein levels'],
      }),
    };
    MockedEnhancedAnalysisDataService.getInstance.mockReturnValue(mockServiceInstance as any);
  });

  it('should render enhanced comparison with layered progress bars', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <EnhancedComparisonDemoScreen />
    );

    await waitFor(() => {
      expect(getByText('Enhanced Comparison Demo')).toBeTruthy();
    });

    // Test layered progress bar rendering
    const proteinCard = getByTestId('enhanced-comparison-card-protein');
    expect(proteinCard).toBeTruthy();

    // Test substance name display
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('75')).toBeTruthy();
    expect(getByText('| g')).toBeTruthy();

    // Test reference indicators
    const referenceIndicator = getByTestId('reference-indicator-recommended');
    expect(referenceIndicator).toBeTruthy();
  });

  it('should handle interactive features correctly', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <EnhancedComparisonDemoScreen />
    );

    await waitFor(() => {
      const proteinCard = getByTestId('enhanced-comparison-card-protein');
      expect(proteinCard).toBeTruthy();
    });

    // Test tap interaction
    const proteinCard = getByTestId('enhanced-comparison-card-protein');
    fireEvent.press(proteinCard);

    await waitFor(() => {
      expect(getByText('Protein Details')).toBeTruthy();
      expect(getByText('Protein is essential for muscle building and repair.')).toBeTruthy();
    });

    // Test long press for tooltip
    fireEvent(proteinCard, 'onLongPress');

    await waitFor(() => {
      expect(getByTestId('nutrient-tooltip')).toBeTruthy();
    });
  });

  it('should display categorized comparison correctly', async () => {
    const mockAnalysisResults = [
      {
        foodId: '1',
        ingredients: ['ingredient1'],
        chemicalSubstances: [
          { name: 'Protein', category: 'good', amount: 75, mealType: 'breakfast' },
          { name: 'Vitamin C', category: 'good', amount: 30, mealType: 'breakfast' },
        ],
      },
    ];

    const { getByTestId, getByText } = renderWithProviders(
      <CategorizedComparisonScreen route={{ params: { analysisResults: mockAnalysisResults } }} />
    );

    await waitFor(() => {
      expect(getByText('Categorized Comparison')).toBeTruthy();
    });

    // Test category sections
    expect(getByText('Macronutrients')).toBeTruthy();
    expect(getByText('Micronutrients')).toBeTruthy();

    // Test category expansion
    const macronutrientSection = getByTestId('category-section-macronutrients');
    fireEvent.press(macronutrientSection);

    await waitFor(() => {
      expect(getByTestId('enhanced-comparison-card-protein')).toBeTruthy();
    });

    // Test micronutrient section
    const micronutrientSection = getByTestId('category-section-micronutrients');
    fireEvent.press(micronutrientSection);

    await waitFor(() => {
      expect(getByTestId('enhanced-comparison-card-vitamin-c')).toBeTruthy();
    });
  });

  it('should display nutrition score widget', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CategorizedComparisonScreen route={{ params: { analysisResults: [] } }} />
    );

    await waitFor(() => {
      expect(getByTestId('nutrition-score-widget')).toBeTruthy();
    });

    // Test overall score display
    expect(getByText('75')).toBeTruthy();
    expect(getByText('Overall Score')).toBeTruthy();

    // Test breakdown scores
    expect(getByText('Macronutrients: 85')).toBeTruthy();
    expect(getByText('Micronutrients: 65')).toBeTruthy();
    expect(getByText('Harmful Substances: 90')).toBeTruthy();

    // Test recommendations
    expect(getByText('Increase Vitamin C intake')).toBeTruthy();
    expect(getByText('Maintain protein levels')).toBeTruthy();
  });

  it('should handle different substance statuses correctly', async () => {
    const mockDataWithDifferentStatuses = [
      { ...mockEnhancedComparisonData[0], status: 'optimal' as const },
      { ...mockEnhancedComparisonData[1], status: 'deficient' as const },
      {
        ...mockEnhancedComparisonData[0],
        substance: 'Sodium',
        status: 'excess' as const,
        consumed: 3000,
        unit: 'mg',
      },
    ];

    const mockServiceInstance = {
      calculateEnhancedComparison: jest.fn().mockResolvedValue(mockDataWithDifferentStatuses),
      categorizeSubstances: jest.fn().mockResolvedValue({
        macronutrients: [mockDataWithDifferentStatuses[0], mockDataWithDifferentStatuses[2]],
        micronutrients: [mockDataWithDifferentStatuses[1]],
        harmfulSubstances: [],
        calories: [],
      }),
    };
    MockedEnhancedAnalysisDataService.getInstance.mockReturnValue(mockServiceInstance as any);

    const { getByTestId } = renderWithProviders(
      <EnhancedComparisonDemoScreen />
    );

    await waitFor(() => {
      // Test optimal status styling
      const optimalCard = getByTestId('enhanced-comparison-card-protein');
      expect(optimalCard).toBeTruthy();

      // Test deficient status styling
      const deficientCard = getByTestId('enhanced-comparison-card-vitamin-c');
      expect(deficientCard).toBeTruthy();

      // Test excess status styling
      const excessCard = getByTestId('enhanced-comparison-card-sodium');
      expect(excessCard).toBeTruthy();
    });
  });

  it('should handle loading and error states', async () => {
    // Mock service to throw error
    const mockServiceInstance = {
      calculateEnhancedComparison: jest.fn().mockRejectedValue(new Error('Calculation failed')),
    };
    MockedEnhancedAnalysisDataService.getInstance.mockReturnValue(mockServiceInstance as any);

    const { getByTestId, getByText } = renderWithProviders(
      <EnhancedComparisonDemoScreen />
    );

    // Should show loading initially
    expect(getByTestId('loading-spinner')).toBeTruthy();

    // Should show error after failure
    await waitFor(() => {
      expect(getByText('Failed to load comparison data')).toBeTruthy();
    });

    // Should have retry button
    const retryButton = getByTestId('retry-button');
    expect(retryButton).toBeTruthy();

    // Test retry functionality
    fireEvent.press(retryButton);
    expect(mockServiceInstance.calculateEnhancedComparison).toHaveBeenCalledTimes(2);
  });

  it('should handle accessibility features', async () => {
    const { getByTestId } = renderWithProviders(
      <EnhancedComparisonDemoScreen />
    );

    await waitFor(() => {
      const proteinCard = getByTestId('enhanced-comparison-card-protein');
      expect(proteinCard).toBeTruthy();
    });

    // Test accessibility labels
    const proteinCard = getByTestId('enhanced-comparison-card-protein');
    expect(proteinCard.props.accessibilityLabel).toContain('Protein');
    expect(proteinCard.props.accessibilityLabel).toContain('75 grams');
    expect(proteinCard.props.accessibilityLabel).toContain('optimal');

    // Test accessibility hints
    expect(proteinCard.props.accessibilityHint).toContain('Tap for details');
  });
});