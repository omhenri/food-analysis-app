import { DatabaseService } from './DatabaseService';
import { AnalysisDataService } from './AnalysisDataService';
import { AnalysisServiceManager } from './AnalysisServiceManager';
import { 
  Week, 
  Day, 
  ComparisonData, 
  RecommendedIntake,
  ConsumptionStatus 
} from '../models/types';

export interface WeeklyReportData {
  week: Week;
  days: Day[];
  totalConsumption: { [substance: string]: number };
  weeklyRecommended: { [substance: string]: number };
  weeklyComparison: ComparisonData[];
  dailyBreakdown: DailyConsumption[];
  summary: WeeklySummary;
}

export interface DailyConsumption {
  day: Day;
  consumption: { [substance: string]: number };
  totalCalories: number;
  mealCount: number;
}

export interface WeeklySummary {
  totalDays: number;
  daysWithData: number;
  averageCaloriesPerDay: number;
  topNutrients: { name: string; amount: number; percentage: number }[];
  nutritionScore: number; // 0-100 based on how well recommendations are met
  recommendations: string[];
}

export class WeeklyReportService {
  private static instance: WeeklyReportService;
  private databaseService: DatabaseService;
  private analysisDataService: AnalysisDataService;
  private analysisService: AnalysisServiceManager;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.analysisDataService = AnalysisDataService.getInstance();
    this.analysisService = AnalysisServiceManager.getInstance();
  }

  public static getInstance(): WeeklyReportService {
    if (!WeeklyReportService.instance) {
      WeeklyReportService.instance = new WeeklyReportService();
    }
    return WeeklyReportService.instance;
  }

  // Generate complete weekly report
  public async generateWeeklyReport(weekId: number): Promise<WeeklyReportData> {
    try {
      // Get week and days data
      const week = await this.getWeekById(weekId);
      const days = await this.databaseService.getDaysForWeek(weekId);
      
      if (!week) {
        throw new Error(`Week with ID ${weekId} not found`);
      }

      // Get recommended intake
      const dailyRecommended = await this.analysisService.getRecommendedIntake();
      const weeklyRecommended = this.calculateWeeklyRecommended(dailyRecommended);

      // Calculate consumption data
      const { totalConsumption, dailyBreakdown } = await this.calculateWeeklyConsumption(days);
      
      // Generate comparison data
      const weeklyComparison = this.calculateWeeklyComparison(totalConsumption, weeklyRecommended);
      
      // Generate summary
      const summary = this.generateWeeklySummary(
        days,
        dailyBreakdown,
        weeklyComparison,
        weeklyRecommended
      );

      return {
        week,
        days,
        totalConsumption,
        weeklyRecommended,
        weeklyComparison,
        dailyBreakdown,
        summary,
      };
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
      throw new Error(`Failed to generate weekly report: ${error}`);
    }
  }

  // Get week by ID
  private async getWeekById(weekId: number): Promise<Week | null> {
    try {
      const weeks = await this.databaseService.getAllWeeks();
      return weeks.find(week => week.id === weekId) || null;
    } catch (error) {
      console.error('Failed to get week by ID:', error);
      return null;
    }
  }

  // Calculate weekly recommended intake (daily * 7)
  private calculateWeeklyRecommended(dailyRecommended: RecommendedIntake): RecommendedIntake {
    const weeklyRecommended: RecommendedIntake = {};
    
    Object.keys(dailyRecommended).forEach(substance => {
      weeklyRecommended[substance] = dailyRecommended[substance] * 7;
    });

    return weeklyRecommended;
  }

  // Calculate weekly consumption from all days
  private async calculateWeeklyConsumption(days: Day[]): Promise<{
    totalConsumption: { [substance: string]: number };
    dailyBreakdown: DailyConsumption[];
  }> {
    const totalConsumption: { [substance: string]: number } = {};
    const dailyBreakdown: DailyConsumption[] = [];

    for (const day of days) {
      try {
        const dayAnalysis = await this.analysisDataService.getAnalysisForDay(day.id);
        const dayConsumption: { [substance: string]: number } = {};
        let totalCalories = 0;
        let mealCount = 0;

        dayAnalysis.forEach(result => {
          mealCount++;
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

            // Estimate calories (rough calculation)
            if (key === 'carbohydrates') {
              totalCalories += substance.amount * 4; // 4 cal/g
            } else if (key === 'protein') {
              totalCalories += substance.amount * 4; // 4 cal/g
            } else if (key === 'fat') {
              totalCalories += substance.amount * 9; // 9 cal/g
            }
          });
        });

        dailyBreakdown.push({
          day,
          consumption: dayConsumption,
          totalCalories,
          mealCount,
        });
      } catch (error) {
        console.error(`Failed to get analysis for day ${day.id}:`, error);
        // Add empty day data
        dailyBreakdown.push({
          day,
          consumption: {},
          totalCalories: 0,
          mealCount: 0,
        });
      }
    }

    return { totalConsumption, dailyBreakdown };
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
        unit: 'grams',
      });
    });

    // Include consumed substances not in recommendations
    Object.keys(totalConsumption).forEach(substance => {
      if (!weeklyRecommended[substance]) {
        comparisonData.push({
          substance: substance.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          consumed: totalConsumption[substance],
          recommended: 0,
          percentage: 0,
          status: 'neutral' as ConsumptionStatus,
          unit: 'grams',
        });
      }
    });

    return comparisonData.sort((a, b) => a.substance.localeCompare(b.substance));
  }

  // Generate weekly summary
  private generateWeeklySummary(
    days: Day[],
    dailyBreakdown: DailyConsumption[],
    weeklyComparison: ComparisonData[],
    weeklyRecommended: RecommendedIntake
  ): WeeklySummary {
    const daysWithData = dailyBreakdown.filter(day => day.mealCount > 0).length;
    const totalCalories = dailyBreakdown.reduce((sum, day) => sum + day.totalCalories, 0);
    const averageCaloriesPerDay = daysWithData > 0 ? totalCalories / daysWithData : 0;

    // Calculate top nutrients (by amount consumed)
    const topNutrients = weeklyComparison
      .filter(item => item.consumed > 0)
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, 5)
      .map(item => ({
        name: item.substance,
        amount: item.consumed,
        percentage: item.percentage,
      }));

    // Calculate nutrition score (0-100)
    const optimalCount = weeklyComparison.filter(item => item.status === 'optimal').length;
    const totalNutrients = weeklyComparison.length;
    const nutritionScore = totalNutrients > 0 ? Math.round((optimalCount / totalNutrients) * 100) : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(weeklyComparison, daysWithData);

    return {
      totalDays: days.length,
      daysWithData,
      averageCaloriesPerDay: Math.round(averageCaloriesPerDay),
      topNutrients,
      nutritionScore,
      recommendations,
    };
  }

  // Generate personalized recommendations
  private generateRecommendations(
    weeklyComparison: ComparisonData[],
    daysWithData: number
  ): string[] {
    const recommendations: string[] = [];

    // Check for deficiencies
    const deficiencies = weeklyComparison.filter(item => 
      item.status === 'under' && item.recommended > 0
    );

    if (deficiencies.length > 0) {
      const topDeficiency = deficiencies.sort((a, b) => 
        (a.percentage - b.percentage)
      )[0];
      
      recommendations.push(
        `Increase ${topDeficiency.substance.toLowerCase()} intake - you're at ${Math.round(topDeficiency.percentage)}% of recommended levels`
      );
    }

    // Check for excesses
    const excesses = weeklyComparison.filter(item => 
      item.status === 'over' && item.recommended > 0
    );

    if (excesses.length > 0) {
      const topExcess = excesses.sort((a, b) => 
        (b.percentage - a.percentage)
      )[0];
      
      recommendations.push(
        `Consider reducing ${topExcess.substance.toLowerCase()} - you're at ${Math.round(topExcess.percentage)}% of recommended levels`
      );
    }

    // Consistency recommendations
    if (daysWithData < 7) {
      recommendations.push(
        `Try to track your food more consistently - you logged ${daysWithData} out of 7 days this week`
      );
    }

    // General recommendations
    const optimalCount = weeklyComparison.filter(item => item.status === 'optimal').length;
    if (optimalCount >= weeklyComparison.length * 0.8) {
      recommendations.push('Great job! You\'re meeting most of your nutritional goals');
    } else if (optimalCount >= weeklyComparison.length * 0.6) {
      recommendations.push('Good progress! Focus on balancing a few more nutrients');
    } else {
      recommendations.push('Consider consulting a nutritionist for personalized dietary advice');
    }

    return recommendations.slice(0, 3); // Limit to 3 recommendations
  }

  // Check if weekly report is available
  public async isWeeklyReportAvailable(weekId: number): Promise<boolean> {
    try {
      const days = await this.databaseService.getDaysForWeek(weekId);
      return days.length >= 7;
    } catch (error) {
      console.error('Failed to check weekly report availability:', error);
      return false;
    }
  }

  // Get all available weeks for reports
  public async getAvailableWeeks(): Promise<Week[]> {
    try {
      const allWeeks = await this.databaseService.getAllWeeks();
      const availableWeeks: Week[] = [];

      for (const week of allWeeks) {
        const isAvailable = await this.isWeeklyReportAvailable(week.id);
        if (isAvailable) {
          availableWeeks.push(week);
        }
      }

      return availableWeeks;
    } catch (error) {
      console.error('Failed to get available weeks:', error);
      return [];
    }
  }
}