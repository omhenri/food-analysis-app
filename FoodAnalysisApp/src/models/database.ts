// Database configuration
export const DATABASE_NAME = 'FoodAnalysisApp.db';
export const DATABASE_VERSION = '1.0';
export const DATABASE_DISPLAY_NAME = 'Food Analysis Database';
export const DATABASE_SIZE = 200000;

// Table creation SQL statements
export const CREATE_WEEKS_TABLE = `
  CREATE TABLE IF NOT EXISTS weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_number INTEGER UNIQUE NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const CREATE_DAYS_TABLE = `
  CREATE TABLE IF NOT EXISTS days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (week_id) REFERENCES weeks (id),
    UNIQUE(week_id, day_number)
  );
`;

export const CREATE_FOOD_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS food_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER NOT NULL,
    food_name TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    portion TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (day_id) REFERENCES days (id)
  );
`;

export const CREATE_ANALYSIS_RESULTS_TABLE = `
  CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_entry_id INTEGER NOT NULL,
    ingredients TEXT NOT NULL,
    chemical_substances TEXT NOT NULL,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_entry_id) REFERENCES food_entries (id)
  );
`;

export const CREATE_COMPARISON_RESULTS_TABLE = `
  CREATE TABLE IF NOT EXISTS comparison_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER NOT NULL UNIQUE,
    comparison_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (day_id) REFERENCES days (id) ON DELETE CASCADE
  );
`;

export const CREATE_WEEKLY_COMPARISON_RESULTS_TABLE = `
  CREATE TABLE IF NOT EXISTS weekly_comparison_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER NOT NULL UNIQUE,
    comparison_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (week_id) REFERENCES weeks (id) ON DELETE CASCADE
  );
`;

// Index creation for better performance
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_days_week_id ON days (week_id);',
  'CREATE INDEX IF NOT EXISTS idx_food_entries_day_id ON food_entries (day_id);',
  'CREATE INDEX IF NOT EXISTS idx_analysis_results_food_entry_id ON analysis_results (food_entry_id);',
  'CREATE INDEX IF NOT EXISTS idx_comparison_results_day_id ON comparison_results (day_id);',
  'CREATE INDEX IF NOT EXISTS idx_weekly_comparison_results_week_id ON weekly_comparison_results (week_id);',
];

// All table creation statements
export const CREATE_TABLES = [
  CREATE_WEEKS_TABLE,
  CREATE_DAYS_TABLE,
  CREATE_FOOD_ENTRIES_TABLE,
  CREATE_ANALYSIS_RESULTS_TABLE,
  CREATE_COMPARISON_RESULTS_TABLE,
  CREATE_WEEKLY_COMPARISON_RESULTS_TABLE,
  ...CREATE_INDEXES,
];