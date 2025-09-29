import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { FoodItem, AnalysisResult, RecommendedIntake } from '../../models/types';

// Base query configuration
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api.foodanalysis.com/v1',
  prepareHeaders: (headers, { getState }) => {
    // Add API key if available
    const apiKey = process.env.REACT_APP_API_KEY;
    if (apiKey) {
      headers.set('Authorization', `Bearer ${apiKey}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Enhanced base query with retry logic
const baseQueryWithRetry = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Retry logic for network errors
  if (result.error && result.error.status === 'FETCH_ERROR') {
    // Wait 1 second and retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = await baseQuery(args, api, extraOptions);
    
    if (result.error && result.error.status === 'FETCH_ERROR') {
      // Wait 2 seconds and retry one more time
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await baseQuery(args, api, extraOptions);
    }
  }
  
  return result;
};

// API slice
export const foodAnalysisApi = createApi({
  reducerPath: 'foodAnalysisApi',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['Analysis', 'Recommendations'],
  endpoints: (builder) => ({
    // Analyze foods using AI service
    analyzeFoods: builder.mutation<AnalysisResult[], FoodItem[]>({
      query: (foods) => ({
        url: '/analyze',
        method: 'POST',
        body: { foods },
      }),
      invalidatesTags: ['Analysis'],
      // Transform response if needed
      transformResponse: (response: any) => {
        // Ensure the response matches our AnalysisResult interface
        return response.results || response;
      },
      // Handle errors
      transformErrorResponse: (response: any) => {
        return {
          status: response.status,
          message: response.data?.message || 'Failed to analyze foods',
        };
      },
    }),
    
    // Get recommended intake values
    getRecommendedIntake: builder.query<RecommendedIntake, { age?: number; gender?: string }>({
      query: ({ age = 25, gender = 'all' }) => ({
        url: '/recommendations',
        params: { age, gender },
      }),
      providesTags: ['Recommendations'],
      // Cache for 1 hour
      keepUnusedDataFor: 3600,
      transformResponse: (response: any) => {
        return response.recommendations || response;
      },
    }),
    
    // Get nutritional information for a specific food
    getFoodNutrition: builder.query<any, string>({
      query: (foodName) => ({
        url: `/nutrition/${encodeURIComponent(foodName)}`,
      }),
      // Cache for 24 hours since food nutrition doesn't change often
      keepUnusedDataFor: 86400,
    }),
    
    // Batch analyze multiple foods (optimized endpoint)
    batchAnalyzeFoods: builder.mutation<AnalysisResult[], { foods: FoodItem[]; options?: any }>({
      query: ({ foods, options = {} }) => ({
        url: '/analyze/batch',
        method: 'POST',
        body: { foods, options },
      }),
      invalidatesTags: ['Analysis'],
    }),
    
    // Get health recommendations based on analysis
    getHealthRecommendations: builder.query<any, { analysisResults: AnalysisResult[] }>({
      query: ({ analysisResults }) => ({
        url: '/recommendations/health',
        method: 'POST',
        body: { analysisResults },
      }),
      // Don't cache health recommendations as they're personalized
      keepUnusedDataFor: 0,
    }),
  }),
});

// Export hooks for use in components
export const {
  useAnalyzeFoodsMutation,
  useGetRecommendedIntakeQuery,
  useGetFoodNutritionQuery,
  useBatchAnalyzeFoodsMutation,
  useGetHealthRecommendationsQuery,
  // Lazy query hooks
  useLazyGetRecommendedIntakeQuery,
  useLazyGetFoodNutritionQuery,
  useLazyGetHealthRecommendationsQuery,
} = foodAnalysisApi;

// Export API slice
export default foodAnalysisApi;