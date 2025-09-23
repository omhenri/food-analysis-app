import { FoodItem, AnalysisResult, ChemicalSubstance, RecommendedIntake } from '../models/types';
import { NetworkError, AIAnalysisError, RetryManager, NetworkStatus } from '../utils/errorHandler';

// AI Analysis configuration
const AI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = 'gpt-3.5-turbo';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class AIAnalysisService {
  private static instance: AIAnalysisService;
  private apiKey: string | null = null;

  private constructor() {}

  public static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }

  // Set API key (should be called during app initialization)
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // Analyze foods using AI
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    if (!this.apiKey) {
      throw new AIAnalysisError('AI API key not configured');
    }

    // Check network status
    if (!NetworkStatus.getOnlineStatus()) {
      console.log('Offline mode: Using mock analysis results');
      return this.getMockAnalysisResults(foods);
    }

    try {
      const analysisPrompt = this.formatFoodForAnalysis(foods);
      
      return await RetryManager.withRetry(
        async () => {
          const response = await this.makeAIRequest(analysisPrompt);
          return this.parseAnalysisResponse(response, foods);
        },
        MAX_RETRIES,
        (error) => {
          // Retry on network errors
          const message = error.message.toLowerCase();
          return message.includes('network') || 
                 message.includes('fetch') || 
                 message.includes('timeout');
        }
      );
    } catch (error) {
      console.error('AI analysis failed, falling back to mock data:', error);
      
      // Fallback to mock data instead of throwing
      if (error instanceof Error) {
        throw new AIAnalysisError(`AI analysis failed: ${error.message}`, error);
      }
      
      return this.getMockAnalysisResults(foods);
    }
  }

  // Get recommended daily intake for adults aged 18-29
  public async getRecommendedIntake(age: number = 25): Promise<RecommendedIntake> {
    if (!this.apiKey) {
      console.log('AI API key not configured, using default values');
      return this.getDefaultRecommendedIntake();
    }

    // Check network status
    if (!NetworkStatus.getOnlineStatus()) {
      console.log('Offline mode: Using default recommended intake');
      return this.getDefaultRecommendedIntake();
    }

    try {
      const prompt = `Provide recommended daily intake values in grams for adults aged ${age}. 
      Include major nutrients like protein, carbohydrates, fats, fiber, vitamins (A, C, D, E, K, B-complex), 
      minerals (calcium, iron, magnesium, potassium, sodium, zinc), and other important substances.
      Return as JSON object with substance names as keys and recommended amounts in grams as values.`;

      return await RetryManager.withRetry(
        async () => {
          const response = await this.makeAIRequest(prompt);
          return this.parseRecommendedIntakeResponse(response);
        },
        2, // Fewer retries for this less critical operation
        (error) => {
          const message = error.message.toLowerCase();
          return message.includes('network') || message.includes('fetch');
        }
      );
    } catch (error) {
      console.error('Failed to get recommended intake, using defaults:', error);
      // Return default values if AI fails
      return this.getDefaultRecommendedIntake();
    }
  }

  // Format foods for AI analysis
  private formatFoodForAnalysis(foods: FoodItem[]): string {
    const foodDescriptions = foods.map(food => {
      const portionText = this.getPortionDescription(food.portion);
      return `${food.name} (${portionText} portion, ${food.mealType})`;
    }).join(', ');

    return `Analyze the following foods and provide detailed nutritional information:
    Foods: ${foodDescriptions}

    For each food item, provide:
    1. Main ingredients
    2. Chemical substances/nutrients with amounts in grams
    3. Categorize each substance as "good", "bad", or "neutral" for health
    4. Consider the portion size when calculating amounts

    Return the response as a JSON array where each object represents one food item with this structure:
    {
      "foodName": "food name",
      "ingredients": ["ingredient1", "ingredient2"],
      "chemicalSubstances": [
        {
          "name": "substance name",
          "category": "good|bad|neutral",
          "amount": number_in_grams,
          "mealType": "meal type"
        }
      ]
    }`;
  }

  // Make AI API request with retry logic
  private async makeAIRequest(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(AI_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a nutrition expert. Provide accurate nutritional analysis in the requested JSON format.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          if (response.status >= 500) {
            throw new NetworkError(`Server error: ${response.status} ${response.statusText}`);
          } else if (response.status === 429) {
            throw new NetworkError('Rate limit exceeded. Please try again later.');
          } else if (response.status === 401) {
            throw new AIAnalysisError('Invalid API key');
          } else {
            throw new NetworkError(`AI API request failed: ${response.status} ${response.statusText}`);
          }
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid AI API response format');
        }

        return data.choices[0].message.content;
      } catch (error) {
        lastError = error as Error;
        console.warn(`AI request attempt ${attempt} failed:`, error);

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY * attempt);
        }
      }
    }

    throw lastError || new Error('AI request failed after all retries');
  }

  // Parse AI analysis response
  private parseAnalysisResponse(response: string, originalFoods: FoodItem[]): AnalysisResult[] {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      
      return analysisData.map((item: any, index: number) => {
        const originalFood = originalFoods[index];
        
        return {
          foodId: originalFood.id,
          foodEntryId: 0, // Will be set when saving to database
          ingredients: item.ingredients || [],
          chemicalSubstances: (item.chemicalSubstances || []).map((substance: any) => ({
            name: substance.name || 'Unknown',
            category: substance.category || 'neutral',
            amount: parseFloat(substance.amount) || 0,
            mealType: originalFood.mealType,
          })),
        };
      });
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return mock data if parsing fails
      return this.getMockAnalysisResults(originalFoods);
    }
  }

  // Parse recommended intake response
  private parseRecommendedIntakeResponse(response: string): RecommendedIntake {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse recommended intake response:', error);
      return this.getDefaultRecommendedIntake();
    }
  }

  // Get portion description for AI prompt
  private getPortionDescription(portion: string): string {
    switch (portion) {
      case '1/1': return 'full';
      case '1/2': return 'half';
      case '1/3': return 'one-third';
      case '1/4': return 'quarter';
      case '1/8': return 'one-eighth';
      default: return 'standard';
    }
  }

  // Delay utility for retry logic
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Default recommended intake values (fallback)
  private getDefaultRecommendedIntake(): RecommendedIntake {
    return {
      protein: 50,
      carbohydrates: 300,
      fat: 65,
      fiber: 25,
      sugar: 50,
      sodium: 2.3,
      calcium: 1,
      iron: 0.018,
      'vitamin-c': 0.09,
      'vitamin-d': 0.00002,
      potassium: 3.5,
      magnesium: 0.4,
    };
  }

  // Mock analysis results (fallback when AI fails)
  private getMockAnalysisResults(foods: FoodItem[]): AnalysisResult[] {
    return foods.map(food => ({
      foodId: food.id,
      foodEntryId: 0,
      ingredients: ['Mock ingredient 1', 'Mock ingredient 2'],
      chemicalSubstances: [
        {
          name: 'Protein',
          category: 'good' as const,
          amount: 10,
          mealType: food.mealType,
        },
        {
          name: 'Carbohydrates',
          category: 'neutral' as const,
          amount: 25,
          mealType: food.mealType,
        },
        {
          name: 'Sugar',
          category: 'bad' as const,
          amount: 5,
          mealType: food.mealType,
        },
      ],
    }));
  }

  // Test connection to AI service
  public async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await this.makeAIRequest('Test connection. Respond with "OK".');
      return true;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }
}