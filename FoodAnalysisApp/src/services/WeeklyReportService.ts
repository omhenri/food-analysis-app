import { DatabaseService } from './DatabaseService';
import { AnalysisDataService } from './AnalysisDataService';
import { AnalysisServiceManager } from './AnalysisServiceManager';
import { EnhancedAnalysisDataService } from './EnhancedAnalysisDataService';
import { 
  Week, 
  Day, 
  ComparisonData, 
  RecommendedIntake,
  ConsumptionStatus,
  EnhancedComparisonData,
  AnalysisResult
} from '../models/types';

export interface WeeklyReportData {
  week: Week;
  days: Day[];
  totalConsumption: { [substance: string]: number };
  weeklyRecommended: { [substance: string]: number };
  weeklyComparison: ComparisonData[];
  enhancedWeeklyComparison: EnhancedComparisonData[];
  dailyBreakdown: DailyConsumption[];
  summary: WeeklySummary;
  trendAnalysis: WeeklyTrendAnalysis;
  nutritionScore: WeeklyNutritionScore;
}

export interface DailyConsumption {
  day: Day;
  consumption: { [substance: string]: number };
  enhancedComparison: EnhancedComparisonData[];
  totalCalories: number;
  mealCount: number;
  nutritionScore: number;
}

export interface WeeklySummary {
  totalDays: number;
  daysWithData: number;
  averageCaloriesPerDay: number;
  topNutrients: { name: string; amount: number; percentage: number }[];
  nutritionScore: number; // 0-100 based on how well recommendations are met
  recommendations: string[];
}

export interface WeeklyTrendAnalysis {
  weekOverWeekComparison?: {
    previousWeek: Week;
    nutritionScoreChange: number;
    calorieChange: number;
    improvingNutrients: string[];
    decliningNutrients: string[];
  };
  consistencyScore: number; // 0-100 based on daily tracking consistency
  dailyVariation: {
    substance: string;
    averageDaily: number;
    standardDeviation: number;
    mostConsistentDays: number[];
    leastConsistentDays: number[];
  }[];
}

export interface WeeklyNutritionScore {
  overall: number;
  daily: { dayNumber: number; score: number }[];
  trend: 'improving' | 'declining' | 'stable';
  breakdown: {
    macronutrients: number;
    micronutrients: number;
    harmfulSubstances: number;
  };
  weeklyGoals: {
    achieved: string[];
    missed: string[];
    partiallyAchieved: string[];
  };
}

export class WeeklyReportService {
  private static instance: WeeklyReportService;
  private databaseService: DatabaseService;
  private analysisDataService: AnalysisDataService;
  private enhancedAnalysisDataService: EnhancedAnalysisDataService;
  private analysisService: AnalysisServiceManager;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.analysisDataService = AnalysisDataService.getInstance();
    this.enhancedAnalysisDataService = new EnhancedAnalysisDataService();
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

      // Calculate consumption data with enhanced analysis
      const { totalConsumption, dailyBreakdown } = await this.calculateEnhancedWeeklyConsumption(days);
      
      // Generate comparison data
      const weeklyComparison = this.calculateWeeklyComparison(totalConsumption, weeklyRecommended);
      
      // Generate enhanced weekly comparison with layered visualization
      const enhancedWeeklyComparison = await this.generateEnhancedWeeklyComparison(dailyBreakdown);
      
      // Generate trend analysis
      const trendAnalysis = await this.generateWeeklyTrendAnalysis(weekId, dailyBreakdown);
      
      // Generate weekly nutrition score
      const nutritionScore = await this.generateWeeklyNutritionScore(dailyBreakdown, enhancedWeeklyComparison);
      
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
        enhancedWeeklyComparison,
        dailyBreakdown,
        summary,
        trendAnalysis,
        nutritionScore,
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

