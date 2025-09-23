import SQLite from 'react-native-sqlite-storage';
import {
  Week,
  Day,
  FoodEntry,
  AnalysisResult,
  WeeklyData,
  EnhancedComparisonData,
} from '../models/types';
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  DATABASE_DISPLAY_NAME,
  DATABASE_SIZE,
  CREATE_TABLES,
} from '../models/database';
import {
  SUBSTANCE_CATEGORIES,
  REFERENCE_VALUES,
  INSERT_SUBSTANCE_CATEGORIES_SQL,
  INSERT_REFERENCE_VALUES_SQL,
} from '../data/referenceData';
import { DatabaseError } from '../utils/errorHandler';

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

      // Seed reference data
      await this.seedReferenceData();
      console.log('Reference data seeded successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new DatabaseError(`Failed to initialize database: ${error}`, error as Error);
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
      throw new DatabaseError('Failed to create database tables', error as Error);
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
      throw new DatabaseError('Failed to retrieve current week data', error as Error);
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

  // Seed reference data for enhanced comparison
  private async seedReferenceData(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Insert substance categories
      for (const category of SUBSTANCE_CATEGORIES) {
        await this.database.executeSql(INSERT_SUBSTANCE_CATEGORIES_SQL, [
          category.id,
          category.name,
          category.type,
          category.display_order,
          category.default_unit,
          category.description,
        ]);
      }

      // Insert reference values
      for (const refValue of REFERENCE_VALUES) {
        await this.database.executeSql(INSERT_REFERENCE_VALUES_SQL, [
          refValue.id,
          refValue.substance_name,
          refValue.category_id,
          refValue.age_group,
          refValue.gender,
          refValue.type,
          refValue.value,
          refValue.unit,
          refValue.source,
          refValue.color,
          refValue.label,
        ]);
      }
    } catch (error) {
      console.error('Failed to seed reference data:', error);
      throw new DatabaseError('Failed to seed reference data', error as Error);
    }
  }

  // Get substance categories
  public async getSubstanceCategories(): Promise<any[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM substance_categories ORDER BY display_order'
      );

      const categories = [];
      for (let i = 0; i < results.rows.length; i++) {
        categories.push(results.rows.item(i));
      }

      return categories;
    } catch (error) {
      console.error('Failed to get substance categories:', error);
      throw error;
    }
  }

  // Get reference values for a substance
  public async getReferenceValues(substanceName: string, ageGroup: string = '18-29', gender: string = 'all'): Promise<any[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM reference_values WHERE substance_name = ? AND age_group = ? AND (gender = ? OR gender = "all") ORDER BY value',
        [substanceName, ageGroup, gender]
      );

      const referenceValues = [];
      for (let i = 0; i < results.rows.length; i++) {
        referenceValues.push(results.rows.item(i));
      }

      return referenceValues;
    } catch (error) {
      console.error('Failed to get reference values:', error);
      throw error;
    }
  }

  // Save enhanced comparison result
  public async saveEnhancedComparisonResult(dayId: number, data: EnhancedComparisonData): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql(
        'INSERT OR REPLACE INTO enhanced_comparison_results (day_id, substance_name, category_id, consumed_amount, unit, status, nutrition_score, layers_data, reference_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          dayId,
          data.substance,
          data.category,
          data.consumed,
          data.unit,
          data.status,
          0, // nutrition_score placeholder
          JSON.stringify(data.layers),
          JSON.stringify(data.referenceValues),
        ]
      );
    } catch (error) {
      console.error('Failed to save enhanced comparison result:', error);
      throw error;
    }
  }

  // Get enhanced comparison results for a day
  public async getEnhancedComparisonResults(dayId: number): Promise<any[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM enhanced_comparison_results WHERE day_id = ? ORDER BY substance_name',
        [dayId]
      );

      const comparisonResults = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        comparisonResults.push({
          ...row,
          layers_data: JSON.parse(row.layers_data),
          reference_data: JSON.parse(row.reference_data),
        });
      }

      return comparisonResults;
    } catch (error) {
      console.error('Failed to get enhanced comparison results:', error);
      throw error;
    }
  }

  // Check if reference data exists
  public async hasReferenceData(): Promise<boolean> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM substance_categories'
      );

      return results.rows.item(0).count > 0;
    } catch (error) {
      console.error('Failed to check reference data:', error);
      return false;
    }
  }

  // Get all substances with their categories
  public async getSubstancesWithCategories(): Promise<any[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.database.executeSql(`
        SELECT DISTINCT rv.substance_name, sc.id as category_id, sc.name as category_name, sc.type, sc.default_unit
        FROM reference_values rv
        JOIN substance_categories sc ON rv.category_id = sc.id
        ORDER BY sc.display_order, rv.substance_name
      `);

      const substances = [];
      for (let i = 0; i < results.rows.length; i++) {
        substances.push(results.rows.item(i));
      }

      return substances;
    } catch (error) {
      console.error('Failed to get substances with categories:', error);
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