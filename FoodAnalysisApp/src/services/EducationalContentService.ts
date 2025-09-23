import { EducationalContent } from '../models/types';

export interface NutrientEducationalData {
  [substanceName: string]: EducationalContent;
}

export class EducationalContentService {
  private static educationalData: NutrientEducationalData = {
    // Macronutrients
    'Calories': {
      healthImpact: 'Calories provide energy for all bodily functions. Too few can lead to fatigue and nutrient deficiencies, while excess calories are stored as fat.',
      recommendedSources: ['Whole grains', 'Lean proteins', 'Healthy fats', 'Fruits and vegetables'],
      reductionTips: ['Choose nutrient-dense foods', 'Control portion sizes', 'Increase physical activity', 'Limit processed foods'],
      optimalRange: '1800-2400 calories per day for adults aged 18-29'
    },
    'Protein': {
      healthImpact: 'Essential for muscle building, tissue repair, and immune function. Adequate protein helps maintain muscle mass and supports metabolism.',
      recommendedSources: ['Lean meats', 'Fish', 'Eggs', 'Legumes', 'Nuts', 'Greek yogurt', 'Quinoa'],
      reductionTips: ['Balance with other macronutrients', 'Choose lean protein sources', 'Avoid excessive protein supplements'],
      optimalRange: '46-56g per day, or 0.8g per kg of body weight'
    },
    'Fat': {
      healthImpact: 'Necessary for hormone production, vitamin absorption, and brain health. Focus on healthy unsaturated fats while limiting saturated and trans fats.',
      recommendedSources: ['Avocados', 'Olive oil', 'Nuts', 'Seeds', 'Fatty fish', 'Olives'],
      reductionTips: ['Choose unsaturated fats', 'Limit fried foods', 'Read nutrition labels', 'Cook with healthier oils'],
      optimalRange: '20-35% of total daily calories'
    },
    'Carbohydrates': {
      healthImpact: 'Primary energy source for the brain and muscles. Complex carbs provide sustained energy and fiber for digestive health.',
      recommendedSources: ['Whole grains', 'Fruits', 'Vegetables', 'Legumes', 'Sweet potatoes'],
      reductionTips: ['Choose complex over simple carbs', 'Limit refined sugars', 'Include fiber-rich options', 'Balance with protein'],
      optimalRange: '45-65% of total daily calories'
    },
    'Fiber': {
      healthImpact: 'Promotes digestive health, helps control blood sugar, and may reduce risk of heart disease and certain cancers.',
      recommendedSources: ['Whole grains', 'Fruits with skin', 'Vegetables', 'Legumes', 'Nuts', 'Seeds'],
      reductionTips: ['Increase gradually to avoid digestive discomfort', 'Drink plenty of water with high-fiber foods'],
      optimalRange: '25-35g per day for adults'
    },

    // Vitamins
    'Vitamin A': {
      healthImpact: 'Essential for vision, immune function, and cell growth. Deficiency can lead to night blindness and increased infection risk.',
      recommendedSources: ['Carrots', 'Sweet potatoes', 'Spinach', 'Kale', 'Liver', 'Eggs'],
      reductionTips: ['Avoid excessive supplements', 'Balance with other fat-soluble vitamins'],
      safetyInformation: 'High doses can be toxic. Stick to recommended amounts.',
      optimalRange: '700-900 μg per day'
    },
    'Vitamin C': {
      healthImpact: 'Powerful antioxidant that supports immune function, collagen synthesis, and iron absorption.',
      recommendedSources: ['Citrus fruits', 'Berries', 'Bell peppers', 'Broccoli', 'Tomatoes', 'Kiwi'],
      reductionTips: ['Excess is usually excreted, but very high doses may cause digestive upset'],
      optimalRange: '75-90 mg per day'
    },
    'Vitamin D': {
      healthImpact: 'Critical for bone health, immune function, and mood regulation. Deficiency is common, especially in winter.',
      recommendedSources: ['Sunlight exposure', 'Fatty fish', 'Fortified milk', 'Egg yolks', 'Supplements'],
      reductionTips: ['Monitor blood levels', 'Avoid excessive supplementation'],
      safetyInformation: 'Too much can cause calcium buildup and kidney problems.',
      optimalRange: '600-800 IU per day'
    },
    'Vitamin B12': {
      healthImpact: 'Essential for nerve function, red blood cell formation, and DNA synthesis. Deficiency can cause anemia and neurological problems.',
      recommendedSources: ['Meat', 'Fish', 'Dairy', 'Eggs', 'Fortified cereals', 'Nutritional yeast'],
      reductionTips: ['Excess is usually not harmful as it\'s water-soluble'],
      optimalRange: '2.4 μg per day'
    },
    'Folate': {
      healthImpact: 'Crucial for DNA synthesis and red blood cell formation. Especially important during pregnancy for fetal development.',
      recommendedSources: ['Leafy greens', 'Legumes', 'Fortified grains', 'Asparagus', 'Avocado'],
      reductionTips: ['High doses may mask B12 deficiency'],
      optimalRange: '400 μg per day'
    },

    // Minerals
    'Iron': {
      healthImpact: 'Essential for oxygen transport and energy production. Deficiency causes anemia and fatigue.',
      recommendedSources: ['Red meat', 'Poultry', 'Fish', 'Beans', 'Spinach', 'Fortified cereals'],
      reductionTips: ['Avoid taking with calcium or tea', 'Don\'t exceed recommended doses'],
      safetyInformation: 'Too much iron can be toxic and cause organ damage.',
      optimalRange: '8-18 mg per day'
    },
    'Calcium': {
      healthImpact: 'Critical for bone and teeth health, muscle function, and nerve transmission.',
      recommendedSources: ['Dairy products', 'Leafy greens', 'Sardines', 'Almonds', 'Fortified plant milks'],
      reductionTips: ['Balance with magnesium and vitamin D', 'Spread intake throughout the day'],
      optimalRange: '1000-1200 mg per day'
    },
    'Magnesium': {
      healthImpact: 'Involved in over 300 enzyme reactions. Important for muscle and nerve function, blood sugar control.',
      recommendedSources: ['Nuts', 'Seeds', 'Whole grains', 'Leafy greens', 'Dark chocolate'],
      reductionTips: ['High doses from supplements may cause digestive issues'],
      optimalRange: '310-420 mg per day'
    },
    'Potassium': {
      healthImpact: 'Essential for heart function, muscle contractions, and blood pressure regulation.',
      recommendedSources: ['Bananas', 'Potatoes', 'Beans', 'Spinach', 'Avocados', 'Yogurt'],
      reductionTips: ['Usually not a concern unless you have kidney problems'],
      optimalRange: '2600-3400 mg per day'
    },
    'Zinc': {
      healthImpact: 'Important for immune function, wound healing, and protein synthesis.',
      recommendedSources: ['Meat', 'Shellfish', 'Legumes', 'Seeds', 'Nuts', 'Dairy'],
      reductionTips: ['High doses can interfere with copper absorption', 'Don\'t exceed 40mg per day'],
      safetyInformation: 'Too much can suppress immune function and cause nausea.',
      optimalRange: '8-11 mg per day'
    },

    // Harmful substances
    'Sodium': {
      healthImpact: 'Excessive sodium increases blood pressure and risk of heart disease and stroke.',
      reductionTips: [
        'Cook at home more often',
        'Use herbs and spices instead of salt',
        'Read nutrition labels',
        'Choose fresh over processed foods',
        'Rinse canned foods'
      ],
      safetyInformation: 'Most people consume 2-3 times the recommended amount.',
      optimalRange: 'Less than 2300 mg per day'
    },
    'Saturated Fat': {
      healthImpact: 'High intake can raise cholesterol levels and increase heart disease risk.',
      reductionTips: [
        'Choose lean meats',
        'Use plant-based oils',
        'Limit full-fat dairy',
        'Avoid fried foods',
        'Read food labels carefully'
      ],
      safetyInformation: 'Should be less than 10% of total daily calories.',
      optimalRange: 'Less than 22g per day for a 2000-calorie diet'
    },
    'Trans Fat': {
      healthImpact: 'Artificial trans fats raise bad cholesterol and lower good cholesterol, significantly increasing heart disease risk.',
      reductionTips: [
        'Avoid partially hydrogenated oils',
        'Limit processed baked goods',
        'Check ingredient lists',
        'Choose natural fats instead'
      ],
      safetyInformation: 'No safe level - should be avoided completely.',
      optimalRange: '0g per day'
    },
    'Added Sugar': {
      healthImpact: 'Contributes to tooth decay, weight gain, and increased risk of diabetes and heart disease.',
      reductionTips: [
        'Read nutrition labels',
        'Choose whole fruits over juice',
        'Limit sugary drinks',
        'Gradually reduce sweetness in foods',
        'Use natural sweeteners sparingly'
      ],
      safetyInformation: 'Hidden in many processed foods.',
      optimalRange: 'Less than 25g per day for women, 36g for men'
    }
  };

  static getEducationalContent(substanceName: string): EducationalContent | null {
    return this.educationalData[substanceName] || null;
  }

  static getAllSubstances(): string[] {
    return Object.keys(this.educationalData);
  }

  static getDeficiencyRecommendations(substanceName: string): string[] {
    const content = this.getEducationalContent(substanceName);
    return content?.recommendedSources || [];
  }

  static getExcessReductionTips(substanceName: string): string[] {
    const content = this.getEducationalContent(substanceName);
    return content?.reductionTips || [];
  }

  static getHealthImpact(substanceName: string): string {
    const content = this.getEducationalContent(substanceName);
    return content?.healthImpact || 'No information available for this substance.';
  }

  static getSafetyInformation(substanceName: string): string | undefined {
    const content = this.getEducationalContent(substanceName);
    return content?.safetyInformation;
  }

  static getOptimalRange(substanceName: string): string | undefined {
    const content = this.getEducationalContent(substanceName);
    return content?.optimalRange;
  }
}