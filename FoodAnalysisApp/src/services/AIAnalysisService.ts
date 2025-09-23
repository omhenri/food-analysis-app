import { FoodItem, AnalysisResult, ChemicalSubstance, RecommendedIntake } from '../models/types';
import { BackendApiService, FoodItem as BackendFoodItem, BackendApiError } from './BackendApiService';

// AI Analysis configuration
const AI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = 'gpt-3.5-turbo';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class AIAnalysisService {
  private static instance: AIAnalysisService;
  private apiKey: string | null = null;
  private backendService: BackendApiService;
  private useBackend: boolean = true; // Default to backend integration

  private constructor() {
    this.backendService = BackendApiService.getInstance();
  }

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

  // Configure backend usage
  public setUseBackend(useBackend: boolean): void {
    this.useBackend = useBackend;
  }

  // Configure backend URL (for development/testing)
  public configureBackend(baseUrl?: string, timeout?: number): void {
    this.backendService.configure(baseUrl, timeout);
  }

  // Analyze foods using AI (via backend or direct API)
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    if (this.useBackend) {
      return this.analyzeFoodsViaBackend(foods);
    } else {
      return this.analyzeFoodsDirectly(foods);
    }
  }

  // Analyze foods via backend service
  private async analyzeFoodsViaBackend(foods: FoodItem[]): Promise<AnalysisResult[]> {
    try {
      console.log('Analyzing foods via backend service...');
      
      // Convert app's FoodItem format to backend format
      const backendFoods: BackendFoodItem[] = foods.map(food => ({
        name: food.name,
        mealType: food.mealType,
        portion: food.portion,
        quantity: 1, // Default quantity
        unit: 'serving', // Default unit
      }));

      // Make request to backend
      const backendResponse = await this.backendService.analyzeFoods(backendFoods);
      
      if (!backendResponse.success) {
        throw new Error(backendResponse.error || 'Backend analysis failed');
      }

      // Convert backend response to app format
      const analysisResults = this.backendService.convertToAnalysisResults(backendResponse);
      
      console.log('Backend analysis completed successfully:', analysisResults);
      return analysisResults;
    } catch (error) {
      console.error('Backend analysis failed:', error);
      
      if (error instanceof BackendApiError) {
        // Handle specific backend errors
        if (error.statusCode === 408 || error.errorCode === 'TIMEOUT') {
          throw new Error('Analysis request timed out. Please try again.');
        } else if (error.statusCode && error.statusCode >= 500) {
          throw new Error('Backend service is temporarily unavailable. Please try again later.');
        } else {
          throw new Error(`Analysis failed: ${error.message}`);
        }
      }
      
      throw new Error(`Analysis failed: ${error}`);
    }
  }

  // Analyze foods directly via AI API (fallback method)
  private async analyzeFoodsDirectly(foods: FoodItem[]): Promise<AnalysisResult[]> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured');
    }

    try {
      console.log('Analyzing foods directly via AI API...');
      const analysisPrompt = this.formatFoodForAnalysis(foods);
      const response = await this.makeAIRequest(analysisPrompt);
      return this.parseAnalysisResponse(response, foods);
    } catch (error) {
      console.error('Direct AI analysis failed:', error);
      throw new Error(`AI analysis failed: ${error}`);
    }
  }

  // Get recommended daily intake for adults aged 18-29
  public async getRecommendedIntake(age: number = 25, gender: 'male' | 'female' = 'male'): Promise<RecommendedIntake> {
    if (this.useBackend) {
      return this.getRecommendedIntakeViaBackend(age, gender);
    } else {
      return this.getRecommendedIntakeDirectly(age);
    }
  }

  // Get recommended intake via backend
  private async getRecommendedIntakeViaBackend(age: number, gender: 'male' | 'female'): Promise<RecommendedIntake> {
    try {
      console.log('Getting recommended intake via backend...');
      const backendData = await this.backendService.getRecommendedIntake(age, gender);
      
      // Convert backend format to app format
      return this.convertBackendRecommendedIntake(backendData);
    } catch (error) {
      console.error('Backend recommended intake request failed:', error);
      // Fallback to direct AI call or default values
      return this.getRecommendedIntakeDirectly(age);
    }
  }

  // Get recommended intake directly via AI (fallback)
  private async getRecommendedIntakeDirectly(age: number): Promise<RecommendedIntake> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured');
    }

    try {
      const prompt = `Provide recommended daily intake values in grams for adults aged ${age}. 
      Include major nutrients like protein, carbohydrates, fats, fiber, vitamins (A, C, D, E, K, B-complex), 
      minerals (calcium, iron, magnesium, potassium, sodium, zinc), and other important substances.
      Return as JSON object with substance names as keys and recommended amounts in grams as values.`;

      const response = await this.makeAIRequest(prompt);
      return this.parseRecommendedIntakeResponse(response);
    } catch (error) {
      console.error('Failed to get recommended intake:', error);
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
          throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
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

  // Convert backend recommended intake to app format
  private convertBackendRecommendedIntake(backendData: any): RecommendedIntake {
    return {
      protein: backendData.protein || 50,
      carbohydrates: backendData.carbohydrates || 300,
      fat: backendData.fat || 65,
      fiber: backendData.fiber || 25,
      sugar: backendData.sugar || 50,
      sodium: backendData.sodium || 2.3,
      calcium: backendData.calcium || 1,
      iron: backendData.iron || 0.018,
      'vitamin-c': backendData['vitamin-c'] || backendData.vitaminC || 0.09,
      'vitamin-d': backendData['vitamin-d'] || backendData.vitaminD || 0.00002,
      potassium: backendData.potassium || 3.5,
      magnesium: backendData.magnesium || 0.4,
    };
  }

  // Test connection to backend or AI service
  public async testConnection(): Promise<boolean> {
    if (this.useBackend) {
      try {
        return await this.backendService.testConnection();
      } catch (error) {
        console.error('Backend connection test failed:', error);
        return false;
      }
    }
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