import SQLite from 'react-native-sqlite-storage';
import {
  Week,
  Day,
  FoodEntry,
  AnalysisResult,
  WeeklyData,
  ComparisonData,
} from '../models/types';
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  DATABASE_DISPLAY_NAME,
  DATABASE_SIZE,
  CREATE_TABLES,
} from '../models/database';

// Enable debugging in development
SQLite.DEBUG(true);
SQLite.enablePromise(true);

export class DatabaseService {
  private static instance: DatabaseService;
  private database: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Initialize database connection and create tables
  public async initializeDatabase(): Promise<void> {
    try {
      if (this.database) {
        console.log('Database already initialized');
        return;
      }

      this.database = await SQLite.openDatabase({
        name: DATABASE_NAME,
        version: DATABASE_VERSION,
        displayName: DATABASE_DISPLAY_NAME,
        size: DATABASE_SIZE,
      });

      console.log('Database opened successfully');

      // Create all tables
      await this.createTables();
      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  // Create all database tables
  private async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      for (const createTableSQL of CREATE_TABLES) {
        await this.database.executeSql(createTableSQL);
      }
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  // Get current week or create new one
  public async getCurrentWeek(): Promise<Week> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM weeks ORDER BY week_number DESC LIMIT 1'
      );

      if (results.rows.length > 0) {
        const row = results.rows.item(0);
        return {
          id: row.id,
          weekNumber: row.week_number,
          startDate: row.start_date,
          endDate: row.end_date,
          createdAt: row.created_at,
        };
      } else {
        // Create first week
        return await this.createNewWeek();
      }
    } catch (error) {
      console.error('Failed to get current week:', error);
      throw error;
    }
  }

  // Create a new week
  public async createNewWeek(): Promise<Week> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Get the next week number
      const [countResult] = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM weeks'
      );
      const weekNumber = countResult.rows.item(0).count + 1;

      const startDate = new Date().toISOString().split('T')[0];

      const [result] = await this.database.executeSql(
        'INSERT INTO weeks (week_number, start_date) VALUES (?, ?)',
        [weekNumber, startDate]
      );

      return {
        id: result.insertId,
        weekNumber,
        startDate,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to create new week:', error);
      throw error;
    }
  }

  // Get current day or create new one
  public async getCurrentDay(): Promise<Day> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const currentWeek = await this.getCurrentWeek();
      const today = new Date().toISOString().split('T')[0];

      // Check if today already exists
      const [results] = await this.database.executeSql(
        'SELECT * FROM days WHERE week_id = ? AND date = ?',
        [currentWeek.id, today]
      );

      if (results.rows.length > 0) {
        const row = results.rows.item(0);
        return {
          id: row.id,
          weekId: row.week_id,
          dayNumber: row.day_number,
          date: row.date,
          createdAt: row.created_at,
        };
      } else {
        // Get next day number for this week
        const [dayCountResult] = await this.database.executeSql(
          'SELECT COUNT(*) as count FROM days WHERE week_id = ?',
          [currentWeek.id]
        );
        const dayNumber = dayCountResult.rows.item(0).count + 1;

        // If we've reached day 8, create a new week
        if (dayNumber > 7) {
          const newWeek = await this.createNewWeek();
          return await this.createNewDay(newWeek.id, 1);
        } else {
          return await this.createNewDay(currentWeek.id, dayNumber);
        }
      }
    } catch (error) {
      console.error('Failed to get current day:', error);
      throw error;
    }
  }

  // Create a new day
  public async createNewDay(weekId: number, dayNumber: number): Promise<Day> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const date = new Date().toISOString().split('T')[0];

      const [result] = await this.database.executeSql(
        'INSERT INTO days (week_id, day_number, date) VALUES (?, ?, ?)',
        [weekId, dayNumber, date]
      );

      return {
        id: result.insertId,
        weekId,
        dayNumber,
        date,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to create new day:', error);
      throw error;
    }
  }

  // Save food entry
  public async saveFoodEntry(entry: FoodEntry): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [result] = await this.database.executeSql(
        'INSERT INTO food_entries (day_id, food_name, meal_type, portion) VALUES (?, ?, ?, ?)',
        [entry.dayId, entry.foodName, entry.mealType, entry.portion]
      );

      return result.insertId;
    } catch (error) {
      console.error('Failed to save food entry:', error);
      throw error;
    }
  }

  // Get food entries for a specific day
  public async getFoodEntriesForDay(dayId: number): Promise<FoodEntry[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM food_entries WHERE day_id = ? ORDER BY created_at',
        [dayId]
      );

      const entries: FoodEntry[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        entries.push({
          id: row.id,
          dayId: row.day_id,
          foodName: row.food_name,
          mealType: row.meal_type,
          portion: row.portion,
          createdAt: row.created_at,
        });
      }

      return entries;
    } catch (error) {
      console.error('Failed to get food entries for day:', error);
      throw error;
    }
  }

  // Save analysis result
  public async saveAnalysisResult(result: AnalysisResult): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql(
        'INSERT INTO analysis_results (food_entry_id, ingredients, chemical_substances) VALUES (?, ?, ?)',
        [
          result.foodEntryId,
          JSON.stringify(result.ingredients),
          JSON.stringify(result.chemicalSubstances),
        ]
      );
    } catch (error) {
      console.error('Failed to save analysis result:', error);
      throw error;
    }
  }

  // Get analysis results for a specific day
  public async getAnalysisForDay(dayId: number): Promise<AnalysisResult[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(`
        SELECT ar.*, fe.food_name 
        FROM analysis_results ar 
        JOIN food_entries fe ON ar.food_entry_id = fe.id 
        WHERE fe.day_id = ? 
        ORDER BY ar.analyzed_at
      `, [dayId]);

      const analysisResults: AnalysisResult[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        analysisResults.push({
          id: row.id,
          foodEntryId: row.food_entry_id,
          foodId: row.food_name, // Using food_name as foodId for now
          ingredients: JSON.parse(row.ingredients),
          chemicalSubstances: JSON.parse(row.chemical_substances),
          analyzedAt: row.analyzed_at,
        });
      }

      return analysisResults;
    } catch (error) {
      console.error('Failed to get analysis for day:', error);
      throw error;
    }
  }

  // Save comparison result for a day (replace existing)
  public async saveComparisonResult(dayId: number, comparisonData: ComparisonData[]): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const comparisonJson = JSON.stringify(comparisonData);

      // Replace existing comparison data for this day
      await this.database.executeSql(
        `INSERT OR REPLACE INTO comparison_results (day_id, comparison_data, updated_at)
         VALUES (?, ?, datetime('now'))`,
        [dayId, comparisonJson]
      );
    } catch (error) {
      console.error('Failed to save comparison result:', error);
      throw error;
    }
  }

  // Get comparison result for a day
  public async getComparisonForDay(dayId: number): Promise<ComparisonData[] | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT comparison_data FROM comparison_results WHERE day_id = ?',
        [dayId]
      );

      if (results.rows.length > 0) {
        const row = results.rows.item(0);
        return JSON.parse(row.comparison_data);
      }

      return null; // No comparison data found
    } catch (error) {
      console.error('Failed to get comparison for day:', error);
      throw error;
    }
  }

  // Check if comparison data exists for a day
  public async hasComparisonForDay(dayId: number): Promise<boolean> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM comparison_results WHERE day_id = ?',
        [dayId]
      );

      return results.rows.item(0).count > 0;
    } catch (error) {
      console.error('Failed to check comparison for day:', error);
      return false;
    }
  }

  // Delete comparison result for a day
  public async deleteComparisonForDay(dayId: number): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql(
        'DELETE FROM comparison_results WHERE day_id = ?',
        [dayId]
      );
    } catch (error) {
      console.error('Failed to delete comparison for day:', error);
      throw error;
    }
  }

  // Save weekly comparison result for a week (replace existing)
  public async saveWeeklyComparisonResult(weekId: number, comparisonData: ComparisonData[]): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const comparisonJson = JSON.stringify(comparisonData);

      // Replace existing weekly comparison data for this week
      await this.database.executeSql(
        `INSERT OR REPLACE INTO weekly_comparison_results (week_id, comparison_data, updated_at)
         VALUES (?, ?, datetime('now'))`,
        [weekId, comparisonJson]
      );
    } catch (error) {
      console.error('Failed to save weekly comparison result:', error);
      throw error;
    }
  }

  // Get weekly comparison result for a week
  public async getWeeklyComparisonForWeek(weekId: number): Promise<ComparisonData[] | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT comparison_data FROM weekly_comparison_results WHERE week_id = ?',
        [weekId]
      );

      if (results.rows.length > 0) {
        const row = results.rows.item(0);
        return JSON.parse(row.comparison_data);
      }

      return null; // No weekly comparison data found
    } catch (error) {
      console.error('Failed to get weekly comparison for week:', error);
      throw error;
    }
  }

  // Check if weekly comparison data exists for a week
  public async hasWeeklyComparisonForWeek(weekId: number): Promise<boolean> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM weekly_comparison_results WHERE week_id = ?',
        [weekId]
      );

      return results.rows.item(0).count > 0;
    } catch (error) {
      console.error('Failed to check weekly comparison for week:', error);
      return false;
    }
  }

  // Delete weekly comparison result for a week
  public async deleteWeeklyComparisonForWeek(weekId: number): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql(
        'DELETE FROM weekly_comparison_results WHERE week_id = ?',
        [weekId]
      );
    } catch (error) {
      console.error('Failed to delete weekly comparison for week:', error);
      throw error;
    }
  }

  // Get weekly data
  public async getWeeklyData(weekId: number): Promise<WeeklyData> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Get all days for the week
      const [dayResults] = await this.database.executeSql(
        'SELECT id FROM days WHERE week_id = ?',
        [weekId]
      );

      const totalConsumption: { [substance: string]: number } = {};

      // Get analysis results for all days in the week
      for (let i = 0; i < dayResults.rows.length; i++) {
        const dayId = dayResults.rows.item(i).id;
        const analysisResults = await this.getAnalysisForDay(dayId);

        analysisResults.forEach(result => {
          result.chemicalSubstances.forEach(substance => {
            if (totalConsumption[substance.name]) {
              totalConsumption[substance.name] += substance.amount;
            } else {
              totalConsumption[substance.name] = substance.amount;
            }
          });
        });
      }

      return {
        weekId,
        totalConsumption,
        recommendedIntake: {}, // Will be populated by AI service
        comparisonData: [], // Will be calculated based on recommended intake
      };
    } catch (error) {
      console.error('Failed to get weekly data:', error);
      throw error;
    }
  }

  // Get all weeks
  public async getAllWeeks(): Promise<Week[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM weeks ORDER BY week_number'
      );

      const weeks: Week[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        weeks.push({
          id: row.id,
          weekNumber: row.week_number,
          startDate: row.start_date,
          endDate: row.end_date,
          createdAt: row.created_at,
        });
      }

      return weeks;
    } catch (error) {
      console.error('Failed to get all weeks:', error);
      throw error;
    }
  }

  // Get days for a specific week
  public async getDaysForWeek(weekId: number): Promise<Day[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM days WHERE week_id = ? ORDER BY day_number',
        [weekId]
      );

      const days: Day[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        days.push({
          id: row.id,
          weekId: row.week_id,
          dayNumber: row.day_number,
          date: row.date,
          createdAt: row.created_at,
        });
      }

      return days;
    } catch (error) {
      console.error('Failed to get days for week:', error);
      throw error;
    }
  }

  // Close database connection
  public async closeDatabase(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
      console.log('Database connection closed');
    }
  }
}