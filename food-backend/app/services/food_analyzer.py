import os
import logging
import uuid
import json
from openai import OpenAI
from typing import Dict, List, Any, Optional
from app.models.response_models import FoodAnalysisResponse, IngredientQuantity, SubstanceRelationship, SubstanceContribution, CategorizedTip, TipCategory
from app.models.request_models import FoodAnalysisRequest

logger = logging.getLogger(__name__)

class FoodAnalyzer:
    """Service for analyzing food using GenAI prompt chaining"""

    def __init__(self):
        # Try OpenRouter first, then fallback to OpenAI
        self.api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('OPENAI_API_KEY')
        self.provider = 'openrouter' if os.getenv('OPENROUTER_API_KEY') else 'openai'

        # Use cost-effective model for OpenRouter, keep GPT-4 for direct OpenAI
        if self.provider == 'openrouter':
            self.model = os.getenv('OPENROUTER_MODEL', 'anthropic/claude-3-haiku')
        else:
            self.model = os.getenv('OPENAI_MODEL', 'gpt-4')

        if not self.api_key:
            logger.warning("No API key found (OPENROUTER_API_KEY or OPENAI_API_KEY). Using mock responses.")
            self.use_mock = True
            self.client = None
        else:
            self.use_mock = False

            # Create OpenAI client with proper configuration
            if self.provider == 'openrouter':
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://openrouter.ai/api/v1"
                )
                logger.info(f"Using OpenRouter with model: {self.model}")
            else:
                self.client = OpenAI(api_key=self.api_key)
                logger.info(f"Using OpenAI with model: {self.model}")

        # Disclaimer to include in responses
        self.disclaimer = "This is AI-generated information for educational purposes only and should not be considered as professional medical or nutritional advice."

    def analyze_food(self, food_name: str) -> Dict[str, Any]:
        """
        Analyze a food using optimized GenAI prompt chaining with only 1 request
        Returns structured response with ingredients, substances, and tips
        """
        try:
            if self.use_mock:
                return self._get_mock_response(food_name)

            # Single comprehensive analysis call
            ingredients, substances, mitigation_tips, categorized_tips = self._analyze_food_comprehensive(food_name)
            print(f"Ingredients: {ingredients}")
            print(f"Substances: {substances}")
            print(f"Tips: {mitigation_tips}")
            print(f"Categorized Tips: {len(categorized_tips)} tips across {len(set(t.category.value for t in categorized_tips))} categories")

            return FoodAnalysisResponse(
                ingredients=ingredients,
                ingredient_quantities=[],  # Empty for backward compatibility
                substances=substances,
                substance_relationships=[],  # Empty for backward compatibility
                mitigation_tips=mitigation_tips,
                categorized_tips=categorized_tips,
                disclaimer=self.disclaimer
            ).to_dict()

        except Exception as e:
            logger.error(f"Error analyzing food {food_name}: {str(e)}")
            # Return fallback response
            return self._get_fallback_response(food_name)

    def extract_ingredients(self, food_name: str) -> List[Dict[str, Any]]:
        """
        Extract ingredients from food name using focused AI prompt
        Returns list of ingredient objects with name and optional quantity
        """
        try:
            if self.use_mock:
                return self._get_mock_ingredients(food_name)

            # Single focused extraction call
            ingredients_data = self._extract_ingredients_ai(food_name)
            print(f"Extracted {len(ingredients_data)} ingredients from {food_name}")

            return ingredients_data

        except Exception as e:
            logger.error(f"Error extracting ingredients for {food_name}: {str(e)}")
            # Return fallback ingredients
            return self._get_fallback_ingredients(food_name)

    def analyze_ingredients(self, ingredients: List[str], user_profile=None, portion_for_one: bool = True) -> Dict[str, Any]:
        """
        Analyze food based on provided ingredient list
        Returns structured response with substances, tips, and relationships
        """
        try:
            if self.use_mock:
                return self._get_mock_response_with_profile("Custom Recipe", user_profile)

            # Convert ingredient list to formatted string for AI
            ingredients_text = self._format_ingredients_for_analysis(ingredients)

            # Get comprehensive analysis based on ingredients
            substances, substance_relationships, mitigation_tips, categorized_tips = self._analyze_ingredients_ai(
                ingredients_text, portion_for_one, user_profile
            )

            print(f"Analyzed {len(ingredients)} ingredients: {ingredients}")
            print(f"Found {len(substances)} substances and {len(categorized_tips)} tips")

            # Create response with selected ingredients
            ingredient_quantities = []
            for ingredient in ingredients:
                ingredient_quantities.append(IngredientQuantity(
                    name=ingredient,
                    original_amount=None,
                    gram_amount=None,
                    per_person=portion_for_one
                ))

            return FoodAnalysisResponse(
                ingredients=ingredients,
                ingredient_quantities=ingredient_quantities,
                substances=substances,
                substance_relationships=substance_relationships,
                mitigation_tips=mitigation_tips,
                categorized_tips=categorized_tips,
                disclaimer=self.disclaimer,
                portion_for_one=portion_for_one,
                personalized_recommendations=None
            ).to_dict()

        except Exception as e:
            logger.error(f"Error analyzing ingredients: {str(e)}")
            # Return fallback response
            return self._get_fallback_response("Custom Recipe")

    def analyze_meal(self, food_name: str, meal_type: str) -> Dict[str, Any]:
        """
        Analyze a meal using single AI prompt for both ingredients and substances
        Returns structured response with ingredients and substances for meal tracking
        """
        try:
            if self.use_mock:
                return self._get_mock_meal_response(food_name, meal_type)

            # Single comprehensive analysis call for meal
            ingredients, substances = self._analyze_meal_ai(food_name, meal_type)
            print(f"Meal Analysis - {food_name} ({meal_type}): {len(ingredients)} ingredients, {len(substances)} substances")

            from app.models.response_models import MealAnalysisResponse, MealIngredient, MealSubstance

            # Convert to response model
            meal_ingredients = [MealIngredient(name=ing['name'], quantity=ing['quantity']) for ing in ingredients]
            meal_substances = [MealSubstance(
                name=sub['name'],
                quantity=sub['quantity'],
                unit=sub['unit'],
                category=sub['category'],
                standard_consumption=sub['standard_consumption'],
                health_impact=sub['health_impact']
            ) for sub in substances]

            response = MealAnalysisResponse(
                food_name=food_name,
                meal_type=meal_type,
                ingredients=meal_ingredients,
                substances=meal_substances
            )

            return response.to_dict()

        except Exception as e:
            logger.error(f"Error analyzing meal {food_name} ({meal_type}): {str(e)}")
            # Return fallback response
            return self._get_fallback_meal_response(food_name, meal_type)

    def analyze_food_with_profile(self, analysis_request: FoodAnalysisRequest) -> Dict[str, Any]:
        """
        Analyze a food using optimized GenAI prompt chaining with portion specification and profile personalization
        Returns structured response with ingredients, quantities, substances, tips, and personalized recommendations
        """
        food_name = analysis_request.food_name
        user_profile = analysis_request.user_profile
        portion_for_one = analysis_request.portion_for_one

        try:
            if self.use_mock:
                return self._get_mock_response_with_profile(food_name, user_profile)

            # Step 1: Combined analysis - ingredients with quantities, substances with relationships, and general tips in one call
            # Include profile information for portion personalization if available
            ingredients, ingredient_quantities, substances, substance_relationships, mitigation_tips, categorized_tips = self._analyze_food_with_relationships_and_profile(
                food_name, portion_for_one, user_profile
            )
            print(f"Ingredients: {ingredients}")
            print(f"Ingredient Quantities: {[iq.name + (f' ({iq.gram_amount}g)' if iq.gram_amount else '') for iq in ingredient_quantities]}")
            print(f"Substances: {substances}")
            print(f"Substance Relationships: {[sr.name + f' ({len(sr.contributions)} contributors, impact: {sr.health_impact}, qty: {sr.total_quantity})' for sr in substance_relationships]}")
            print(f"Tips: {mitigation_tips}")
            print(f"Categorized Tips: {len(categorized_tips)} tips across {len(set(t.category.value for t in categorized_tips))} categories")

            # Debug: Print detailed relationship info
            for sr in substance_relationships:
                print(f"  Relationship: {sr.name} - {sr.health_impact} - {len(sr.contributions)} contributions")
                for contrib in sr.contributions[:2]:  # Show first 2 contributions
                    print(f"    {contrib.ingredient_name}: {contrib.contribution_percentage}% ({contrib.relationship_type})")

            # Step 2: Generate personalized recommendations if profile is available (2nd call)
            personalized_recommendations = None
            if user_profile:
                personalized_recommendations = self._generate_personalized_recommendations(
                    food_name, ingredients, substances, user_profile
                )
                print(f"Personalized: {personalized_recommendations}")

            return FoodAnalysisResponse(
                ingredients=ingredients,
                ingredient_quantities=ingredient_quantities,
                substances=substances,
                substance_relationships=substance_relationships,
                mitigation_tips=mitigation_tips,
                categorized_tips=categorized_tips,
                disclaimer=self.disclaimer,
                portion_for_one=portion_for_one,
                personalized_recommendations=personalized_recommendations
            ).to_dict()

        except Exception as e:
            logger.error(f"Error analyzing food {food_name}: {str(e)}")
            # Return fallback response
            return self._get_fallback_response(food_name)

    def _analyze_food_comprehensive(self, food_name: str) -> tuple[List[str], List[str], List[str], List[CategorizedTip]]:
        """
        Comprehensive food analysis in a single AI call with structured JSON response
        Returns: (ingredients, substances, mitigation_tips, categorized_tips)
        """
        prompt = f"""
        Analyze the food "{food_name}" and provide a complete nutritional breakdown.
        Return ONLY a valid JSON object with the following structure:

        {{
          "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
          "substances": ["substance1", "substance2", "substance3"],
          "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
        }}

        Focus on:
        - Main ingredients typically found in this food (maximum 10)
        - Beneficial vitamins, minerals, and nutrients (maximum 8)
        - Practical health tips for maximizing benefits, portion control, and preparation (maximum 4)

        Return ONLY valid JSON, no additional text or formatting.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a nutrition expert. Always return valid JSON responses with the exact structure requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()

            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text}")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Extract data from JSON structure
                ingredients = parsed_data.get('ingredients', [])
                substances = parsed_data.get('substances', [])
                mitigation_tips = parsed_data.get('tips', [])

                # Validate and ensure we have arrays
                if not isinstance(ingredients, list):
                    ingredients = ["Unable to determine ingredients"]
                if not isinstance(substances, list):
                    substances = ["Analysis not available"]
                if not isinstance(mitigation_tips, list):
                    mitigation_tips = ["General healthy eating advice applies"]

                # Ensure we have reasonable defaults
                if not ingredients:
                    ingredients = ["Unable to determine ingredients"]
                if not substances:
                    substances = ["Analysis not available"]
                if not mitigation_tips:
                    mitigation_tips = ["General healthy eating advice applies"]

            # Keep all results (no arbitrary limits)
            # ingredients = ingredients  # Keep all
            # substances = substances  # Keep all
            # mitigation_tips = mitigation_tips  # Keep all

                # Generate categorized tips
                categorized_tips = self._generate_categorized_tips(food_name, ingredients, substances)

                return ingredients, substances, mitigation_tips, categorized_tips

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}, Error: {str(e)}")
                raise  # Re-raise to be caught by outer exception handler

        except Exception as e:
            logger.error(f"Error in comprehensive food analysis: {str(e)}")
            return (
                ["Unable to determine ingredients"],
                ["Analysis not available"],
                ["General healthy eating advice applies"],
                [
                    CategorizedTip(
                        id=str(uuid.uuid4()),
                        category=TipCategory.LIFESTYLE,
                        title="General Healthy Eating",
                        content="Practice mindful eating and maintain balanced nutrition.",
                        priority='medium',
                        relevance_score=0.5,
                        tags=["general", "health"]
                    )
                ]
            )

    def _analyze_meal_ai(self, food_name: str, meal_type: str) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Analyze a meal in a single AI call for both ingredients and substances
        Returns: (ingredients, substances)
        """
        prompt = f"""
        Analyze the meal "{food_name}" being eaten as {meal_type}.
        Return ONLY a valid JSON object with the following structure:

        {{
          "ingredients": [
            {{"name": "ingredient_name", "quantity": "quantity_description"}},
            {{"name": "another_ingredient", "quantity": "quantity_description"}}
          ],
          "substances": [
            {{
              "name": "substance_name",
              "quantity": 100.0,
              "unit": "mg",
              "category": "vitamin",
              "standard_consumption": 90.0,
              "health_impact": "positive"
            }},
            {{
              "name": "another_substance",
              "quantity": 50.0,
              "unit": "g",
              "category": "mineral",
              "standard_consumption": 75.0,
              "health_impact": "neutral"
            }}
          ]
        }}

        Guidelines:
        - ingredients: Main ingredients with realistic quantities (3-8 ingredients)
        - substances: Key nutrients with quantities, units, categories, and standard consumption for 18-29 year old adults
        - standard_consumption: Daily recommended amount for healthy adults
        - health_impact: "positive", "neutral", or "negative"
        - categories: "vitamin", "mineral", "protein", "carbohydrate", "fat", "antioxidant", "fiber", etc.

        Return ONLY valid JSON, no additional text or formatting.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a nutrition expert. Always return valid JSON responses with the exact structure requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()

            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text}")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Extract data from JSON structure
                ingredients = parsed_data.get('ingredients', [])
                substances = parsed_data.get('substances', [])

                # Validate structure
                if not isinstance(ingredients, list):
                    ingredients = []
                if not isinstance(substances, list):
                    substances = []

                # Ensure each ingredient has required fields
                validated_ingredients = []
                for ing in ingredients:
                    if isinstance(ing, dict) and 'name' in ing and 'quantity' in ing:
                        validated_ingredients.append({
                            'name': str(ing['name']),
                            'quantity': str(ing['quantity'])
                        })

                # Ensure each substance has required fields with defaults
                validated_substances = []
                for sub in substances:
                    if isinstance(sub, dict):
                        validated_substances.append({
                            'name': str(sub.get('name', 'Unknown')),
                            'quantity': float(sub.get('quantity', 0.0)),
                            'unit': str(sub.get('unit', 'mg')),
                            'category': str(sub.get('category', 'general')),
                            'standard_consumption': float(sub.get('standard_consumption', 100.0)),
                            'health_impact': str(sub.get('health_impact', 'neutral'))
                        })

                # Ensure we have reasonable defaults
                if not validated_ingredients:
                    validated_ingredients = [
                        {'name': 'Unable to determine ingredients', 'quantity': 'N/A'}
                    ]
                if not validated_substances:
                    validated_substances = [
                        {
                            'name': 'Analysis not available',
                            'quantity': 0.0,
                            'unit': 'N/A',
                            'category': 'general',
                            'standard_consumption': 100.0,
                            'health_impact': 'neutral'
                        }
                    ]

                return validated_ingredients, validated_substances

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}, Error: {str(e)}")
                raise  # Re-raise to be caught by outer exception handler

        except Exception as e:
            logger.error(f"Error in meal analysis: {str(e)}")
            return (
                [{'name': 'Unable to determine ingredients', 'quantity': 'N/A'}],
                [{
                    'name': 'Analysis not available',
                    'quantity': 0.0,
                    'unit': 'N/A',
                    'category': 'general',
                    'standard_consumption': 100.0,
                    'health_impact': 'neutral'
                }]
            )

    def _analyze_food_with_quantities(self, food_name: str, portion_for_one: bool = True) -> tuple[List[str], List[IngredientQuantity], List[str], List[str]]:
        """
        Comprehensive food analysis with quantity extraction and gram conversion using structured JSON response
        Returns: (ingredients, ingredient_quantities, substances, mitigation_tips)
        """
        portion_text = "for one person" if portion_for_one else "for multiple people (scale down to single serving)"

        prompt = f"""
        Analyze the food "{food_name}" and provide a complete nutritional breakdown {portion_text}.
        Return ONLY a valid JSON object with the following structure:

        {{
          "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
          "quantities": [
            {{"name": "chicken breast", "original_amount": "150g", "gram_amount": 150}},
            {{"name": "spinach", "original_amount": "2 cups", "gram_amount": 60}},
            {{"name": "olive oil", "original_amount": "1 tbsp", "gram_amount": 14}},
            {{"name": "salt", "original_amount": "to taste", "gram_amount": null}}
          ],
          "substances": ["Vitamin C", "antioxidants", "fiber", "protein"],
          "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
        }}

        Focus on:
        - Main ingredients with realistic quantities {portion_text} (maximum 10)
        - Convert common measurements to grams when possible (use null for unknown)
        - Beneficial vitamins, minerals, and nutrients (maximum 8)
        - Practical health tips considering portion sizes (maximum 4)

        Return ONLY valid JSON, no additional text or formatting.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a nutrition expert. Always return valid JSON responses with the exact structure requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()

            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text}")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Extract data from JSON structure
                ingredients = parsed_data.get('ingredients', [])
                quantities_data = parsed_data.get('quantities', [])
                substances = parsed_data.get('substances', [])
                mitigation_tips = parsed_data.get('tips', [])

                # Validate and ensure we have arrays
                if not isinstance(ingredients, list):
                    ingredients = ["Unable to determine ingredients"]
                if not isinstance(quantities_data, list):
                    quantities_data = []
                if not isinstance(substances, list):
                    substances = ["Analysis not available"]
                if not isinstance(mitigation_tips, list):
                    mitigation_tips = ["General healthy eating advice applies"]

                # Process ingredient quantities from JSON
                ingredient_quantities = []
                for qty_data in quantities_data:
                    if isinstance(qty_data, dict) and 'name' in qty_data:
                        name = qty_data['name']
                        original_amount = qty_data.get('original_amount')
                        gram_amount = qty_data.get('gram_amount')

                        # Validate gram_amount
                        if gram_amount is not None:
                            try:
                                gram_amount = float(gram_amount)
                                if gram_amount < 0 or gram_amount > 5000:
                                    logger.warning(f"Invalid gram amount {gram_amount} for {name}, setting to None")
                                    gram_amount = None
                            except (ValueError, TypeError):
                                gram_amount = None

                        ingredient_quantities.append(IngredientQuantity(
                            name=name,
                            original_amount=original_amount if original_amount and str(original_amount).lower() not in ['unknown', 'none', ''] else None,
                            gram_amount=gram_amount,
                            per_person=portion_for_one
                        ))

                # Create ingredient quantities from ingredients list if not already parsed
                if not ingredient_quantities and ingredients:
                    for ingredient in ingredients:
                        ingredient_quantities.append(IngredientQuantity(
                            name=ingredient,
                            original_amount=None,
                            gram_amount=None,
                            per_person=portion_for_one
                        ))

                # Ensure we have reasonable defaults
                if not ingredients:
                    ingredients = ["Unable to determine ingredients"]
                    ingredient_quantities = [IngredientQuantity(
                        name="Unable to determine ingredients",
                        original_amount=None,
                        gram_amount=None,
                        per_person=portion_for_one
                    )]
                if not substances:
                    substances = ["Analysis not available"]
                if not mitigation_tips:
                    mitigation_tips = ["General healthy eating advice applies"]

                # Keep all results (no arbitrary limits)
                # ingredients = ingredients  # Keep all
                # ingredient_quantities = ingredient_quantities  # Keep all
                # substances = substances  # Keep all
                # mitigation_tips = mitigation_tips  # Keep all

                return ingredients, ingredient_quantities, substances, mitigation_tips

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}, Error: {str(e)}")
                raise  # Re-raise to be caught by outer exception handler

        except Exception as e:
            logger.error(f"Error in quantity food analysis: {str(e)}")
            fallback_quantity = IngredientQuantity(
                name="Unable to determine ingredients",
                original_amount=None,
                gram_amount=None,
                per_person=portion_for_one
            )
            return (
                ["Unable to determine ingredients"],
                [fallback_quantity],
                ["Analysis not available"],
                ["General healthy eating advice applies"]
            )

    def _analyze_food_with_quantities_and_profile(self, food_name: str, portion_for_one: bool = True, user_profile=None) -> tuple[List[str], List[IngredientQuantity], List[str], List[str]]:
        """
        Comprehensive food analysis with quantity extraction, gram conversion, and profile personalization using structured JSON response
        Returns: (ingredients, ingredient_quantities, substances, mitigation_tips)
        """
        portion_text = "for one person" if portion_for_one else "for multiple people (scale down to single serving)"

        # Include profile information for portion personalization
        profile_text = ""
        if user_profile:
            profile_text = f"""
            User Profile Information:
            - Age group: {user_profile.age_group}
            - Weight: {user_profile.weight} cm
            - Height: {user_profile.height} cm

            Consider appropriate portion sizes based on the user's age group and physical characteristics.
            For example:
            - Children (0-18): Smaller portions, focus on nutrient-dense foods
            - Adults (19-40): Standard portions with balanced nutrition
            - Seniors (>40): Moderate portions, consider digestive health and nutrient absorption
            """

        prompt = f"""
        Analyze the food "{food_name}" and provide a complete nutritional breakdown {portion_text}.
        {profile_text}
        Return ONLY a valid JSON object with the following structure:

        {{
          "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
          "quantities": [
            {{"name": "chicken breast", "original_amount": "150g", "gram_amount": 150}},
            {{"name": "spinach", "original_amount": "2 cups", "gram_amount": 60}},
            {{"name": "olive oil", "original_amount": "1 tbsp", "gram_amount": 14}},
            {{"name": "salt", "original_amount": "to taste", "gram_amount": null}}
          ],
          "substances": ["Vitamin C", "antioxidants", "fiber", "protein"],
          "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
        }}

        Focus on:
        - Main ingredients with realistic quantities {portion_text} (maximum 10)
        - Convert common measurements to grams when possible (use null for unknown)
        - Beneficial vitamins, minerals, and nutrients (maximum 8)
        - Practical health tips considering portion sizes and user profile (maximum 4)

        Return ONLY valid JSON, no additional text or formatting.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a nutrition expert. Always return valid JSON responses with the exact structure requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=900,  # Increased for profile information
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()

            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text}")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Extract data from JSON structure
                ingredients = parsed_data.get('ingredients', [])
                quantities_data = parsed_data.get('quantities', [])
                substances = parsed_data.get('substances', [])
                mitigation_tips = parsed_data.get('tips', [])

                # Validate and ensure we have arrays
                if not isinstance(ingredients, list):
                    ingredients = ["Unable to determine ingredients"]
                if not isinstance(quantities_data, list):
                    quantities_data = []
                if not isinstance(substances, list):
                    substances = ["Analysis not available"]
                if not isinstance(mitigation_tips, list):
                    mitigation_tips = ["General healthy eating advice applies"]

                # Process ingredient quantities from JSON
                ingredient_quantities = []
                for qty_data in quantities_data:
                    if isinstance(qty_data, dict) and 'name' in qty_data:
                        name = qty_data['name']
                        original_amount = qty_data.get('original_amount')
                        gram_amount = qty_data.get('gram_amount')

                        # Validate gram_amount
                        if gram_amount is not None:
                            try:
                                gram_amount = float(gram_amount)
                                if gram_amount < 0 or gram_amount > 5000:
                                    logger.warning(f"Invalid gram amount {gram_amount} for {name}, setting to None")
                                    gram_amount = None
                            except (ValueError, TypeError):
                                gram_amount = None

                        ingredient_quantities.append(IngredientQuantity(
                            name=name,
                            original_amount=original_amount if original_amount and str(original_amount).lower() not in ['unknown', 'none', ''] else None,
                            gram_amount=gram_amount,
                            per_person=portion_for_one
                        ))

                # Create ingredient quantities from ingredients list if not already parsed
                if not ingredient_quantities and ingredients:
                    for ingredient in ingredients:
                        ingredient_quantities.append(IngredientQuantity(
                            name=ingredient,
                            original_amount=None,
                            gram_amount=None,
                            per_person=portion_for_one
                        ))

                # Ensure we have reasonable defaults
                if not ingredients:
                    ingredients = ["Unable to determine ingredients"]
                    ingredient_quantities = [IngredientQuantity(
                        name="Unable to determine ingredients",
                        original_amount=None,
                        gram_amount=None,
                        per_person=portion_for_one
                    )]
                if not substances:
                    substances = ["Analysis not available"]
                if not mitigation_tips:
                    mitigation_tips = ["General healthy eating advice applies"]

                # Keep all results (no arbitrary limits)
                # ingredients = ingredients  # Keep all
                # ingredient_quantities = ingredient_quantities  # Keep all
                # substances = substances  # Keep all
                # mitigation_tips = mitigation_tips  # Keep all

                return ingredients, ingredient_quantities, substances, mitigation_tips

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}, Error: {str(e)}")
                raise  # Re-raise to be caught by outer exception handler

        except Exception as e:
            logger.error(f"Error in quantity food analysis with profile: {str(e)}")
            fallback_quantity = IngredientQuantity(
                name="Unable to determine ingredients",
                original_amount=None,
                gram_amount=None,
                per_person=portion_for_one
            )
            return (
                ["Unable to determine ingredients"],
                [fallback_quantity],
                ["Analysis not available"],
                ["General healthy eating advice applies"]
            )

    def _analyze_food_with_relationships_and_profile(self, food_name: str, portion_for_one: bool = True, user_profile=None) -> tuple[List[str], List[IngredientQuantity], List[str], List[SubstanceRelationship], List[str], List[CategorizedTip]]:
        """
        Comprehensive food analysis with quantity extraction, substance relationships, and profile personalization using structured JSON response
        Returns: (ingredients, ingredient_quantities, substances, substance_relationships, mitigation_tips, categorized_tips)
        """
        portion_text = "for one person" if portion_for_one else "for multiple people (scale down to single serving)"

        # Include profile information for portion personalization
        profile_text = ""
        if user_profile:
            profile_text = f"""
            User Profile Information:
            - Age group: {user_profile.age_group}
            - Weight: {user_profile.weight} cm
            - Height: {user_profile.height} cm

            Consider appropriate portion sizes based on the user's age group and physical characteristics.
            For example:
            - Children (0-18): Smaller portions, focus on nutrient-dense foods
            - Adults (19-40): Standard portions with balanced nutrition
            - Seniors (>40): Moderate portions, consider digestive health and nutrient absorption
            """

        prompt = f"""
        Analyze the food "{food_name}" and provide a complete nutritional breakdown {portion_text}.
        {profile_text}
        Return ONLY a valid JSON object with the following structure:

        {{
          "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
          "quantities": [
            {{"name": "chicken breast", "original_amount": "150g", "gram_amount": 150}},
            {{"name": "spinach", "original_amount": "2 cups", "gram_amount": 60}},
            {{"name": "olive oil", "original_amount": "1 tbsp", "gram_amount": 14}},
            {{"name": "salt", "original_amount": "to taste", "gram_amount": null}}
          ],
          "substances": ["Vitamin C", "protein", "sodium", "fiber", "antioxidants"],
          "relationships": [
            {{
              "name": "Vitamin C",
              "category": "vitamin",
              "health_impact": "positive",
              "total_quantity": 90,
              "unit": "mg",
              "contributions": [
                {{
                  "ingredient_name": "orange",
                  "quantity_grams": 80,
                  "contribution_percentage": 89,
                  "relationship_type": "primary"
                }},
                {{
                  "ingredient_name": "strawberry",
                  "quantity_grams": 8,
                  "contribution_percentage": 9,
                  "relationship_type": "secondary"
                }}
              ]
            }},
            {{
              "name": "Sodium",
              "category": "mineral",
              "health_impact": "negative",
              "total_quantity": 450,
              "unit": "mg",
              "contributions": [
                {{
                  "ingredient_name": "salt",
                  "quantity_grams": 400,
                  "contribution_percentage": 89,
                  "relationship_type": "primary"
                }}
              ]
            }}
          ],
          "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
        }}

        Focus on:
        - Main ingredients with realistic quantities {portion_text} (maximum 10)
        - Convert common measurements to grams when possible (use null for unknown)
        - ALL absorbable substances (positive, neutral, negative health impacts) (maximum 8)
        - Complete ingredient-substance relationship mapping (maximum 8 relationships)
        - Practical health tips considering all substances present (maximum 4)

        Health impact categories:
        - positive: beneficial for health (e.g., Vitamin C, fiber, antioxidants, omega-3, protein)
        - neutral: neither clearly beneficial nor harmful (e.g., water, some minerals in normal amounts)
        - negative: potentially harmful or should be limited (e.g., excess sodium, trans fats, artificial additives, excess sugar)

        Return ONLY valid JSON, no additional text or formatting.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a nutrition expert. Always return valid JSON responses with the exact structure requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,  # Increased for relationship data
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()

            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text}")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Extract data from JSON structure
                ingredients = parsed_data.get('ingredients', [])
                quantities_data = parsed_data.get('quantities', [])
                substances = parsed_data.get('substances', [])
                relationships_data = parsed_data.get('relationships', [])
                mitigation_tips = parsed_data.get('tips', [])

                # Validate and ensure we have arrays
                if not isinstance(ingredients, list):
                    ingredients = ["Unable to determine ingredients"]
                if not isinstance(quantities_data, list):
                    quantities_data = []
                if not isinstance(substances, list):
                    substances = ["Analysis not available"]
                if not isinstance(relationships_data, list):
                    relationships_data = []
                if not isinstance(mitigation_tips, list):
                    mitigation_tips = ["General healthy eating advice applies"]

                # Process ingredient quantities from JSON
                ingredient_quantities = []
                for qty_data in quantities_data:
                    if isinstance(qty_data, dict) and 'name' in qty_data:
                        name = qty_data['name']
                        original_amount = qty_data.get('original_amount')
                        gram_amount = qty_data.get('gram_amount')

                        # Validate gram_amount
                        if gram_amount is not None:
                            try:
                                gram_amount = float(gram_amount)
                                if gram_amount < 0 or gram_amount > 5000:
                                    logger.warning(f"Invalid gram amount {gram_amount} for {name}, setting to None")
                                    gram_amount = None
                            except (ValueError, TypeError):
                                gram_amount = None

                        ingredient_quantities.append(IngredientQuantity(
                            name=name,
                            original_amount=original_amount if original_amount and str(original_amount).lower() not in ['unknown', 'none', ''] else None,
                            gram_amount=gram_amount,
                            per_person=portion_for_one
                        ))

                # Process substance relationships from JSON
                substance_relationships = []
                for rel_data in relationships_data:
                    if isinstance(rel_data, dict) and 'name' in rel_data:
                        name = rel_data['name']
                        category = rel_data.get('category', 'unknown')
                        health_impact = rel_data.get('health_impact', 'neutral')

                        # Validate health impact categories
                        valid_impacts = ['positive', 'neutral', 'negative']
                        if health_impact.lower() not in valid_impacts:
                            health_impact = 'neutral'

                        total_quantity = rel_data.get('total_quantity')
                        unit = rel_data.get('unit', 'units')
                        contributions_data = rel_data.get('contributions', [])

                        # Process contributions
                        contributions = []
                        if isinstance(contributions_data, list):
                            for contrib_data in contributions_data:
                                if isinstance(contrib_data, dict):
                                    ingredient_name = contrib_data.get('ingredient_name', '')
                                    quantity_grams = contrib_data.get('quantity_grams')
                                    contribution_percentage = contrib_data.get('contribution_percentage')
                                    relationship_type = contrib_data.get('relationship_type', 'unknown')

                                    # Validate numeric values
                                    if quantity_grams is not None:
                                        try:
                                            quantity_grams = float(quantity_grams)
                                        except (ValueError, TypeError):
                                            quantity_grams = None

                                    if contribution_percentage is not None:
                                        try:
                                            contribution_percentage = float(contribution_percentage)
                                        except (ValueError, TypeError):
                                            contribution_percentage = None

                                    if ingredient_name:
                                        contributions.append(SubstanceContribution(
                                            ingredient_name=ingredient_name,
                                            quantity_grams=quantity_grams,
                                            contribution_percentage=contribution_percentage,
                                            relationship_type=relationship_type
                                        ))

                        # Validate total_quantity
                        if total_quantity is not None:
                            try:
                                total_quantity = float(total_quantity)
                            except (ValueError, TypeError):
                                total_quantity = None

                        substance_relationships.append(SubstanceRelationship(
                            name=name,
                            category=category,
                            health_impact=health_impact,
                            total_quantity=total_quantity,
                            unit=unit,
                            contributions=contributions
                        ))

                # Create ingredient quantities from ingredients list if not already parsed
                if not ingredient_quantities and ingredients:
                    for ingredient in ingredients:
                        ingredient_quantities.append(IngredientQuantity(
                            name=ingredient,
                            original_amount=None,
                            gram_amount=None,
                            per_person=portion_for_one
                        ))

                # Create basic substance relationships if not already parsed
                if not substance_relationships and substances:
                    for substance in substances:
                        relationship = SubstanceRelationship(
                            name=substance,
                            category='unknown',
                            health_impact='neutral',
                            total_quantity=None,
                            unit='units',
                            contributions=[]
                        )
                        substance_relationships.append(relationship)

                # Ensure we have reasonable defaults
                if not ingredients:
                    ingredients = ["Unable to determine ingredients"]
                    ingredient_quantities = [IngredientQuantity(
                        name="Unable to determine ingredients",
                        original_amount=None,
                        gram_amount=None,
                        per_person=portion_for_one
                    )]
                if not substances:
                    substances = ["Analysis not available"]
                    substance_relationships = [SubstanceRelationship(
                        name="Analysis not available",
                        category='unknown',
                        health_impact='neutral',
                        total_quantity=None,
                        unit='units',
                        contributions=[]
                    )]
                if not mitigation_tips:
                    mitigation_tips = ["General healthy eating advice applies"]

                # Ensure substances and relationships stay synchronized
                # Create a set of substance names that have relationships
                substances_with_relationships = set(sr.name for sr in substance_relationships)

                # For substances, keep the original list but prioritize those with relationships
                # First, add substances that have relationships
                prioritized_substances = []
                other_substances = []

                for s in substances:
                    if s in substances_with_relationships:
                        prioritized_substances.append(s)
                    else:
                        other_substances.append(s)

                # Combine: relationships first, then others (no limit - show all)
                substances = prioritized_substances + other_substances

                # For relationships, only keep those whose names are in the final substances list
                substance_relationships = [sr for sr in substance_relationships if sr.name in substances]

                # Generate categorized tips
                categorized_tips = self._generate_categorized_tips(food_name, ingredients, substances)

                return ingredients, ingredient_quantities, substances, substance_relationships, mitigation_tips, categorized_tips

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}, Error: {str(e)}")
                raise  # Re-raise to be caught by outer exception handler

        except Exception as e:
            logger.error(f"Error in relationship food analysis with profile: {str(e)}")
            fallback_quantity = IngredientQuantity(
                name="Unable to determine ingredients",
                original_amount=None,
                gram_amount=None,
                per_person=portion_for_one
            )
            fallback_relationship = SubstanceRelationship(
                name="Analysis not available",
                category='unknown',
                health_impact='neutral',
                total_quantity=None,
                unit='units',
                contributions=[]
            )
            fallback_categorized_tips = [
                CategorizedTip(
                    id=str(uuid.uuid4()),
                    category=TipCategory.LIFESTYLE,
                    title="General Healthy Eating",
                    content="Practice mindful eating and maintain balanced nutrition.",
                    priority='medium',
                    relevance_score=0.5,
                    tags=["general", "health"]
                )
            ]
            return (
                ["Unable to determine ingredients"],
                [fallback_quantity],
                ["Analysis not available"],
                [fallback_relationship],
                ["General healthy eating advice applies"],
                fallback_categorized_tips
            )

    def _infer_ingredients(self, food_name: str) -> List[str]:
        """Step 1: Infer ingredients from food name using GenAI"""
        prompt = f"""
        Based on the food name "{food_name}", list the most likely key ingredients.
        Focus on the main components that would typically be found in this food.

        Return only a comma-separated list of ingredients, nothing else.
        Example: For "grilled chicken breast" -> "chicken, salt, pepper, herbs"

        Food: {food_name}
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.3
            )
            ingredients_text = response.choices[0].message.content.strip()
            # Split by comma and clean up
            ingredients = [ing.strip() for ing in ingredients_text.split(',') if ing.strip()]
            return ingredients[:10]  # Limit to 10 ingredients

        except Exception as e:
            logger.error(f"Error inferring ingredients: {str(e)}")
            return ["Unable to determine ingredients"]

    def _analyze_substances(self, ingredients: List[str]) -> List[str]:
        """Step 2: Analyze beneficial substances in ingredients"""
        if not ingredients or ingredients[0] == "Unable to determine ingredients":
            return ["Analysis not available"]

        ingredients_text = ", ".join(ingredients)
        prompt = f"""
        Based on these ingredients: {ingredients_text}

        List the beneficial substances/nutrients that would typically be found in these ingredients.
        Focus on vitamins, minerals, antioxidants, healthy fats, etc.

        Return only a comma-separated list of substances, nothing else.
        Example: "Vitamin C, antioxidants, omega-3 fatty acids, fiber"

        Substances:
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.3
            )

            substances_text = response.choices[0].message.content.strip()
            substances = [sub.strip() for sub in substances_text.split(',') if sub.strip()]
            return substances[:8]  # Limit to 8 substances

        except Exception as e:
            logger.error(f"Error analyzing substances: {str(e)}")
            return ["Analysis not available"]

    def _generate_mitigation_tips(self, food_name: str, ingredients: List[str], substances: List[str]) -> List[str]:
        """Step 3: Generate health and nutrition tips"""
        prompt = f"""
        For the food "{food_name}" with ingredients: {', '.join(ingredients)}
        and beneficial substances: {', '.join(substances)}

        Provide 3-4 practical health and nutrition tips related to this food.
        Focus on:
        - How to maximize health benefits
        - Portion control suggestions
        - Preparation methods
        - Dietary considerations

        Return only a numbered list of tips, nothing else.
        Example:
        1. Tip one here
        2. Tip two here
        3. Tip three here

        Tips:
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=250,
                temperature=0.4
            )

            tips_text = response.choices[0].message.content.strip()
            # Extract tips from numbered list
            tips = []
            for line in tips_text.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-')):
                    # Remove numbering
                    if line[0].isdigit():
                        line = line.split('.', 1)[-1].strip()
                    elif line.startswith('-'):
                        line = line[1:].strip()
                    tips.append(line)

            return tips[:4] if tips else ["General healthy eating advice applies"]

        except Exception as e:
            logger.error(f"Error generating tips: {str(e)}")
            return ["General healthy eating advice applies"]

    def _generate_categorized_tips(self, food_name: str, ingredients: List[str], substances: List[str]) -> List[CategorizedTip]:
        """Generate categorized health tips with structured format"""
        prompt = f"""
        For the food "{food_name}" with ingredients: {', '.join(ingredients)}
        and beneficial substances: {', '.join(substances)}

        Please provide healthy tips categorized into the following areas:
        1. Exercise - Physical activity and fitness recommendations
        2. Food - Dietary suggestions and meal planning
        3. Drink - Hydration and beverage recommendations
        4. Lifestyle - General wellness and daily habits
        5. Nutrition - Specific nutrient-focused advice
        6. Wellness - Holistic health and preventive care
        7. Mindset - Mental health and attitude recommendations

        For each category, provide 1-2 relevant tips based on the food analysis.
        Format your response as JSON with the following structure:
        {{
            "exercise": ["tip 1", "tip 2"],
            "food": ["tip 1", "tip 2"],
            "drink": ["tip 1"],
            "lifestyle": ["tip 1"],
            "nutrition": ["tip 1", "tip 2"],
            "wellness": ["tip 1"],
            "mindset": ["tip 1"]
        }}

        Only include categories that have relevant tips. Focus on practical, actionable advice.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.4
            )

            import json
            tips_json = response.choices[0].message.content.strip()

            # Extract JSON from response (handle potential markdown formatting)
            if tips_json.startswith('```json'):
                tips_json = tips_json[7:]
            if tips_json.endswith('```'):
                tips_json = tips_json[:-3]

            tips_data = json.loads(tips_json.strip())

            categorized_tips = []
            for category_str, tips_list in tips_data.items():
                try:
                    category = TipCategory(category_str.lower())
                    for i, tip_text in enumerate(tips_list):
                        if tip_text and tip_text.strip():
                            # Create title from first part of tip
                            title = tip_text.strip()
                            if len(title) > 50:
                                title = title[:47] + "..."

                            tip = CategorizedTip(
                                id=str(uuid.uuid4()),
                                category=category,
                                title=title,
                                content=tip_text.strip(),
                                priority='high' if i == 0 else 'medium',
                                relevance_score=0.9 if i == 0 else 0.7,
                                tags=[category_str.lower(), "health"]
                            )
                            categorized_tips.append(tip)
                except ValueError:
                    logger.warning(f"Invalid category: {category_str}")
                    continue

            return categorized_tips[:10]  # Limit to 10 tips max

        except Exception as e:
            logger.error(f"Error generating categorized tips: {str(e)}")
            # Return fallback categorized tips
            return [
                CategorizedTip(
                    id=str(uuid.uuid4()),
                    category=TipCategory.LIFESTYLE,
                    title="General Healthy Eating",
                    content="Practice mindful eating and maintain balanced nutrition.",
                    priority='medium',
                    relevance_score=0.5,
                    tags=["general", "health"]
                )
            ]

    def _generate_personalized_recommendations(
        self,
        food_name: str,
        ingredients: List[str],
        substances: List[str],
        user_profile
    ) -> List[str]:
        """Step 4: Generate personalized recommendations based on user profile"""
        age_group = user_profile.age_group
        weight = user_profile.weight
        height = user_profile.height

        prompt = f"""
        Based on the food "{food_name}" with ingredients: {', '.join(ingredients)}
        and beneficial substances: {', '.join(substances)}

        User profile:
        - Age group: {age_group}
        - Weight: {weight} cm
        - Height: {height} cm

        Provide 2-3 personalized recommendations specifically tailored to this user's profile.
        Consider age-appropriate advice, portion suggestions based on physical characteristics,
        and any special considerations for their demographic group.

        Focus on:
        - Age-appropriate serving sizes and preparation methods
        - Health considerations specific to their age group
        - How this food fits into their overall dietary needs
        - Any modifications or pairings that would be particularly beneficial

        Return only a numbered list of personalized recommendations, nothing else.
        Example:
        1. Recommendation one here
        2. Recommendation two here

        Personalized recommendations:
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.4
            )

            recommendations_text = response.choices[0].message.content.strip()
            # Extract recommendations from numbered list
            recommendations = []
            for line in recommendations_text.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-')):
                    # Remove numbering
                    if line[0].isdigit():
                        line = line.split('.', 1)[-1].strip()
                    elif line.startswith('-'):
                        line = line[1:].strip()
                    recommendations.append(line)

            return recommendations[:3] if recommendations else [f"Enjoy {food_name} as part of a balanced diet suitable for your age group"]

        except Exception as e:
            logger.error(f"Error generating personalized recommendations: {str(e)}")
            return [f"Enjoy {food_name} as part of a balanced diet suitable for your age group"]

    def _get_mock_response_with_profile(self, food_name: str, user_profile=None) -> Dict[str, Any]:
        """Return mock response when API key is not available (with profile support)"""
        personalized_recommendations = None
        if user_profile:
            personalized_recommendations = [
                f"Consider age-appropriate portion sizes for {user_profile.age_group} age group",
                f"Based on your profile ({user_profile.weight}cm, {user_profile.height}cm), moderate portions may be beneficial",
                "Consult healthcare provider for personalized dietary advice"
            ]

        # Create mock ingredient quantities
        mock_quantities = [
            IngredientQuantity(name="Sample ingredient 1", original_amount="2 cups", gram_amount=400.0, per_person=True),
            IngredientQuantity(name="Sample ingredient 2", original_amount="1 tbsp", gram_amount=15.0, per_person=True),
            IngredientQuantity(name="Sample ingredient 3", original_amount=None, gram_amount=None, per_person=True)
        ]

        # Create mock substance relationships
        mock_relationships = [
            SubstanceRelationship(
                name="Vitamin C",
                category="vitamin",
                health_impact="positive",
                total_quantity=90.0,
                unit="mg",
                contributions=[
                    SubstanceContribution(
                        ingredient_name="Sample ingredient 1",
                        quantity_grams=80.0,
                        contribution_percentage=89.0,
                        relationship_type="primary"
                    ),
                    SubstanceContribution(
                        ingredient_name="Sample ingredient 2",
                        quantity_grams=8.0,
                        contribution_percentage=9.0,
                        relationship_type="secondary"
                    )
                ]
            ),
            SubstanceRelationship(
                name="Antioxidants",
                category="antioxidant",
                health_impact="positive",
                total_quantity=25.0,
                unit="units",
                contributions=[
                    SubstanceContribution(
                        ingredient_name="Sample ingredient 3",
                        quantity_grams=20.0,
                        contribution_percentage=80.0,
                        relationship_type="primary"
                    )
                ]
            ),
            SubstanceRelationship(
                name="Fiber",
                category="fiber",
                health_impact="positive",
                total_quantity=5.0,
                unit="g",
                contributions=[
                    SubstanceContribution(
                        ingredient_name="Sample ingredient 1",
                        quantity_grams=3.0,
                        contribution_percentage=60.0,
                        relationship_type="primary"
                    ),
                    SubstanceContribution(
                        ingredient_name="Sample ingredient 3",
                        quantity_grams=2.0,
                        contribution_percentage=40.0,
                        relationship_type="secondary"
                    )
                ]
            )
        ]

        # Create mock categorized tips
        mock_categorized_tips = [
            CategorizedTip(
                id="mock-tip-1",
                category=TipCategory.FOOD,
                title="Balanced Meal Planning",
                content="Enjoy in moderation as part of a balanced diet",
                priority='high',
                relevance_score=0.9,
                tags=["food", "balance"]
            ),
            CategorizedTip(
                id="mock-tip-2",
                category=TipCategory.NUTRITION,
                title="Organic Options",
                content="Consider organic options when available for maximum nutrient benefits",
                priority='medium',
                relevance_score=0.7,
                tags=["nutrition", "organic"]
            ),
            CategorizedTip(
                id="mock-tip-3",
                category=TipCategory.LIFESTYLE,
                title="Nutrient Pairing",
                content="Pair with nutrient-rich vegetables for maximum benefit",
                priority='medium',
                relevance_score=0.8,
                tags=["lifestyle", "pairing"]
            )
        ]

        return FoodAnalysisResponse(
            ingredients=["Sample ingredient 1", "Sample ingredient 2", "Sample ingredient 3"],
            ingredient_quantities=mock_quantities,
            substances=["Vitamin C", "Antioxidants", "Fiber"],
            substance_relationships=mock_relationships,
            mitigation_tips=[
                "Enjoy in moderation as part of a balanced diet",
                "Consider organic options when available",
                "Pair with nutrient-rich vegetables for maximum benefit"
            ],
            categorized_tips=mock_categorized_tips,
            disclaimer=self.disclaimer,
            portion_for_one=True,
            personalized_recommendations=personalized_recommendations
        ).to_dict()

    def _get_mock_response(self, food_name: str) -> Dict[str, Any]:
        """Return mock response when API key is not available"""
        return self._get_mock_response_with_profile(food_name, None)

    def _get_fallback_response(self, food_name: str) -> Dict[str, Any]:
        """Return fallback response when analysis fails"""
        fallback_quantity = IngredientQuantity(name="Analysis temporarily unavailable", per_person=True)
        fallback_relationship = SubstanceRelationship(name="Analysis temporarily unavailable")

        # Create fallback categorized tips
        fallback_categorized_tips = [
            CategorizedTip(
                id=str(uuid.uuid4()),
                category=TipCategory.LIFESTYLE,
                title="General Health Advice",
                content="Please try again later for personalized health tips",
                priority='medium',
                relevance_score=0.5,
                tags=["general", "fallback"]
            )
        ]

        return FoodAnalysisResponse(
            ingredients=["Analysis temporarily unavailable"],
            ingredient_quantities=[fallback_quantity],
            substances=["Analysis temporarily unavailable"],
            substance_relationships=[fallback_relationship],
            mitigation_tips=["Please try again later"],
            categorized_tips=fallback_categorized_tips,
            disclaimer=self.disclaimer,
            portion_for_one=True
        ).to_dict()

    def _extract_ingredients_ai(self, food_name: str) -> List[Dict[str, Any]]:
        """
        Extract ingredients from food name using AI
        Returns structured list of ingredient objects
        """
        prompt = f"""
        Extract ONLY the essential, main ingredients for the food: "{food_name}"

        IMPORTANT INSTRUCTIONS:
        - ONLY include main, essential ingredients (no optional ingredients)
        - EXCLUDE any optional, alternative, or garnish ingredients
        - EXCLUDE any "to taste" seasonings that are not measured
        - Focus on core ingredients that define the dish
        - Include measured quantities when standard (e.g., "200g chicken", "1 cup rice")
        - For seasonings, only include those with specific measurements

        Return the result as a JSON array of objects with this EXACT format:

        [
          {{"name": "chicken breast", "quantity": "200g"}},
          {{"name": "rice", "quantity": "1 cup"}},
          {{"name": "soy sauce", "quantity": "2 tbsp"}},
          {{"name": "vegetable oil", "quantity": "1 tbsp"}},
          {{"name": "garlic", "quantity": "2 cloves"}}
        ]

        CRITICAL:
        - Return ONLY valid JSON array
        - NO optional ingredients
        - NO "to taste" items
        - NO garnish items
        - NO alternative ingredients
        - Each ingredient must have both "name" and "quantity" fields
        - Quantity can be "null" if no standard measurement exists
        - Maximum 8-10 core ingredients only
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a culinary expert that extracts ingredients from food names. Provide comprehensive, accurate ingredient lists with quantities."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()

            # Parse the JSON response
            try:
                # Clean up the response text to extract JSON
                json_start = response_text.find('[')
                json_end = response_text.rfind(']') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON array found in response: {response_text}")
                    return self._get_fallback_ingredients(food_name)

                json_content = response_text[json_start:json_end]

                # Parse the JSON
                ingredients_data = []
                parsed_ingredients = json.loads(json_content)

                for ingredient in parsed_ingredients:
                    if isinstance(ingredient, dict) and 'name' in ingredient:
                        ingredients_data.append({
                            'name': ingredient['name'].strip(),
                            'quantity': ingredient.get('quantity'),
                            'selected': True,  # Default to selected
                            'is_custom': False  # AI-extracted
                        })

                # Validate and limit ingredients
                if len(ingredients_data) == 0:
                    logger.warning("No valid ingredients found in JSON response")
                    return self._get_fallback_ingredients(food_name)

                return ingredients_data[:10]  # Limit to 10 core ingredients

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}, Error: {str(e)}")
                return self._get_fallback_ingredients(food_name)
            except Exception as e:
                logger.error(f"Error processing ingredient response: {str(e)}")
                return self._get_fallback_ingredients(food_name)

        except Exception as e:
            logger.error(f"Error in AI ingredient extraction: {str(e)}")
            return self._get_fallback_ingredients(food_name)

    def _get_mock_ingredients(self, food_name: str) -> List[Dict[str, Any]]:
        """Return mock ingredients when API key is not available"""
        # Base mock ingredients for stir-fry type dishes
        mock_ingredients = [
            {"name": "chicken breast", "quantity": "200g", "selected": True, "is_custom": False},
            {"name": "rice", "quantity": "1 cup", "selected": True, "is_custom": False},
            {"name": "soy sauce", "quantity": "2 tbsp", "selected": True, "is_custom": False},
            {"name": "vegetable oil", "quantity": "1 tbsp", "selected": True, "is_custom": False},
            {"name": "garlic", "quantity": "2 cloves", "selected": True, "is_custom": False},
            {"name": "ginger", "quantity": "1 tsp", "selected": True, "is_custom": False},
            {"name": "bell pepper", "quantity": "1 medium", "selected": True, "is_custom": False},
            {"name": "onion", "quantity": "1 medium", "selected": True, "is_custom": False}
        ]

        # Customize based on food name - only essential ingredients
        if "pizza" in food_name.lower():
            mock_ingredients = [
                {"name": "pizza dough", "quantity": "1 ball", "selected": True, "is_custom": False},
                {"name": "tomato sauce", "quantity": "1/2 cup", "selected": True, "is_custom": False},
                {"name": "mozzarella cheese", "quantity": "200g", "selected": True, "is_custom": False},
                {"name": "pepperoni", "quantity": "100g", "selected": True, "is_custom": False},
                {"name": "bell pepper", "quantity": "1/2 cup", "selected": True, "is_custom": False},
                {"name": "olive oil", "quantity": "1 tbsp", "selected": True, "is_custom": False}
            ]
        elif "salad" in food_name.lower():
            mock_ingredients = [
                {"name": "mixed greens", "quantity": "4 cups", "selected": True, "is_custom": False},
                {"name": "cherry tomatoes", "quantity": "1 cup", "selected": True, "is_custom": False},
                {"name": "cucumber", "quantity": "1 medium", "selected": True, "is_custom": False},
                {"name": "red onion", "quantity": "1/4 cup", "selected": True, "is_custom": False},
                {"name": "feta cheese", "quantity": "50g", "selected": True, "is_custom": False},
                {"name": "olive oil", "quantity": "2 tbsp", "selected": True, "is_custom": False}
            ]
        elif "pasta" in food_name.lower():
            mock_ingredients = [
                {"name": "pasta", "quantity": "200g", "selected": True, "is_custom": False},
                {"name": "tomato sauce", "quantity": "1 cup", "selected": True, "is_custom": False},
                {"name": "ground beef", "quantity": "150g", "selected": True, "is_custom": False},
                {"name": "onion", "quantity": "1 medium", "selected": True, "is_custom": False},
                {"name": "garlic", "quantity": "2 cloves", "selected": True, "is_custom": False},
                {"name": "olive oil", "quantity": "2 tbsp", "selected": True, "is_custom": False}
            ]
        elif "soup" in food_name.lower():
            mock_ingredients = [
                {"name": "chicken broth", "quantity": "4 cups", "selected": True, "is_custom": False},
                {"name": "chicken breast", "quantity": "200g", "selected": True, "is_custom": False},
                {"name": "carrots", "quantity": "2 medium", "selected": True, "is_custom": False},
                {"name": "celery", "quantity": "2 stalks", "selected": True, "is_custom": False},
                {"name": "onion", "quantity": "1 medium", "selected": True, "is_custom": False},
                {"name": "garlic", "quantity": "2 cloves", "selected": True, "is_custom": False}
            ]

        return mock_ingredients

    def _get_fallback_ingredients(self, food_name: str) -> List[Dict[str, Any]]:
        """Return fallback ingredients when extraction fails"""
        return [
            {"name": f"Unable to extract ingredients for {food_name}", "quantity": None, "selected": True, "is_custom": False},
            {"name": "Please try again or add ingredients manually", "quantity": None, "selected": True, "is_custom": False}
        ]

    def _format_ingredients_for_analysis(self, ingredients: List[str]) -> str:
        """
        Format ingredient list for AI analysis
        Converts list to readable format for prompts
        """
        if not ingredients:
            return "No ingredients provided"

        formatted = []
        for i, ingredient in enumerate(ingredients, 1):
            formatted.append(f"{i}. {ingredient}")

        return "\n".join(formatted)

    def _analyze_ingredients_ai(self, ingredients_text: str, portion_for_one: bool = True, user_profile=None) -> tuple[List[str], List[SubstanceRelationship], List[str], List[CategorizedTip]]:
        """
        Analyze ingredients using AI to get substances, relationships, and tips with structured JSON response
        Returns: (substances, substance_relationships, mitigation_tips, categorized_tips)
        """
        portion_text = "for one person" if portion_for_one else "for multiple people (scale down to single serving)"

        # Include profile information for personalization
        profile_text = ""
        if user_profile:
            profile_text = f"""
            User Profile Information:
            - Age group: {user_profile.age_group}
            - Weight: {user_profile.weight} cm
            - Height: {user_profile.height} cm

            Consider appropriate portion sizes based on the user's age group and physical characteristics.
            """

        prompt = f"""
        Analyze the following ingredients and provide a complete nutritional breakdown {portion_text}.
        {profile_text}

        INGREDIENTS:
        {ingredients_text}

        Return ONLY a valid JSON object with the following structure:

        {{
          "substances": ["Vitamin C", "protein", "sodium", "fiber", "antioxidants"],
          "relationships": [
            {{
              "name": "Vitamin C",
              "category": "vitamin",
              "health_impact": "positive",
              "total_quantity": 90,
              "unit": "mg",
              "contributions": [
                {{
                  "ingredient_name": "bell pepper",
                  "quantity_grams": 60,
                  "contribution_percentage": 67,
                  "relationship_type": "primary"
                }},
                {{
                  "ingredient_name": "broccoli",
                  "quantity_grams": 25,
                  "contribution_percentage": 28,
                  "relationship_type": "secondary"
                }}
              ]
            }},
            {{
              "name": "Sodium",
              "category": "mineral",
              "health_impact": "negative",
              "total_quantity": 800,
              "unit": "mg",
              "contributions": [
                {{
                  "ingredient_name": "soy sauce",
                  "quantity_grams": 700,
                  "contribution_percentage": 88,
                  "relationship_type": "primary"
                }}
              ]
            }}
          ],
          "tips": ["Consider the sodium content from soy sauce - use low-sodium version", "The garlic provides beneficial antioxidants", "This combination provides good protein-vegetable balance"]
        }}

        Focus on:
        - ALL absorbable substances (positive, neutral, negative health impacts) (maximum 8)
        - Realistic quantities for {portion_text}
        - Accurate categorization of health impacts
        - Complete ingredient-substance relationship mapping
        - Nutritional interactions between the specific ingredients provided
        - Practical health tips considering all substances present (maximum 4)

        Health impact categories:
        - positive: beneficial for health (e.g., Vitamin C, fiber, antioxidants, omega-3, protein)
        - neutral: neither clearly beneficial nor harmful (e.g., water, some minerals in normal amounts)
        - negative: potentially harmful or should be limited (e.g., excess sodium, trans fats, artificial additives, excess sugar)

        Return ONLY valid JSON, no additional text or formatting.
        """

        print(prompt)
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional nutritionist and food scientist. Analyze the given ingredients with expertise in nutritional biochemistry, food composition, and dietary health impacts. Provide detailed, evidence-based nutritional analysis with precise measurements and health impact assessments."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,  # Increased for comprehensive analysis
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()

            print(response_text)

            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text}")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Extract data from JSON structure
                substances = parsed_data.get('substances', [])
                relationships_data = parsed_data.get('relationships', [])
                mitigation_tips = parsed_data.get('tips', [])

                # Validate and ensure we have arrays
                if not isinstance(substances, list):
                    substances = ["Analysis not available"]
                if not isinstance(relationships_data, list):
                    relationships_data = []
                if not isinstance(mitigation_tips, list):
                    mitigation_tips = ["General healthy eating advice applies"]

                # Process substance relationships from JSON
                substance_relationships = []
                for rel_data in relationships_data:
                    if isinstance(rel_data, dict) and 'name' in rel_data:
                        name = rel_data['name']
                        category = rel_data.get('category', 'unknown')
                        health_impact = rel_data.get('health_impact', 'neutral')

                        # Validate health impact categories
                        valid_impacts = ['positive', 'neutral', 'negative']
                        if health_impact.lower() not in valid_impacts:
                            health_impact = 'neutral'

                        total_quantity = rel_data.get('total_quantity')
                        unit = rel_data.get('unit', 'units')
                        contributions_data = rel_data.get('contributions', [])

                        # Process contributions
                        contributions = []
                        if isinstance(contributions_data, list):
                            for contrib_data in contributions_data:
                                if isinstance(contrib_data, dict):
                                    ingredient_name = contrib_data.get('ingredient_name', '')
                                    quantity_grams = contrib_data.get('quantity_grams')
                                    contribution_percentage = contrib_data.get('contribution_percentage')
                                    relationship_type = contrib_data.get('relationship_type', 'unknown')

                                    # Validate numeric values
                                    if quantity_grams is not None:
                                        try:
                                            quantity_grams = float(quantity_grams)
                                        except (ValueError, TypeError):
                                            quantity_grams = None

                                    if contribution_percentage is not None:
                                        try:
                                            contribution_percentage = float(contribution_percentage)
                                        except (ValueError, TypeError):
                                            contribution_percentage = None

                                    if ingredient_name:
                                        contributions.append(SubstanceContribution(
                                            ingredient_name=ingredient_name,
                                            quantity_grams=quantity_grams,
                                            contribution_percentage=contribution_percentage,
                                            relationship_type=relationship_type
                                        ))

                        # Validate total_quantity
                        if total_quantity is not None:
                            try:
                                total_quantity = float(total_quantity)
                            except (ValueError, TypeError):
                                total_quantity = None

                        substance_relationships.append(SubstanceRelationship(
                            name=name,
                            category=category,
                            health_impact=health_impact,
                            total_quantity=total_quantity,
                            unit=unit,
                            contributions=contributions
                        ))

                # Create basic substance relationships if not already parsed
                if not substance_relationships and substances:
                    for substance in substances:
                        relationship = SubstanceRelationship(
                            name=substance,
                            category='unknown',
                            health_impact='neutral',
                            total_quantity=None,
                            unit='units',
                            contributions=[]
                        )
                        substance_relationships.append(relationship)

                # Ensure we have reasonable defaults
                if not substances:
                    substances = ["Analysis not available"]
                    substance_relationships = [SubstanceRelationship(
                        name="Analysis not available",
                        category='unknown',
                        health_impact='neutral',
                        total_quantity=None,
                        unit='units',
                        contributions=[]
                    )]
                if not mitigation_tips:
                    mitigation_tips = ["General healthy eating advice applies"]

                # Create categorized tips from mitigation tips
                categorized_tips = self._create_categorized_tips_from_mitigation(mitigation_tips)

                # Keep all results (no arbitrary limits)
                # substances = substances  # Keep all
                # substance_relationships = substance_relationships  # Keep all
                # mitigation_tips = mitigation_tips  # Keep all
                # categorized_tips = categorized_tips  # Keep all

                return substances, substance_relationships, mitigation_tips, categorized_tips

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {response_text}, Error: {str(e)}")
                raise  # Re-raise to be caught by outer exception handler

        except Exception as e:
            logger.error(f"Error in ingredient analysis: {str(e)}")
            # Return fallback data
            return (
                ["Analysis temporarily unavailable"],
                [],
                ["Please try again later"],
                [CategorizedTip(
                    id=str(uuid.uuid4()),
                    category=TipCategory.LIFESTYLE,
                    title="General Advice",
                    content="Please try again later for personalized nutrition tips",
                    priority='medium',
                    relevance_score=0.5,
                    tags=["general", "fallback"]
                )]
            )

    def _create_categorized_tips_from_mitigation(self, mitigation_tips: List[str]) -> List[CategorizedTip]:
        """Create categorized tips from mitigation tips for backward compatibility"""
        categorized_tips = []
        categories = [TipCategory.FOOD, TipCategory.NUTRITION, TipCategory.LIFESTYLE]

        for i, tip in enumerate(mitigation_tips):
            categorized_tips.append(CategorizedTip(
                id=str(uuid.uuid4()),
                category=categories[i % len(categories)],
                title=f"Nutrition Tip {i+1}",
                content=tip,
                priority='medium',
                relevance_score=0.8,
                tags=["nutrition", "ingredient-based"]
            ))

        return categorized_tips

    def _get_mock_meal_response(self, food_name: str, meal_type: str) -> Dict[str, Any]:
        """Return mock meal analysis response when API key is not available"""
        from app.models.response_models import MealAnalysisResponse, MealIngredient, MealSubstance

        # Mock ingredients based on food type
        if "chicken" in food_name.lower():
            ingredients = [
                MealIngredient(name="chicken breast", quantity="150g"),
                MealIngredient(name="mixed vegetables", quantity="1 cup"),
                MealIngredient(name="olive oil", quantity="1 tbsp"),
                MealIngredient(name="garlic", quantity="2 cloves")
            ]
            substances = [
                MealSubstance(name="Protein", quantity=35.0, unit="g", category="protein", standard_consumption=50.0, health_impact="positive"),
                MealSubstance(name="Vitamin C", quantity=45.0, unit="mg", category="vitamin", standard_consumption=90.0, health_impact="positive"),
                MealSubstance(name="Iron", quantity=2.5, unit="mg", category="mineral", standard_consumption=18.0, health_impact="positive")
            ]
        elif "salad" in food_name.lower():
            ingredients = [
                MealIngredient(name="mixed greens", quantity="2 cups"),
                MealIngredient(name="cherry tomatoes", quantity="1/2 cup"),
                MealIngredient(name="cucumber", quantity="1/2 cup"),
                MealIngredient(name="olive oil", quantity="1 tbsp")
            ]
            substances = [
                MealSubstance(name="Vitamin K", quantity=120.0, unit="mcg", category="vitamin", standard_consumption=120.0, health_impact="positive"),
                MealSubstance(name="Vitamin C", quantity=25.0, unit="mg", category="vitamin", standard_consumption=90.0, health_impact="positive"),
                MealSubstance(name="Fiber", quantity=3.5, unit="g", category="fiber", standard_consumption=25.0, health_impact="positive")
            ]
        elif "pasta" in food_name.lower():
            ingredients = [
                MealIngredient(name="pasta", quantity="100g"),
                MealIngredient(name="tomato sauce", quantity="1/2 cup"),
                MealIngredient(name="parmesan cheese", quantity="2 tbsp"),
                MealIngredient(name="olive oil", quantity="1 tsp")
            ]
            substances = [
                MealSubstance(name="Carbohydrates", quantity=45.0, unit="g", category="carbohydrate", standard_consumption=130.0, health_impact="neutral"),
                MealSubstance(name="Calcium", quantity=85.0, unit="mg", category="mineral", standard_consumption=1000.0, health_impact="positive"),
                MealSubstance(name="Sodium", quantity=350.0, unit="mg", category="mineral", standard_consumption=2300.0, health_impact="neutral")
            ]
        else:
            # Generic meal
            ingredients = [
                MealIngredient(name="main ingredient", quantity="1 serving"),
                MealIngredient(name="vegetables", quantity="1 cup"),
                MealIngredient(name="seasoning", quantity="1 tsp")
            ]
            substances = [
                MealSubstance(name="Calories", quantity=300.0, unit="kcal", category="energy", standard_consumption=2000.0, health_impact="neutral"),
                MealSubstance(name="Protein", quantity=20.0, unit="g", category="protein", standard_consumption=50.0, health_impact="positive"),
                MealSubstance(name="Fat", quantity=10.0, unit="g", category="fat", standard_consumption=70.0, health_impact="neutral")
            ]

        response = MealAnalysisResponse(
            food_name=food_name,
            meal_type=meal_type,
            ingredients=ingredients,
            substances=substances
        )

        return response.to_dict()

    def _get_fallback_meal_response(self, food_name: str, meal_type: str) -> Dict[str, Any]:
        """Return fallback meal analysis response when analysis fails"""
        from app.models.response_models import MealAnalysisResponse, MealIngredient, MealSubstance

        ingredients = [
            MealIngredient(name="Unable to determine ingredients", quantity="N/A")
        ]
        substances = [
            MealSubstance(
                name="Analysis not available",
                quantity=0.0,
                unit="N/A",
                category="general",
                standard_consumption=100.0,
                health_impact="neutral"
            )
        ]

        response = MealAnalysisResponse(
            food_name=food_name,
            meal_type=meal_type,
            ingredients=ingredients,
            substances=substances
        )

        return response.to_dict()