  // Calculate enhanced weekly consumption from all days
  private async calculateEnhancedWeeklyConsumption(days: Day[]): Promise<{
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

        // Generate enhanced comparison for this day
        let enhancedComparison: EnhancedComparisonData[] = [];
        let nutritionScore = 0;
        
        if (dayAnalysis.length > 0) {
          try {
            enhancedComparison = await this.enhancedAnalysisDataService.calculateEnhancedComparison(dayAnalysis);
            const scoreData = await this.enhancedAnalysisDataService.calculateNutritionScore(enhancedComparison);
            nutritionScore = scoreData.overall;
          } catch (error) {
            console.error(`Failed to calculate enhanced comparison for day ${day.id}:`, error);
          }
        }

        dailyBreakdown.push({
          day,
          consumption: dayConsumption,
          enhancedComparison,
          totalCalories,
          mealCount,
          nutritionScore,
        });
      } catch (error) {
        console.error(`Failed to get analysis for day ${day.id}:`, error);
        // Add empty day data
        dailyBreakdown.push({
          day,
          consumption: {},
          enhancedComparison: [],
          totalCalories: 0,
          mealCount: 0,
          nutritionScore: 0,
        });
      }
    }

    return { totalConsumption, dailyBreakdown };
  }

  // Generate enhanced weekly comparison with layered visualization
  private async generateEnhancedWeeklyComparison(dailyBreakdown: DailyConsumption[]): Promise<EnhancedComparisonData[]> {
    try {
      // Collect all daily enhanced comparison data
      const dailyEnhancedData = dailyBreakdown
        .map(day => day.enhancedComparison)
        .filter(data => data.length > 0);

      if (dailyEnhancedData.length === 0) {
        return [];
      }

      // Calculate weekly totals using the enhanced analysis service
      const weeklyTotals = await this.enhancedAnalysisDataService.calculateWeeklyTotals(dailyEnhancedData);

      // Add daily breakdown overlay data to each weekly total
      const enhancedWeeklyData = weeklyTotals.map(weeklyData => {
        // Calculate daily breakdown for this substance
        const dailyValues = dailyBreakdown.map(day => {
          const substanceData = day.enhancedComparison.find(
            item => item.substance === weeklyData.substance
          );
          return {
            dayNumber: day.day.dayNumber,
            value: substanceData?.consumed || 0,
            status: substanceData?.status || 'deficient',
          };
        });

        // Add daily breakdown to the weekly data
        return {
          ...weeklyData,
          dailyBreakdown: dailyValues,
          weeklyAverage: weeklyData.consumed / 7,
          dailyVariation: this.calculateDailyVariation(dailyValues.map(d => d.value)),
        };
      });

      return enhancedWeeklyData;
    } catch (error) {
      console.error('Failed to generate enhanced weekly comparison:', error);
      return [];
    }
  }

  // Generate weekly trend analysis
  private async generateWeeklyTrendAnalysis(weekId: number, dailyBreakdown: DailyConsumption[]): Promise<WeeklyTrendAnalysis> {
    try {
      // Get previous week for comparison
      const previousWeek = await this.getPreviousWeek(weekId);
      let weekOverWeekComparison;

      if (previousWeek) {
        const previousWeekData = await this.generateWeeklyReport(previousWeek.id);
        
        // Calculate changes
        const currentNutritionScore = dailyBreakdown.reduce((sum, day) => sum + day.nutritionScore, 0) / dailyBreakdown.length;
        const previousNutritionScore = previousWeekData.nutritionScore.overall;
        const nutritionScoreChange = currentNutritionScore - previousNutritionScore;

        const currentCalories = dailyBreakdown.reduce((sum, day) => sum + day.totalCalories, 0) / dailyBreakdown.length;
        const previousCalories = previousWeekData.summary.averageCaloriesPerDay;
        const calorieChange = currentCalories - previousCalories;

        // Identify improving and declining nutrients
        const improvingNutrients: string[] = [];
        const decliningNutrients: string[] = [];

        // Compare substance statuses between weeks
        for (const currentSubstance of dailyBreakdown[0]?.enhancedComparison || []) {
          const previousSubstance = previousWeekData.enhancedWeeklyComparison.find(
            s => s.substance === currentSubstance.substance
          );
          
          if (previousSubstance) {
            const statusImprovement = this.compareNutritionalStatus(
              previousSubstance.status,
              currentSubstance.status
            );
            
            if (statusImprovement > 0) {
              improvingNutrients.push(currentSubstance.substance);
            } else if (statusImprovement < 0) {
              decliningNutrients.push(currentSubstance.substance);
            }
          }
        }

        weekOverWeekComparison = {
          previousWeek,
          nutritionScoreChange,
          calorieChange,
          improvingNutrients,
          decliningNutrients,
        };
      }

      // Calculate consistency score
      const daysWithData = dailyBreakdown.filter(day => day.mealCount > 0).length;
      const consistencyScore = (daysWithData / 7) * 100;

      // Calculate daily variation for key nutrients
      const dailyVariation = this.calculateNutrientVariations(dailyBreakdown);

      return {
        weekOverWeekComparison,
        consistencyScore,
        dailyVariation,
      };
    } catch (error) {
      console.error('Failed to generate weekly trend analysis:', error);
      return {
        consistencyScore: 0,
        dailyVariation: [],
      };
    }
  }

  // Generate weekly nutrition score with trend analysis
  private async generateWeeklyNutritionScore(
    dailyBreakdown: DailyConsumption[],
    enhancedWeeklyComparison: EnhancedComparisonData[]
  ): Promise<WeeklyNutritionScore> {
    try {
      // Calculate daily scores
      const dailyScores = dailyBreakdown.map(day => ({
        dayNumber: day.day.dayNumber,
        score: day.nutritionScore,
      }));

      // Calculate overall weekly score
      const overall = dailyScores.reduce((sum, day) => sum + day.score, 0) / dailyScores.length;

      // Determine trend
      const firstHalf = dailyScores.slice(0, 3).reduce((sum, day) => sum + day.score, 0) / 3;
      const secondHalf = dailyScores.slice(4, 7).reduce((sum, day) => sum + day.score, 0) / 3;
      const trend = secondHalf > firstHalf + 5 ? 'improving' : 
                   secondHalf < firstHalf - 5 ? 'declining' : 'stable';

      // Calculate breakdown scores
      const breakdown = {
        macronutrients: this.calculateCategoryScore(enhancedWeeklyComparison, 'macronutrient'),
        micronutrients: this.calculateCategoryScore(enhancedWeeklyComparison, 'micronutrient'),
        harmfulSubstances: this.calculateCategoryScore(enhancedWeeklyComparison, 'harmful'),
      };

      // Determine weekly goals achievement
      const weeklyGoals = this.assessWeeklyGoals(enhancedWeeklyComparison);

      return {
        overall: Math.round(overall),
        daily: dailyScores,
        trend,
        breakdown,
        weeklyGoals,
      };
    } catch (error) {
      console.error('Failed to generate weekly nutrition score:', error);
      return {
        overall: 0,
        daily: [],
        trend: 'stable',
        breakdown: {
          macronutrients: 0,
          micronutrients: 0,
          harmfulSubstances: 0,
        },
        weeklyGoals: {
          achieved: [],
          missed: [],
          partiallyAchieved: [],
        },
      };
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

    // Include consumed substances not in recommendations
    Object.keys(totalConsumption).forEach(substance => {
      if (!weeklyRecommended[substance]) {
        comparisonData.push({
          substance: substance.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          consumed: totalConsumption[substance],
          recommended: 0,
          percentage: 0,
          status: 'neutral' as ConsumptionStatus,
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

  // Helper methods for enhanced weekly analysis

  private async getPreviousWeek(currentWeekId: number): Promise<Week | null> {
    try {
      const allWeeks = await this.databaseService.getAllWeeks();
      const currentWeek = allWeeks.find(w => w.id === currentWeekId);
      
      if (!currentWeek) return null;
      
      return allWeeks.find(w => w.weekNumber === currentWeek.weekNumber - 1) || null;
    } catch (error) {
      console.error('Failed to get previous week:', error);
      return null;
    }
  }

  private calculateDailyVariation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private compareNutritionalStatus(
    previousStatus: 'deficient' | 'optimal' | 'acceptable' | 'excess',
    currentStatus: 'deficient' | 'optimal' | 'acceptable' | 'excess'
  ): number {
    const statusValues = {
      'deficient': 1,
      'acceptable': 2,
      'optimal': 3,
      'excess': 0, // Excess is worst for most nutrients
    };

    return statusValues[currentStatus] - statusValues[previousStatus];
  }

  private calculateNutrientVariations(dailyBreakdown: DailyConsumption[]): WeeklyTrendAnalysis['dailyVariation'] {
    const variations: WeeklyTrendAnalysis['dailyVariation'] = [];
    
    // Get all unique substances
    const allSubstances = new Set<string>();
    dailyBreakdown.forEach(day => {
      day.enhancedComparison.forEach(substance => {
        allSubstances.add(substance.substance);
      });
    });

    // Calculate variation for each substance
    allSubstances.forEach(substanceName => {
      const dailyValues = dailyBreakdown.map(day => {
        const substance = day.enhancedComparison.find(s => s.substance === substanceName);
        return substance?.consumed || 0;
      });

      const averageDaily = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
      const standardDeviation = this.calculateDailyVariation(dailyValues);

      // Find most and least consistent days
      const deviations = dailyValues.map((val, index) => ({
        dayNumber: index + 1,
        deviation: Math.abs(val - averageDaily),
      }));

      deviations.sort((a, b) => a.deviation - b.deviation);
      
      const mostConsistentDays = deviations.slice(0, 3).map(d => d.dayNumber);
      const leastConsistentDays = deviations.slice(-3).map(d => d.dayNumber);

      variations.push({
        substance: substanceName,
        averageDaily,
        standardDeviation,
        mostConsistentDays,
        leastConsistentDays,
      });
    });

    return variations;
  }

  private calculateCategoryScore(
    enhancedWeeklyComparison: EnhancedComparisonData[],
    category: 'macronutrient' | 'micronutrient' | 'harmful' | 'calorie'
  ): number {
    const categorySubstances = enhancedWeeklyComparison.filter(s => s.category === category);
    
    if (categorySubstances.length === 0) return 0;

    const totalScore = categorySubstances.reduce((sum, substance) => {
      switch (substance.status) {
        case 'optimal': return sum + 100;
        case 'acceptable': return sum + 80;
        case 'deficient': return sum + 40;
        case 'excess': return sum + (category === 'harmful' ? 20 : 60);
        default: return sum;
      }
    }, 0);

    return Math.round(totalScore / categorySubstances.length);
  }

  private assessWeeklyGoals(enhancedWeeklyComparison: EnhancedComparisonData[]): WeeklyNutritionScore['weeklyGoals'] {
    const achieved: string[] = [];
    const missed: string[] = [];
    const partiallyAchieved: string[] = [];

    enhancedWeeklyComparison.forEach(substance => {
      switch (substance.status) {
        case 'optimal':
          achieved.push(substance.substance);
          break;
        case 'acceptable':
          partiallyAchieved.push(substance.substance);
          break;
        case 'deficient':
        case 'excess':
          missed.push(substance.substance);
          break;
      }
    });

    return {
      achieved,
      missed,
      partiallyAchieved,
    };
  }
}