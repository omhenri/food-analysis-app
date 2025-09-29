import { 
  EnhancedComparisonData, 
  ReferenceValue, 
  ConsumptionLayer, 
  VisualizationConfig,
  EducationalContent 
} from '../models/types';
import { Colors } from '../constants/theme';

/**
 * Creates sample enhanced comparison data for testing the layered progress bars
 */
export const createSampleEnhancedComparisonData = (): EnhancedComparisonData[] => {
  const defaultVisualConfig: VisualizationConfig = {
    maxBarWidth: 300,
    barSpacing: 2,
    indicatorSize: 2,
    animationDuration: 800,
  };

  return [
    // Calories - showing excess consumption
    {
      substance: 'Calories',
      category: 'calorie',
      consumed: 2800,
      unit: 'cal',
      status: 'excess',
      referenceValues: [
        {
          type: 'recommended',
          value: 2000,
          color: Colors.referenceBlue,
          label: 'RDA',
          position: 71.4, // 2000/2800 * 100
        },
        {
          type: 'maximum',
          value: 2400,
          color: Colors.referencePink,
          label: 'Max',
          position: 85.7, // 2400/2800 * 100
        },
      ],
      layers: [
        {
          value: 2800,
          percentage: 100,
          color: Colors.enhancedPrimary,
          height: 4,
          width: 100,
          borderRadius: 10,
        },
        {
          value: 2400,
          percentage: 85.7,
          color: Colors.enhancedSecondary1,
          height: 4,
          width: 85.7,
          borderRadius: 10,
        },
        {
          value: 2000,
          percentage: 71.4,
          color: Colors.enhancedSecondary2,
          height: 4,
          width: 71.4,
          borderRadius: 10,
        },
      ],
      educationalContent: {
        healthImpact: 'Excess calorie intake may lead to weight gain and increased risk of metabolic disorders.',
        reductionTips: [
          'Reduce portion sizes',
          'Choose lower-calorie alternatives',
          'Increase physical activity',
        ],
      },
      visualConfig: defaultVisualConfig,
    },
    
    // Protein - showing optimal consumption
    {
      substance: 'Protein',
      category: 'macronutrient',
      consumed: 65,
      unit: 'g',
      status: 'optimal',
      referenceValues: [
        {
          type: 'minimum',
          value: 50,
          color: Colors.referenceBlue,
          label: 'Min',
          position: 76.9, // 50/65 * 100
        },
        {
          type: 'recommended',
          value: 60,
          color: Colors.referenceBlue,
          label: 'RDA',
          position: 92.3, // 60/65 * 100
        },
      ],
      layers: [
        {
          value: 65,
          percentage: 100,
          color: Colors.enhancedPrimary,
          height: 4,
          width: 100,
          borderRadius: 10,
        },
      ],
      educationalContent: {
        healthImpact: 'Adequate protein intake supports muscle maintenance and immune function.',
        recommendedSources: [
          'Lean meats',
          'Fish',
          'Legumes',
          'Dairy products',
        ],
      },
      visualConfig: defaultVisualConfig,
    },

    // Vitamin C - showing deficiency
    {
      substance: 'Vitamin C',
      category: 'micronutrient',
      consumed: 45,
      unit: 'mg',
      status: 'deficient',
      referenceValues: [
        {
          type: 'recommended',
          value: 90,
          color: Colors.referenceBlue,
          label: 'RDA',
          position: 200, // 90/45 * 100 (capped at reasonable display)
        },
        {
          type: 'upper_limit',
          value: 2000,
          color: Colors.referencePink,
          label: 'UL',
          position: 300, // Way beyond current consumption
        },
      ],
      layers: [
        {
          value: 45,
          percentage: 50, // 45/90 * 100
          color: Colors.enhancedPrimary,
          height: 4,
          width: 50,
          borderRadius: 10,
        },
      ],
      educationalContent: {
        healthImpact: 'Vitamin C deficiency can lead to weakened immune system and poor wound healing.',
        recommendedSources: [
          'Citrus fruits',
          'Bell peppers',
          'Strawberries',
          'Broccoli',
        ],
      },
      visualConfig: defaultVisualConfig,
    },

    // Sodium - showing excess (harmful substance)
    {
      substance: 'Sodium',
      category: 'harmful',
      consumed: 3200,
      unit: 'mg',
      status: 'excess',
      referenceValues: [
        {
          type: 'recommended',
          value: 2300,
          color: Colors.referenceBlue,
          label: 'Max',
          position: 71.9, // 2300/3200 * 100
        },
        {
          type: 'upper_limit',
          value: 2300,
          color: Colors.referencePink,
          label: 'Limit',
          position: 71.9,
        },
      ],
      layers: [
        {
          value: 3200,
          percentage: 100,
          color: Colors.enhancedPrimary,
          height: 4,
          width: 100,
          borderRadius: 10,
        },
        {
          value: 2300,
          percentage: 71.9,
          color: Colors.enhancedSecondary1,
          height: 4,
          width: 71.9,
          borderRadius: 10,
        },
      ],
      educationalContent: {
        healthImpact: 'Excess sodium intake increases risk of high blood pressure and cardiovascular disease.',
        reductionTips: [
          'Reduce processed foods',
          'Cook more meals at home',
          'Use herbs and spices instead of salt',
        ],
        safetyInformation: 'Daily sodium intake should not exceed 2300mg for healthy adults.',
      },
      visualConfig: defaultVisualConfig,
    },
  ];
};

/**
 * Utility function to calculate consumption layers based on consumed amount and reference values
 */
export const calculateConsumptionLayers = (
  consumed: number,
  referenceValues: ReferenceValue[]
): ConsumptionLayer[] => {
  const layers: ConsumptionLayer[] = [];
  
  // Sort reference values by value (ascending)
  const sortedRefs = [...referenceValues].sort((a, b) => a.value - b.value);
  
  // Main consumption layer (always 100% of consumed amount)
  layers.push({
    value: consumed,
    percentage: 100,
    color: Colors.enhancedPrimary,
    height: 4,
    width: 100,
    borderRadius: 10,
  });

  // Add secondary layers for reference values that are less than consumed
  const colors = [Colors.enhancedSecondary1, Colors.enhancedSecondary2];
  let colorIndex = 0;
  
  for (const ref of sortedRefs) {
    if (ref.value < consumed && colorIndex < colors.length) {
      layers.push({
        value: ref.value,
        percentage: (ref.value / consumed) * 100,
        color: colors[colorIndex],
        height: 4,
        width: (ref.value / consumed) * 100,
        borderRadius: 10,
      });
      colorIndex++;
    }
  }

  return layers;
};

/**
 * Utility function to calculate reference value positions
 */
export const calculateReferencePositions = (
  consumed: number,
  referenceValues: ReferenceValue[]
): ReferenceValue[] => {
  return referenceValues.map(ref => ({
    ...ref,
    position: Math.min((ref.value / Math.max(consumed, ref.value)) * 100, 100),
  }));
};