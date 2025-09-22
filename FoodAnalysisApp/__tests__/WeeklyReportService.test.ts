import { WeeklyReportService } from '../src/services/WeeklyReportService';
import { DatabaseService } from '../src/services/DatabaseService';
import { AnalysisDataService } from '../src/services/AnalysisDataService';
import { AnalysisServiceManager } from '../src/services/AnalysisServiceManager';
import { Week, Day, AnalysisResult, ChemicalSubstance, RecommendedIntake } from '../src/models/types';

// Mock the dependencies
jest.mock('../src/services/DatabaseService');
jest.mock('../src/services/AnalysisDataService');
jest.mock('../src/services/AnalysisServiceManager');

const mockDatabaseService = DatabaseService.getInstance as jest.MockedFunction<typeof DatabaseService.getInstance>;
const mockAnalysisDataService = AnalysisDataService.getInstance as jest.MockedFunction<typeof AnalysisDataService.getInstance>;
const mockAnalysisServiceManager = AnalysisServiceManager.getInstance as jest.MockedFunction<typeof AnalysisServiceManager.getInstance>;

describe('WeeklyReportService', () => {
  let weeklyReportService: WeeklyReportService;
  let mockDbService: any;
  let mockAnalysisService: any;
  let mockAnalysisManager: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockDbService = {
      getAllWeeks: jest.fn(),
      getDaysForWeek: jest.fn(),
    };

    mockAnalysisService = {
      getAnalysisForDay: jest.fn(),
    };

    mockAnalysisManager = {
      getRecommendedIntake: jest.fn(),
    };

    // Setup mock returns
    mockDatabaseService.mockReturnValue(mockDbService);
    mockAnalysisDataService.mockReturnValue(mockAnalysisService);
    mockAnalysisServiceManager.mockReturnValue(mockAnalysisManager);

    weeklyReportService = WeeklyReportService.getInstance();
  });

  describe('generateWeeklyReport', () => {
    const mockWeek: Week = {
      id: 1,
      weekNumber: 1,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockDays: Day[] = [
      {
        id: 1,
        weekId: 1,
        dayNumber: 1,
        date: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        weekId: 1,
        dayNumber: 2,
        date: '2024-01-02',
        createdAt: '2024-01-02T00:00:00Z',
      },
      {
        id: 3,
        weekId: 1,
        dayNumber: 3,
        date: '2024-01-03',
        createdAt: '2024-01-03T00:00:00Z',
      },
    ];

    const mockChemicalSubstances: ChemicalSubstance[] = [
      {
        name: 'Protein',
        category: 'good',
        amount: 25.5,
        mealType: 'breakfast',
      },
      {
        name: 'Carbohydrates',
        category: 'neutral',
        amount: 45.2,
        mealType: 'breakfast',
      },
      {
        name: 'Fat',
        category: 'neutral',
        amount: 12.8,
        mealType: 'breakfast',
      },
    ];

    const mockAnalysisResults: AnalysisResult[] = [
      {
        id: 1,
        foodEntryId: 1,
        foodId: 'oatmeal',
        ingredients: ['oats', 'milk', 'banana'],
        chemicalSubstances: mockChemicalSubstances,
        analyzedAt: '2024-01-01T08:00:00Z',
      },
    ];

    const mockRecommendedIntake: RecommendedIntake = {
      protein: 50, // 50g per day
      carbohydrates: 300, // 300g per day
      fat: 65, // 65g per day
    };

    beforeEach(() => {
      mockDbService.getAllWeeks.mockResolvedValue([mockWeek]);
      mockDbService.getDaysForWeek.mockResolvedValue(mockDays);
      mockAnalysisService.getAnalysisForDay.mockResolvedValue(mockAnalysisResults);
      mockAnalysisManager.getRecommendedIntake.mockResolvedValue(mockRecommendedIntake);
    });

    it('should generate complete weekly report with correct data aggregation', async () => {
      const result = await weeklyReportService.generateWeeklyReport(1);

      expect(result).toBeDefined();
      expect(result.week).toEqual(mockWeek);
      expect(result.days).toEqual(mockDays);

      // Check total consumption aggregation
      expect(result.totalConsumption).toEqual({
        protein: 25.5 * 3, // 3 days with same data
        carbohydrates: 45.2 * 3,
        fat: 12.8 * 3,
      });

      // Check weekly recommended intake (daily * 7)
      expect(result.weeklyRecommended).toEqual({
        protein: 350, // 50 * 7
        carbohydrates: 2100, // 300 * 7
        fat: 455, // 65 * 7
      });

      // Check comparison data
      expect(result.weeklyComparison).toHaveLength(3);
      expect(result.weeklyComparison[0].substance).toBe('Carbohydrates');
      expect(result.weeklyComparison[1].substance).toBe('Fat');
      expect(result.weeklyComparison[2].substance).toBe('Protein');

      // Check daily breakdown
      expect(result.dailyBreakdown).toHaveLength(3);
      expect(result.dailyBreakdown[0].day).toEqual(mockDays[0]);
      expect(result.dailyBreakdown[0].consumption).toEqual({
        protein: 25.5,
        carbohydrates: 45.2,
        fat: 12.8,
      });

      // Check summary
      expect(result.summary.totalDays).toBe(3);
      expect(result.summary.daysWithData).toBe(3);
      expect(result.summary.topNutrients).toHaveLength(3);
      expect(result.summary.nutritionScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.nutritionScore).toBeLessThanOrEqual(100);
      expect(result.summary.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate weekly recommended intake correctly', async () => {
      const result = await weeklyReportService.generateWeeklyReport(1);

      expect(result.weeklyRecommended.protein).toBe(350); // 50 * 7
      expect(result.weeklyRecommended.carbohydrates).toBe(2100); // 300 * 7
      expect(result.weeklyRecommended.fat).toBe(455); // 65 * 7
    });

    it('should calculate consumption status correctly', async () => {
      const result = await weeklyReportService.generateWeeklyReport(1);

      // Total protein consumed: 25.5 * 3 = 76.5g
      // Weekly recommended: 350g
      // Percentage: (76.5 / 350) * 100 = 21.86% (under 80% = 'under')
      const proteinComparison = result.weeklyComparison.find(c => c.substance === 'Protein');
      expect(proteinComparison?.status).toBe('under');

      // Total carbs consumed: 45.2 * 3 = 135.6g
      // Weekly recommended: 2100g
      // Percentage: (135.6 / 2100) * 100 = 6.46% (under 80% = 'under')
      const carbsComparison = result.weeklyComparison.find(c => c.substance === 'Carbohydrates');
      expect(carbsComparison?.status).toBe('under');

      // Total fat consumed: 12.8 * 3 = 38.4g
      // Weekly recommended: 455g
      // Percentage: (38.4 / 455) * 100 = 8.44% (under 80% = 'under')
      const fatComparison = result.weeklyComparison.find(c => c.substance === 'Fat');
      expect(fatComparison?.status).toBe('under');
    });

    it('should handle days with no analysis data', async () => {
      // Reset the mock to return different data for each call
      mockAnalysisService.getAnalysisForDay.mockReset();
      mockAnalysisService.getAnalysisForDay
        .mockResolvedValueOnce(mockAnalysisResults) // Day 1 has data
        .mockResolvedValueOnce([]) // Day 2 has no data
        .mockResolvedValueOnce(mockAnalysisResults); // Day 3 has data

      const result = await weeklyReportService.generateWeeklyReport(1);

      expect(result.summary.daysWithData).toBe(2); // Only 2 days have data
      expect(result.dailyBreakdown[1].mealCount).toBe(0); // Day 2 has no meals
      expect(result.dailyBreakdown[1].totalCalories).toBe(0); // Day 2 has no calories
    });

    it('should generate appropriate recommendations', async () => {
      const result = await weeklyReportService.generateWeeklyReport(1);

      expect(result.summary.recommendations).toBeInstanceOf(Array);
      expect(result.summary.recommendations.length).toBeGreaterThan(0);
      expect(result.summary.recommendations.length).toBeLessThanOrEqual(3);

      // Should have deficiency recommendations since all nutrients are under-consumed
      const hasDeficiencyRecommendation = result.summary.recommendations.some(rec =>
        rec.includes('Increase') && rec.includes('intake')
      );
      expect(hasDeficiencyRecommendation).toBe(true);
    });

    it('should calculate nutrition score based on optimal nutrients', async () => {
      const result = await weeklyReportService.generateWeeklyReport(1);

      // Since all nutrients are under-consumed (status: 'under'), nutrition score should be low
      expect(result.summary.nutritionScore).toBe(0); // 0 optimal out of 3 total = 0%
    });

    it('should handle errors gracefully', async () => {
      // Reset mocks and set up error condition
      mockDbService.getAllWeeks.mockReset();
      mockDbService.getAllWeeks.mockRejectedValue(new Error('Database error'));

      await expect(weeklyReportService.generateWeeklyReport(1)).rejects.toThrow(
        'Failed to generate weekly report: Error: Database error'
      );
    });

    it('should throw error for non-existent week', async () => {
      mockDbService.getAllWeeks.mockResolvedValue([]);

      await expect(weeklyReportService.generateWeeklyReport(999)).rejects.toThrow(
        'Week with ID 999 not found'
      );
    });
  });

  describe('isWeeklyReportAvailable', () => {
    it('should return true when week has 7 days', async () => {
      const mockDays = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        weekId: 1,
        dayNumber: i + 1,
        date: `2024-01-0${i + 1}`,
        createdAt: `2024-01-0${i + 1}T00:00:00Z`,
      }));

      // Reset the mock to ensure clean state
      mockDbService.getDaysForWeek.mockReset();
      mockDbService.getDaysForWeek.mockResolvedValue(mockDays);

      const result = await weeklyReportService.isWeeklyReportAvailable(1);
      expect(result).toBe(true);
    });

    it('should return false when week has less than 7 days', async () => {
      const mockDays = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        weekId: 1,
        dayNumber: i + 1,
        date: `2024-01-0${i + 1}`,
        createdAt: `2024-01-0${i + 1}T00:00:00Z`,
      }));

      mockDbService.getDaysForWeek.mockResolvedValue(mockDays);

      const result = await weeklyReportService.isWeeklyReportAvailable(1);
      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      mockDbService.getDaysForWeek.mockRejectedValue(new Error('Database error'));

      const result = await weeklyReportService.isWeeklyReportAvailable(1);
      expect(result).toBe(false);
    });
  });

  describe('getAvailableWeeks', () => {
    it('should return only weeks with 7 days', async () => {
      const mockWeeks = [
        { id: 1, weekNumber: 1, startDate: '2024-01-01', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, weekNumber: 2, startDate: '2024-01-08', createdAt: '2024-01-08T00:00:00Z' },
        { id: 3, weekNumber: 3, startDate: '2024-01-15', createdAt: '2024-01-15T00:00:00Z' },
      ];

      // Reset mocks to ensure clean state
      mockDbService.getAllWeeks.mockReset();
      mockDbService.getDaysForWeek.mockReset();
      
      mockDbService.getAllWeeks.mockResolvedValue(mockWeeks);
      
      // Week 1 has 7 days, Week 2 has 5 days, Week 3 has 7 days
      mockDbService.getDaysForWeek
        .mockResolvedValueOnce(Array(7).fill({})) // Week 1: 7 days
        .mockResolvedValueOnce(Array(5).fill({})) // Week 2: 5 days
        .mockResolvedValueOnce(Array(7).fill({})); // Week 3: 7 days

      const result = await weeklyReportService.getAvailableWeeks();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('should return empty array when no weeks are available', async () => {
      mockDbService.getAllWeeks.mockResolvedValue([]);

      const result = await weeklyReportService.getAvailableWeeks();
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockDbService.getAllWeeks.mockRejectedValue(new Error('Database error'));

      const result = await weeklyReportService.getAvailableWeeks();
      expect(result).toEqual([]);
    });
  });
});