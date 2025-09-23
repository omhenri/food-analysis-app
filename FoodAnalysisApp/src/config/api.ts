// API Configuration for Food Analysis App

export const API_CONFIG = {
  // Backend API Configuration
  BACKEND: {
    // Development backend (local)
    DEV_URL: 'http://localhost:3000/api',
    
    // Production backend (replace with your actual production URL)
    PROD_URL: 'https://your-food-backend.herokuapp.com/api',
    
    // Get the appropriate URL based on environment
    get BASE_URL() {
      return __DEV__ ? this.DEV_URL : this.PROD_URL;
    },
    
    // Request timeout (30 seconds for AI processing)
    TIMEOUT: 30000,
    
    // Retry configuration
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },

  // Direct AI API Configuration (fallback)
  AI: {
    // OpenRouter API (if using direct integration)
    OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
    
    // OpenAI API (alternative)
    OPENAI_URL: 'https://api.openai.com/v1/chat/completions',
    
    // Default model
    DEFAULT_MODEL: 'gpt-3.5-turbo',
    
    // Request timeout
    TIMEOUT: 20000,
  },

  // Feature flags
  FEATURES: {
    // Use backend by default (recommended)
    USE_BACKEND: true,
    
    // Enable mock service for development/testing
    USE_MOCK_IN_DEV: false,
    
    // Enable offline mode
    ENABLE_OFFLINE_MODE: true,
    
    // Enable request caching
    ENABLE_CACHING: true,
  },

  // Request headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'FoodAnalysisApp/1.0',
  },
};

// Environment-specific configurations
export const getApiConfig = () => {
  const config = { ...API_CONFIG };
  
  if (__DEV__) {
    // Development overrides
    config.BACKEND.TIMEOUT = 60000; // Longer timeout for development
    config.FEATURES.USE_MOCK_IN_DEV = true; // Enable mock for easier development
  }
  
  return config;
};

// Validation helpers
export const validateApiConfig = () => {
  const config = getApiConfig();
  
  if (!config.BACKEND.BASE_URL) {
    console.warn('Backend URL not configured');
    return false;
  }
  
  return true;
};

// Backend endpoints
export const ENDPOINTS = {
  // Food analysis
  ANALYZE_FOODS: '/analyze/foods',
  ANALYSIS_HISTORY: '/analyze/history',
  
  // Nutrition data
  RECOMMENDED_INTAKE: '/nutrition/recommended-intake',
  NUTRITION_DATABASE: '/nutrition/database',
  
  // Health and status
  HEALTH_CHECK: '/health',
  STATUS: '/status',
  
  // User management (if needed)
  USER_PROFILE: '/user/profile',
  USER_PREFERENCES: '/user/preferences',
};

// Error codes
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  
  // Backend errors
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  INVALID_REQUEST: 'INVALID_REQUEST',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  
  // AI errors
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  API_KEY_INVALID: 'API_KEY_INVALID',
};

// Success messages
export const SUCCESS_MESSAGES = {
  ANALYSIS_COMPLETE: 'Food analysis completed successfully',
  CONNECTION_ESTABLISHED: 'Backend connection established',
  DATA_SAVED: 'Analysis data saved successfully',
};

export default API_CONFIG;