// Enum types for meal types and portion sizes
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type PortionSize = '1/1' | '1/2' | '1/3' | '1/4' | '1/8';
export type ChemicalCategory = 'good' | 'bad' | 'neutral';
export type ConsumptionStatus = 'under' | 'optimal' | 'over';

// Week Model
export interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

// Day Model
export interface Day {
  id: number;
  weekId: number;
  dayNumber: number; // 1-7 (Monday-Sunday)
  date: string;
  createdAt: string;
}

// Food Item Model
export interface FoodItem {
  id: string;
  name: string;
  mealType: MealType;
  portion: PortionSize;
}

// Food Entry Model (for database storage)
export interface FoodEntry {
  id?: number;
  dayId: number;
  foodName: string;
  mealType: MealType;
  portion: PortionSize;
  createdAt?: string;
}

// Chemical Substance Model
export interface ChemicalSubstance {
  name: string;
  category: ChemicalCategory;
  amount: number; // in grams
  mealType: string;
}

// Analysis Result Model
export interface AnalysisResult {
  id?: number;
  foodEntryId: number;
  foodId: string;
  ingredients: string[];
  ingredientDetails?: Array<{
    name: string;
    portion_percent: number;
  }>;
  chemicalSubstances: ChemicalSubstance[];
  analyzedAt?: string;
  // Additional fields for comprehensive analysis
  servingInfo?: {
    description: string;
    grams: number;
  };
  detailedNutrients?: {
    [nutrientKey: string]: {
      full_name: string;
      class: string;
      impact: 'positive' | 'neutral' | 'negative';
      total_g: number;
      by_ingredient: Array<{
        ingredient: string;
        grams: number;
        percent_of_chemical: number;
      }>;
    };
  };
}

// Comparison Data Model
export interface ComparisonData {
  substance: string;
  consumed: number;
  recommended: number;
  percentage: number;
  status: ConsumptionStatus;
  unit: string;
}

// Enhanced Comparison Data Model for sophisticated visualization
export interface EnhancedComparisonData {
  substance: string;
  category: 'macronutrient' | 'micronutrient' | 'harmful' | 'calorie';
  consumed: number;
  unit: string;
  referenceValues: ReferenceValue[];
  status: 'deficient' | 'optimal' | 'acceptable' | 'excess';
  layers: ConsumptionLayer[];
  educationalContent: EducationalContent;
  visualConfig: VisualizationConfig;
}

// Reference Value Model for enhanced visualization
export interface ReferenceValue {
  type: 'recommended' | 'minimum' | 'maximum' | 'upper_limit';
  value: number;
  color: string;
  label: string;
  position: number; // percentage position on the bar
}

// Consumption Layer Model for layered progress bars
export interface ConsumptionLayer {
  value: number;
  percentage: number;
  color: string;
  height: number; // 4px for main, 2px for reference
  width: number; // calculated width based on percentage
  borderRadius: number; // 10px for rounded ends
}

// Visualization Configuration
export interface VisualizationConfig {
  maxBarWidth: number; // maximum width in pixels
  barSpacing: number; // vertical spacing between bars
  indicatorSize: number; // 2px for circular indicators
  animationDuration: number; // milliseconds
}

// Educational Content Model
export interface EducationalContent {
  healthImpact: string;
  recommendedSources?: string[];
  reductionTips?: string[];
  safetyInformation?: string;
  optimalRange?: string;
}

// Enhanced Comparison Data Model
export interface EnhancedComparisonData {
  substance: string;
  category: 'macronutrient' | 'micronutrient' | 'harmful' | 'calorie';
  consumed: number;
  unit: string;
  referenceValues: ReferenceValue[];
  status: 'deficient' | 'optimal' | 'acceptable' | 'excess';
  layers: ConsumptionLayer[];
  educationalContent: EducationalContent;
  visualConfig: VisualizationConfig;
  dailyBreakdown?: {
    dayNumber: number;
    value: number;
    status: 'deficient' | 'optimal' | 'acceptable' | 'excess';
  }[];
  weeklyAverage?: number;
  dailyVariation?: number;
}

// Recommended Intake Model
export interface RecommendedIntake {
  [substanceName: string]: number; // substance name -> recommended amount in grams
}

// Weekly Data Model
export interface WeeklyData {
  weekId: number;
  totalConsumption: { [substance: string]: number };
  recommendedIntake: { [substance: string]: number };
  comparisonData: ComparisonData[];
}

// Food Input Props
export interface FoodInputProps {
  onAddFood: (food: FoodItem) => void;
  onRemoveFood: (index: number) => void;
  foods: FoodItem[];
}

// App Error Model
export interface AppError {
  type: 'network' | 'database' | 'validation' | 'analysis';
  message: string;
  details?: string;
}