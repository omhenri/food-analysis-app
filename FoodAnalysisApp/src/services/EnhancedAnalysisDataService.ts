import {
  AnalysisResult,
  EnhancedComparisonData,
  ReferenceValue,
  ConsumptionLayer,
  VisualizationConfig,
  EducationalContent,
  ChemicalSubstance,
} from '../models/types';
import { DatabaseService } from './DatabaseService';
import { Colors } from '../constants/theme';
import { calculateConsumptionLayers, calculateReferencePositions } from '../utils/enhancedComparisonUtils';

export interface NutritionScore {
  overall: number; // 0-100
  breakdown: {
    macronutrients: number;
    micronutrients: number;
    harmfulSubstances: number;
  };
  recommendations: string[];
}

export interface CategorizedSubstances {
  [category: string]: ChemicalSubstance[];
}

export interface OptimalRange {
  min: number;
  max: number;
  unit: string;
}

export class EnhancedAnalysisDataService {
  private databaseService: DatabaseService;
  private defaultVisualConfig: VisualizationConfig;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.defaultVisualConfig = {
      maxBarWidth: 300,
      barSpacing: 2,
      indicatorSize: 2,
      animationDuration: 800,
    };
  }

  /**
   * Calculate enhanced comparison data from analysis results
   */
  public async calculateEnhancedComparison(
    analysisResults: AnalysisResult[],
    age: number = 25,
    gender: string = 'all'
  ): Promise<EnhancedComparisonData[]> {
    try {
      // Aggregate chemical substances by name
      const aggregatedSubstances = this.aggregateChemicalSubstances(analysisResults);
      
      // Get all substances with their categories from database
      const substancesWithCategories = await this.databaseService.getSubstancesWithCategories();
      
      const enhancedData: EnhancedComparisonData[] = [];

      for (const [substanceName, totalAmount] of Object.entries(aggregatedSubstances)) {
        // Find category information
        const substanceInfo = substancesWithCategories.find(
          s => s.substance_name.toLowerCase() === substanceName.toLowerCase()
        );

        if (!substanceInfo) {
          console.warn(`No category information found for substance: ${substanceName}`);
          continue;
        }

        // Get reference values for this substance
        const referenceValues = await this.getReferenceValuesForSubstance(
          substanceName,
          '18-29',
          gender
        );

        if (referenceValues.length === 0) {
          console.warn(`No reference values found for substance: ${substanceName}`);
          continue;
        }

        // Calculate consumption layers
        const layers = calculateConsumptionLayers(totalAmount, referenceValues);
        
        // Calculate reference positions
        const positionedReferenceValues = calculateReferencePositions(totalAmount, referenceValues);

        // Determine status
        const status = this.determineNutritionalStatus(totalAmount, referenceValues, substanceInfo.type);

        // Get educational content
        const educationalContent = this.getEducationalContent(substanceName, status, substanceInfo.type);

        // Convert units if necessary
        const { displayValue, displayUnit } = this.convertToDisplayUnits(totalAmount, substanceInfo.default_unit);

        const enhancedComparisonData: EnhancedComparisonData = {
          substance: substanceName,
          category: substanceInfo.type as 'macronutrient' | 'micronutrient' | 'harmful' | 'calorie',
          consumed: displayValue,
          unit: displayUnit,
          referenceValues: positionedReferenceValues,
          status,
          layers,
          educationalContent,
          visualConfig: this.defaultVisualConfig,
        };

        enhancedData.push(enhancedComparisonData);
      }

      return enhancedData.sort((a, b) => {
        // Sort by category order, then by substance name
        const categoryOrder = { calorie: 1, macronutrient: 2, micronutrient: 3, harmful: 4 };
        const aOrder = categoryOrder[a.category] || 5;
        const bOrder = categoryOrder[b.category] || 5;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        return a.substance.localeCompare(b.substance);
      });
    } catch (error) {
      console.error('Failed to calculate enhanced comparison:', error);
      throw error;
    }
  }

  /**
   * Categorize substances by their type
   */
  public async categorizeSubstances(substances: ChemicalSubstance[]): Promise<CategorizedSubstances> {
    try {
      const substancesWithCategories = await this.databaseService.getSubstancesWithCategories();
      const categorized: CategorizedSubstances = {};

      for (const substance of substances) {
        const substanceInfo = substancesWithCategories.find(
          s => s.substance_name.toLowerCase() === substance.name.toLowerCase()
        );

        const category = substanceInfo?.type || 'unknown';
        
        if (!categorized[category]) {
          categorized[category] = [];
        }
        
        categorized[category].push(substance);
      }

      return categorized;
    } catch (error) {
      console.error('Failed to categorize substances:', error);
      throw error;
    }
  }

  /**
   * Calculate nutrition score based on comparison data
   */
  public async calculateNutritionScore(comparisonData: EnhancedComparisonData[]): Promise<NutritionScore> {
    const scores = {
      macronutrients: 0,
      micronutrients: 0,
      harmfulSubstances: 0,
    };

    const counts = {
      macronutrients: 0,
      micronutrients: 0,
      harmfulSubstances: 0,
    };

    const recommendations: string[] = [];

    for (const data of comparisonData) {
      let score = 0;
      
      switch (data.status) {
        case 'optimal':
          score = 100;
          break;
        case 'acceptable':
          score = 80;
          break;
        case 'deficient':
          score = 40;
          recommendations.push(`Increase ${data.substance} intake`);
          break;
        case 'excess':
          score = data.category === 'harmful' ? 20 : 60;
          recommendations.push(`Reduce ${data.substance} intake`);
          break;
      }

      if (data.category === 'macronutrient') {
        scores.macronutrients += score;
        counts.macronutrients++;
      } else if (data.category === 'micronutrient') {
        scores.micronutrients += score;
        counts.micronutrients++;
      } else if (data.category === 'harmful') {
        scores.harmfulSubstances += score;
        counts.harmfulSubstances++;
      }
    }

    // Calculate averages
    const breakdown = {
      macronutrients: counts.macronutrients > 0 ? scores.macronutrients / counts.macronutrients : 0,
      micronutrients: counts.micronutrients > 0 ? scores.micronutrients / counts.micronutrients : 0,
      harmfulSubstances: counts.harmfulSubstances > 0 ? scores.harmfulSubstances / counts.harmfulSubstances : 0,
    };

    // Calculate overall score (weighted average)
    const totalCategories = Object.values(counts).filter(count => count > 0).length;
    const overall = totalCategories > 0 
      ? (breakdown.macronutrients + breakdown.micronutrients + breakdown.harmfulSubstances) / totalCategories
      : 0;

    return {
      overall: Math.round(overall),
      breakdown: {
        macronutrients: Math.round(breakdown.macronutrients),
        micronutrients: Math.round(breakdown.micronutrients),
        harmfulSubstances: Math.round(breakdown.harmfulSubstances),
      },
      recommendations: recommendations.slice(0, 5), // Limit to top 5 recommendations
    };
  }

  /**
   * Calculate weekly totals from daily data
   */
  public async calculateWeeklyTotals(dailyData: EnhancedComparisonData[][]): Promise<EnhancedComparisonData[]> {
    const weeklyTotals: { [substance: string]: EnhancedComparisonData } = {};

    // Aggregate daily data
    for (const dayData of dailyData) {
      for (const substanceData of dayData) {
        if (!weeklyTotals[substanceData.substance]) {
          weeklyTotals[substanceData.substance] = {
            ...substanceData,
            consumed: 0,
          };
        }
        weeklyTotals[substanceData.substance].consumed += substanceData.consumed;
      }
    }

    // Recalculate reference values and layers for weekly totals
    const weeklyData: EnhancedComparisonData[] = [];
    
    for (const substanceData of Object.values(weeklyTotals)) {
      // Multiply daily reference values by 7 for weekly
      const weeklyReferenceValues = substanceData.referenceValues.map(ref => ({
        ...ref,
        value: ref.value * 7,
      }));

      // Recalculate layers and positions
      const layers = calculateConsumptionLayers(substanceData.consumed, weeklyReferenceValues);
      const positionedReferenceValues = calculateReferencePositions(substanceData.consumed, weeklyReferenceValues);
      
      // Determine weekly status
      const status = this.determineNutritionalStatus(
        substanceData.consumed, 
        weeklyReferenceValues, 
        substanceData.category
      );

      weeklyData.push({
        ...substanceData,
        referenceValues: positionedReferenceValues,
        layers,
        status,
      });
    }

    return weeklyData;
  }

  /**
   * Private helper methods
   */

  private aggregateChemicalSubstances(analysisResults: AnalysisResult[]): { [substanceName: string]: number } {
    const aggregated: { [substanceName: string]: number } = {};

    for (const result of analysisResults) {
      for (const substance of result.chemicalSubstances) {
        if (aggregated[substance.name]) {
          aggregated[substance.name] += substance.amount;
        } else {
          aggregated[substance.name] = substance.amount;
        }
      }
    }

    return aggregated;
  }

  private async getReferenceValuesForSubstance(
    substanceName: string,
    ageGroup: string,
    gender: string
  ): Promise<ReferenceValue[]> {
    const dbReferenceValues = await this.databaseService.getReferenceValues(substanceName, ageGroup, gender);
    
    return dbReferenceValues.map(ref => ({
      type: ref.type as 'recommended' | 'minimum' | 'maximum' | 'upper_limit',
      value: ref.value,
      color: ref.color,
      label: ref.label,
      position: 0, // Will be calculated later
    }));
  }

  private determineNutritionalStatus(
    consumed: number,
    referenceValues: ReferenceValue[],
    category: string
  ): 'deficient' | 'optimal' | 'acceptable' | 'excess' {
    const recommended = referenceValues.find(ref => ref.type === 'recommended');
    const minimum = referenceValues.find(ref => ref.type === 'minimum');
    const maximum = referenceValues.find(ref => ref.type === 'maximum');
    const upperLimit = referenceValues.find(ref => ref.type === 'upper_limit');

    if (category === 'harmful') {
      // For harmful substances, less is better
      if (upperLimit && consumed > upperLimit.value) {
        return 'excess';
      }
      if (recommended && consumed > recommended.value) {
        return 'excess';
      }
      return 'optimal';
    } else {
      // For beneficial nutrients
      if (upperLimit && consumed > upperLimit.value) {
        return 'excess';
      }
      if (maximum && consumed > maximum.value) {
        return 'excess';
      }
      
      const targetValue = recommended?.value || minimum?.value;
      if (targetValue) {
        if (consumed < targetValue * 0.8) {
          return 'deficient';
        }
        if (consumed >= targetValue * 0.8 && consumed <= targetValue * 1.2) {
          return 'optimal';
        }
        return 'acceptable';
      }
    }

    return 'acceptable';
  }

  private convertToDisplayUnits(value: number, unit: string): { displayValue: number; displayUnit: string } {
    switch (unit) {
      case 'g':
        if (value >= 1) {
          return { displayValue: Math.round(value * 10) / 10, displayUnit: 'g' };
        } else {
          return { displayValue: Math.round(value * 1000), displayUnit: 'mg' };
        }
      case 'mg':
        if (value >= 1000) {
          return { displayValue: Math.round(value / 100) / 10, displayUnit: 'g' };
        } else {
          return { displayValue: Math.round(value * 10) / 10, displayUnit: 'mg' };
        }
      case 'μg':
        if (value >= 1000) {
          return { displayValue: Math.round(value / 100) / 10, displayUnit: 'mg' };
        } else {
          return { displayValue: Math.round(value * 10) / 10, displayUnit: 'μg' };
        }
      case 'cal':
        return { displayValue: Math.round(value), displayUnit: 'cal' };
      default:
        return { displayValue: Math.round(value * 10) / 10, displayUnit: unit };
    }
  }

  private getEducationalContent(
    substanceName: string,
    status: 'deficient' | 'optimal' | 'acceptable' | 'excess',
    category: string
  ): EducationalContent {
    const educationalData: { [key: string]: EducationalContent } = {
      'Calories': {
        healthImpact: status === 'excess' 
          ? 'Excess calorie intake may lead to weight gain and increased risk of metabolic disorders.'
          : status === 'deficient'
          ? 'Insufficient calorie intake may lead to fatigue, nutrient deficiencies, and muscle loss.'
          : 'Balanced calorie intake supports healthy weight maintenance and energy levels.',
        recommendedSources: ['Whole grains', 'Lean proteins', 'Healthy fats', 'Fruits and vegetables'],
        reductionTips: status === 'excess' ? ['Reduce portion sizes', 'Choose lower-calorie alternatives', 'Increase physical activity'] : undefined,
      },
      'Protein': {
        healthImpact: status === 'deficient'
          ? 'Protein deficiency can lead to muscle loss, weakened immune system, and poor wound healing.'
          : 'Adequate protein intake supports muscle maintenance, immune function, and tissue repair.',
        recommendedSources: ['Lean meats', 'Fish', 'Eggs', 'Legumes', 'Dairy products', 'Nuts and seeds'],
      },
      'Vitamin C': {
        healthImpact: status === 'deficient'
          ? 'Vitamin C deficiency can lead to weakened immune system, poor wound healing, and fatigue.'
          : 'Adequate vitamin C supports immune function, collagen synthesis, and antioxidant protection.',
        recommendedSources: ['Citrus fruits', 'Bell peppers', 'Strawberries', 'Broccoli', 'Kiwi'],
      },
      'Sodium': {
        healthImpact: status === 'excess'
          ? 'Excess sodium intake increases risk of high blood pressure, heart disease, and stroke.'
          : 'Moderate sodium intake is necessary for fluid balance and nerve function.',
        reductionTips: status === 'excess' ? ['Reduce processed foods', 'Cook more meals at home', 'Use herbs and spices instead of salt'] : undefined,
        safetyInformation: 'Daily sodium intake should not exceed 2300mg for healthy adults.',
      },
    };

    return educationalData[substanceName] || {
      healthImpact: `${substanceName} plays an important role in maintaining good health.`,
      recommendedSources: ['Consult with a healthcare provider for specific recommendations'],
    };
  }

  private determineOptimalRanges(substance: string, category: string): OptimalRange {
    // This would typically come from nutritional databases
    // For now, return default ranges based on category
    switch (category) {
      case 'calorie':
        return { min: 1800, max: 2500, unit: 'cal' };
      case 'macronutrient':
        if (substance.toLowerCase().includes('protein')) {
          return { min: 46, max: 100, unit: 'g' };
        }
        return { min: 0, max: 100, unit: 'g' };
      case 'micronutrient':
        return { min: 0, max: 1000, unit: 'mg' };
      case 'harmful':
        return { min: 0, max: 50, unit: 'mg' };
      default:
        return { min: 0, max: 100, unit: 'g' };
    }
  }
}