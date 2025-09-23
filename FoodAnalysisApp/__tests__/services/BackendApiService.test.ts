import { BackendApiService, FoodItem, BackendApiError } from '../../src/services/BackendApiService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('BackendApiService', () => {
  let service: BackendApiService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = BackendApiService.getInstance();
    mockFetch.mockClear();
  });

  describe('analyzeFoods', () => {
    const mockFoods: FoodItem[] = [
      {
        name: 'Apple',
        mealType: 'snack',
        portion: '1 medium',
        quantity: 1,
        unit: 'piece',
      },
      {
        name: 'Chicken breast',
        mealType: 'lunch',
        portion: '150g',
        quantity: 150,
        unit: 'grams',
      },
    ];

    it('should successfully analyze foods via backend', async () => {
      const mockResponse = {
        success: true,
        data: {
          analysisId: 'test-analysis-123',
          foods: [
            {
              foodId: '1',
              foodName: 'Apple',
              mealType: 'snack',
              portion: '1 medium',
              ingredients: [
                {
                  name: 'Fructose',
                  percentage: 45,
                  category: 'primary',
                  description: 'Natural fruit sugar',
                  associatedChemicals: ['Fructose'],
                },
              ],
              chemicalSubstances: [
                {
                  name: 'Fructose',
                  amount: 12.5,
                  unit: 'g',
                  category: 'macronutrient',
                  sourceIngredients: ['Fructose'],
                  healthImpact: 'neutral',
                  description: 'Natural fruit sugar',
                },
                {
                  name: 'Vitamin C',
                  amount: 8.4,
                  unit: 'mg',
                  category: 'vitamin',
                  sourceIngredients: ['Apple flesh'],
                  healthImpact: 'positive',
                  description: 'Essential vitamin',
                },
              ],
              nutritionalInfo: {
                calories: 95,
                macronutrients: {
                  protein: 0.5,
                  carbohydrates: 25,
                  fat: 0.3,
                  fiber: 4.4,
                },
                micronutrients: {
                  vitamins: { 'vitamin-c': 8.4 },
                  minerals: { potassium: 195 },
                },
              },
              confidence: 0.92,
            },
          ],
          summary: {
            totalCalories: 95,
            totalItems: 1,
            healthScore: 78,
            recommendations: ['Good source of vitamin C'],
            warnings: [],
          },
          timestamp: '2024-01-15T10:30:00Z',
        },
        processingTime: 2.5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.analyzeFoods(mockFoods);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/analyze/foods'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Apple'),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.foods).toHaveLength(1);
      expect(result.data.foods[0].foodName).toBe('Apple');
    });

    it('should handle backend errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          message: 'AI service temporarily unavailable',
          code: 'AI_SERVICE_ERROR',
        }),
      } as Response);

      await expect(service.analyzeFoods(mockFoods)).rejects.toThrow(BackendApiError);
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );

      await expect(service.analyzeFoods(mockFoods)).rejects.toThrow('Request timeout');
    });

    it('should retry on retryable errors', async () => {
      // First call fails with 500 error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Temporary error' }),
      } as Response);

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { foods: [], summary: {} },
        }),
      } as Response);

      const result = await service.analyzeFoods(mockFoods);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as Response);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return false for failed health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response);

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('convertToAnalysisResults', () => {
    it('should convert backend response to app format', () => {
      const backendResponse = {
        success: true,
        data: {
          analysisId: 'test-123',
          foods: [
            {
              foodId: '1',
              foodName: 'Apple',
              mealType: 'snack',
              portion: '1 medium',
              ingredients: [{ name: 'Fructose' }],
              chemicalSubstances: [
                {
                  name: 'Vitamin C',
                  amount: 8.4,
                  unit: 'mg',
                  category: 'vitamin',
                  sourceIngredients: ['Apple'],
                  healthImpact: 'positive',
                  description: 'Essential vitamin',
                },
              ],
              nutritionalInfo: { calories: 95 },
              confidence: 0.9,
            },
          ],
          summary: {},
          timestamp: '2024-01-15T10:30:00Z',
        },
      };

      const result = service.convertToAnalysisResults(backendResponse);

      expect(result).toHaveLength(1);
      expect(result[0].foodId).toBe('1');
      expect(result[0].ingredients).toEqual(['Fructose']);
      expect(result[0].chemicalSubstances).toHaveLength(1);
      expect(result[0].chemicalSubstances[0].name).toBe('Vitamin C');
      expect(result[0].chemicalSubstances[0].category).toBe('good'); // positive -> good
    });
  });
});