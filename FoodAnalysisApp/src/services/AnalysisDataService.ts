import { DatabaseService } from './DatabaseService';
import { FoodService } from './FoodService';
import { AnalysisServiceManager } from './AnalysisServiceManager';
import { 
  FoodItem, 
  AnalysisResult, 
  FoodEntry, 
  Day,
  RecommendedIntake,
  ComparisonData,
  ConsumptionStatus 
} from '../models/types';

export class AnalysisDataService {
  private static instance: AnalysisDataService;
  private databaseService: DatabaseService;
  private foodService: FoodService;
  private analysisService: AnalysisServiceManager;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.foodService = FoodService.getInstance();
    this.analysisService = AnalysisServiceManager.getInstance();
  }

  public static getInstance(): AnalysisDataService {
    if (!AnalysisDataService.instance) {
      AnalysisDataService.instance = new AnalysisDataService();
    }
    return AnalysisDataService.instance;
  }

  // Analyze foods and save results to database
  public async analyzeAndSaveFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    try {
      // First save the food entries
      const entryIds = await this.foodService.saveFoodItems(foods);
      
      // Perform AI analysis
      const analysisResults = await this.analysisService.analyzeFoods(foods);
      
      // Associate analysis results with database entry IDs and save
      const savedResults: AnalysisResult[] = [];
      for (let i = 0; i < analysisResults.length; i++) {
        const result = analysisResults[i];
        const entryId = entryIds[i];
        
        const resultWithEntryId: AnalysisResult = {
          ...result,
          foodEntryId: entryId,
        };
        
        await this.databaseService.saveAnalysisResult(resultWithEntryId);
        savedResults.push(resultWithEntryId);
      }
      
      return savedResults;
    } catch (error) {
      console.error('Failed to analyze and save foods:', error);
      throw new Error(`Failed to analyze and save foods: ${error}`);
    }
  }

  // Get analysis results for current day
  public async getCurrentDayAnalysis(): Promise<AnalysisResult[]> {
    try {
      const currentDay = await this.foodService.getCurrentDay();
      return await this.databaseService.getAnalysisForDay(currentDay.id);
    } catch (error) {
      console.error('Failed to get current day analysis:', error);
      throw new Error(`Failed to get current day analysis: ${error}`);
    }
  }

  // Get analysis results for a specific day
  public async getAnalysisForDay(dayId: number): Promise<AnalysisResult[]> {
    try {
      return await this.databaseService.getAnalysisForDay(dayId);
    } catch (error) {
      console.error('Failed to get analysis for day:', error);
      throw new Error(`Failed to get analysis for day: ${error}`);
    }
  }

  // Check if current day has analysis data
  public async hasCurrentDayAnalysis(): Promise<boolean> {
    try {
      const results = await this.getCurrentDayAnalysis();
      return results.length > 0;
    } catch (error) {
      console.error('Failed to check current day analysis:', error);
      return false;
    }
  }

  // Get comparison data for current day
  public async getCurrentDayComparison(): Promise<ComparisonData[]> {
    try {
      const analysisResults = await this.getCurrentDayAnalysis();

      // Extract nutrients consumed from analysis results
      const nutrientsConsumed = this.extractNutrientsConsumed(analysisResults);

      const recommendedIntake = await this.analysisService.getRecommendedIntake(nutrientsConsumed);

      return this.calculateComparison(analysisResults, recommendedIntake);
    } catch (error) {
      console.error('Failed to get current day comparison:', error);
      throw new Error(`Failed to get current day comparison: ${error}`);
    }
  }

  // Get comparison data for a specific day
  public async getComparisonForDay(dayId: number): Promise<ComparisonData[]> {
    try {
      const analysisResults = await this.getAnalysisForDay(dayId);

      // Extract nutrients consumed from analysis results
      const nutrientsConsumed = this.extractNutrientsConsumed(analysisResults);

      const recommendedIntake = await this.analysisService.getRecommendedIntake(nutrientsConsumed);

      return this.calculateComparison(analysisResults, recommendedIntake);
    } catch (error) {
      console.error('Failed to get comparison for day:', error);
      throw new Error(`Failed to get comparison for day: ${error}`);
    }
  }

  // Extract nutrients consumed from analysis results
  private extractNutrientsConsumed(analysisResults: AnalysisResult[]): Array<{name: string, total_amount: number, unit: string}> {
    const consumedAmounts: { [nutrient: string]: number } = {};

    // Aggregate consumed amounts by nutrient name (normalized)
    analysisResults.forEach(result => {
      result.chemicalSubstances.forEach(substance => {
        // Normalize nutrient names to match backend expectations
        const normalizedName = substance.name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/vitamin\s*c\b/, 'vitamin-c')
          .replace(/vitamin\s*d\b/, 'vitamin-d')
          .replace(/vitamin\s*a\b/, 'vitamin-a')
          .replace(/vitamin\s*e\b/, 'vitamin-e')
          .replace(/vitamin\s*k\b/, 'vitamin-k')
          .replace(/vitamin\s*b1\b/, 'vitamin-b1')
          .replace(/vitamin\s*b2\b/, 'vitamin-b2')
          .replace(/vitamin\s*b3\b/, 'vitamin-b3')
          .replace(/vitamin\s*b6\b/, 'vitamin-b6')
          .replace(/vitamin\s*b12\b/, 'vitamin-b12')
          .replace(/folic\s*acid/, 'folic-acid')
          .replace(/total\s*fat/, 'fat')
          .replace(/dietary\s*fiber/, 'fiber')
          .replace(/sugars/, 'sugar');

        if (consumedAmounts[normalizedName]) {
          consumedAmounts[normalizedName] += substance.amount;
        } else {
          consumedAmounts[normalizedName] = substance.amount;
        }
      });
    });

    // Convert to the expected format
    return Object.entries(consumedAmounts).map(([name, amount]) => ({
      name,
      total_amount: amount,
      unit: 'grams'
    }));
  }

  // Calculate comparison between consumed and recommended amounts
  private calculateComparison(
    analysisResults: AnalysisResult[],
    recommendedIntake: RecommendedIntake
  ): ComparisonData[] {
    // Aggregate consumed amounts by substance
    const consumedAmounts: { [substance: string]: number } = {};
    
    analysisResults.forEach(result => {
      result.chemicalSubstances.forEach(substance => {
        const key = substance.name.toLowerCase().replace(/\s+/g, '-');
        if (consumedAmounts[key]) {
          consumedAmounts[key] += substance.amount;
        } else {
          consumedAmounts[key] = substance.amount;
        }
      });
    });

    // Create comparison data
    const comparisonData: ComparisonData[] = [];
    
    // Compare consumed vs recommended for each substance
    Object.keys(recommendedIntake).forEach(substance => {
      const consumed = consumedAmounts[substance] || 0;
      const recommended = recommendedIntake[substance];
      const percentage = recommended > 0 ? (consumed / recommended) * 100 : 0;
      
      let status: ConsumptionStatus;
      if (percentage < 80) {
        status = 'under';
      } else if (percentage <= 120) {
        status = 'optimal';
      } else {
        status = 'over';
      }

      comparisonData.push({
        substance: substance.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        consumed,
        recommended,
        percentage,
        status,
      });
    });

    // Also include consumed substances not in recommended intake
    Object.keys(consumedAmounts).forEach(substance => {
      if (!recommendedIntake[substance]) {
        comparisonData.push({
          substance: substance.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          consumed: consumedAmounts[substance],
          recommended: 0,
          percentage: 0,
          status: 'neutral' as ConsumptionStatus,
        });
      }
    });

    return comparisonData.sort((a, b) => a.substance.localeCompare(b.substance));
  }

  // Get weekly analysis data
  public async getWeeklyAnalysis(weekId: number): Promise<{
    totalConsumption: { [substance: string]: number };
    weeklyComparison: ComparisonData[];
    dailyBreakdown: { dayNumber: number; dayId: number; consumption: { [substance: string]: number } }[];
  }> {
    try {
      const days = await this.databaseService.getDaysForWeek(weekId);

      // Get all nutrients consumed across the week for recommended intake
      const allAnalysisResults: AnalysisResult[] = [];
      for (const day of days) {
        const dayAnalysis = await this.getAnalysisForDay(day.id);
        allAnalysisResults.push(...dayAnalysis);
      }
      const nutrientsConsumed = this.extractNutrientsConsumed(allAnalysisResults);

      const recommendedIntake = await this.analysisService.getRecommendedIntake(nutrientsConsumed);
      
      // Calculate weekly recommended intake (daily * 7)
      const weeklyRecommended: RecommendedIntake = {};
      Object.keys(recommendedIntake).forEach(substance => {
        weeklyRecommended[substance] = recommendedIntake[substance] * 7;
      });

      const totalConsumption: { [substance: string]: number } = {};
      const dailyBreakdown: { dayNumber: number; dayId: number; consumption: { [substance: string]: number } }[] = [];

      // Process each day
      for (const day of days) {
        const dayAnalysis = await this.getAnalysisForDay(day.id);
        const dayConsumption: { [substance: string]: number } = {};

        dayAnalysis.forEach(result => {
          result.chemicalSubstances.forEach(substance => {
            const key = substance.name.toLowerCase().replace(/\s+/g, '-');
            
            // Add to daily consumption
            if (dayConsumption[key]) {
              dayConsumption[key] += substance.amount;
            } else {
              dayConsumption[key] = substance.amount;
            }

            // Add to total consumption
            if (totalConsumption[key]) {
              totalConsumption[key] += substance.amount;
            } else {
              totalConsumption[key] = substance.amount;
            }
          });
        });

        dailyBreakdown.push({
          dayNumber: day.dayNumber,
          dayId: day.id,
          consumption: dayConsumption,
        });
      }

      // Calculate weekly comparison
      const weeklyComparison = this.calculateWeeklyComparison(totalConsumption, weeklyRecommended);

      return {
        totalConsumption,
        weeklyComparison,
        dailyBreakdown,
      };
    } catch (error) {
      console.error('Failed to get weekly analysis:', error);
      throw new Error(`Failed to get weekly analysis: ${error}`);
    }
  }

  // Calculate weekly comparison
  private calculateWeeklyComparison(
    totalConsumption: { [substance: string]: number },
    weeklyRecommended: RecommendedIntake
  ): ComparisonData[] {
    const comparisonData: ComparisonData[] = [];

    // Compare consumed vs recommended for each substance
    Object.keys(weeklyRecommended).forEach(substance => {
      const consumed = totalConsumption[substance] || 0;
      const recommended = weeklyRecommended[substance];
      const percentage = recommended > 0 ? (consumed / recommended) * 100 : 0;
      
      let status: ConsumptionStatus;
      if (percentage < 80) {
        status = 'under';
      } else if (percentage <= 120) {
        status = 'optimal';
      } else {
        status = 'over';
      }

      comparisonData.push({
        substance: substance.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        consumed,
        recommended,
        percentage,
        status,
      });
    });

    return comparisonData.sort((a, b) => a.substance.localeCompare(b.substance));
  }

  // Clear analysis data for current day (for testing/reset)
  public async clearCurrentDayAnalysis(): Promise<void> {
    try {
      const currentDay = await this.foodService.getCurrentDay();
      console.log(`Would clear analysis data for day ${currentDay.id}`);
      // Implementation would require delete methods in DatabaseService
    } catch (error) {
      console.error('Failed to clear current day analysis:', error);
      throw new Error(`Failed to clear current day analysis: ${error}`);
    }
  }
}