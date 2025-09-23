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

// Enhanced comparison tables
export const CREATE_SUBSTANCE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS substance_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('macronutrient', 'micronutrient', 'harmful', 'calorie')),
    display_order INTEGER NOT NULL,
    default_unit TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const CREATE_REFERENCE_VALUES_TABLE = `
  CREATE TABLE IF NOT EXISTS reference_values (
    id TEXT PRIMARY KEY,
    substance_name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    age_group TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'all')),
    type TEXT NOT NULL CHECK (type IN ('recommended', 'minimum', 'maximum', 'upper_limit')),
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    source TEXT,
    color TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES substance_categories (id)
  );
`;

export const CREATE_ENHANCED_COMPARISON_RESULTS_TABLE = `
  CREATE TABLE IF NOT EXISTS enhanced_comparison_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER NOT NULL,
    substance_name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    consumed_amount REAL NOT NULL,
    unit TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('deficient', 'optimal', 'acceptable', 'excess')),
    nutrition_score REAL,
    layers_data TEXT NOT NULL,
    reference_data TEXT NOT NULL,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (day_id) REFERENCES days (id),
    FOREIGN KEY (category_id) REFERENCES substance_categories (id)
  );
`;

// Index creation for better performance
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_days_week_id ON days (week_id);',
  'CREATE INDEX IF NOT EXISTS idx_food_entries_day_id ON food_entries (day_id);',
  'CREATE INDEX IF NOT EXISTS idx_analysis_results_food_entry_id ON analysis_results (food_entry_id);',
  'CREATE INDEX IF NOT EXISTS idx_reference_values_substance ON reference_values (substance_name);',
  'CREATE INDEX IF NOT EXISTS idx_reference_values_category ON reference_values (category_id);',
  'CREATE INDEX IF NOT EXISTS idx_enhanced_comparison_day ON enhanced_comparison_results (day_id);',
  'CREATE INDEX IF NOT EXISTS idx_enhanced_comparison_substance ON enhanced_comparison_results (substance_name);',
];

// All table creation statements
export const CREATE_TABLES = [
  CREATE_WEEKS_TABLE,
  CREATE_DAYS_TABLE,
  CREATE_FOOD_ENTRIES_TABLE,
  CREATE_ANALYSIS_RESULTS_TABLE,
  CREATE_SUBSTANCE_CATEGORIES_TABLE,
  CREATE_REFERENCE_VALUES_TABLE,
  CREATE_ENHANCED_COMPARISON_RESULTS_TABLE,
  ...CREATE_INDEXES,
];