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

    def analyze_foods_comprehensive(self, foods: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Analyze multiple foods using comprehensive nutritional analysis with detailed prompt
        Returns: List of food analysis objects with detailed nutritional data
        """
        try:
            if self.use_mock:
                return self._get_mock_comprehensive_response(foods)

            # Use the comprehensive nutritional analysis prompt
            result = self._analyze_foods_with_comprehensive_prompt(foods)
            print(f"Comprehensive analysis completed for {len(result)} foods")
            return result

        except Exception as e:
            logger.error(f"Error in comprehensive food analysis: {str(e)}")
            # Return fallback response
            return self._get_fallback_comprehensive_response(foods)

    def _analyze_foods_with_comprehensive_prompt(self, foods: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Use the comprehensive nutritional analysis prompt to analyze foods
        """
        # Comprehensive prompt from foodanalyze.txt
        prompt = f"""You are a nutrition analyzer.
Goal: For each food item, output a **strict JSON** record for a **single-person serving**, with ingredients, portion %, and a comprehensive set of nutrients (macros, fatty acids, amino acids, minerals, vitamins, bioactives, organic/other compounds). Every nutrient value must be in **grams**, with **per-ingredient** contributions and a **nutrient impact** tag (positive | neutral | negative). Output **JSON only** (no prose, no markdown).

INPUT
You will receive a JSON array like:
[
  {{"food_name":"string","meal_type":"breakfast|lunch|dinner|snack"}},
  ...
]

GENERAL REQUIREMENTS
1) Serving is **for one person**. Make a reasonable single-person serving assumption (typical home-style or common recipe). Be deterministic; if ambiguous, pick the most common interpretation and proceed.
2) Produce an ingredients list with portion_percent values that sum to **100 ± 0.1**.
3) Report a comprehensive nutrient panel as **grams** for each allowed nutrient key (see ALLOWED_NUTRIENTS below). If a database typically reports mg/µg, convert to grams (e.g., 730 mg → 0.73; 120 µg → 0.00012). If unknown/negligible, set to 0, but still include the key.
4) For **every** nutrient, include:
   - full_name
   - class (one of: "macronutrient" | "fatty_acid" | "amino_acid" | "mineral" | "vitamin" | "bioactive" | "organic_acid" | "sterol" | "sweetener" | "other")
   - impact (one of: "positive" | "neutral" | "negative") using the defaults in ALLOWED_NUTRIENTS
   - total_g
   - by_ingredient: an array of {{ingredient, grams, percent_of_chemical}}
     • Sum of by_ingredient.grams must equal total_g within ±0.1
     • Sum of by_ingredient.percent_of_chemical must equal **100 ± 0.1**
5) Use numeric values only (no units or strings); round to ≤2 decimals unless extremely small (then ≤6 decimals).
6) Output only a **top-level JSON array** matching the input order. Do not include any extra top-level keys. Do not include commentary or code fences.
7) Include **all** ALLOWED_NUTRIENTS keys for each dish; if not present, report zeros and an empty by_ingredient array.
8) Do not invent nutrients beyond the allowed list. Do not omit any allowed keys.

ALLOWED_NUTRIENTS
Each entry defines the canonical key (use exactly) → {{full_name, class, impact}}.

{{
  /* Core macros */
  "water_g": {{"full_name":"Water","class":"macronutrient","impact":"neutral"}},
  "protein_g": {{"full_name":"Protein","class":"macronutrient","impact":"positive"}},
  "carbohydrate_g": {{"full_name":"Carbohydrate","class":"macronutrient","impact":"neutral"}},
  "available_carbohydrate_g": {{"full_name":"Available carbohydrate (by difference)","class":"macronutrient","impact":"neutral"}},
  "total_sugars_g": {{"full_name":"Total sugars","class":"macronutrient","impact":"neutral"}},
  "added_sugars_g": {{"full_name":"Added sugars","class":"macronutrient","impact":"negative"}},
  "glucose_g": {{"full_name":"Glucose (dextrose)","class":"macronutrient","impact":"neutral"}},
  "fructose_g": {{"full_name":"Fructose","class":"macronutrient","impact":"neutral"}},
  "sucrose_g": {{"full_name":"Sucrose","class":"macronutrient","impact":"neutral"}},
  "lactose_g": {{"full_name":"Lactose","class":"macronutrient","impact":"neutral"}},
  "maltose_g": {{"full_name":"Maltose","class":"macronutrient","impact":"neutral"}},
  "fiber_g": {{"full_name":"Dietary fiber (total)","class":"macronutrient","impact":"positive"}},
  "soluble_fiber_g": {{"full_name":"Soluble fiber","class":"macronutrient","impact":"positive"}},
  "insoluble_fiber_g": {{"full_name":"Insoluble fiber","class":"macronutrient","impact":"positive"}},
  "resistant_starch_g": {{"full_name":"Resistant starch","class":"macronutrient","impact":"positive"}},
  "starch_g": {{"full_name":"Starch (digestible)","class":"macronutrient","impact":"neutral"}},
  "total_fat_g": {{"full_name":"Total fat","class":"macronutrient","impact":"neutral"}},
  "saturated_fat_g": {{"full_name":"Saturated fatty acids","class":"fatty_acid","impact":"negative"}},
  "monounsaturated_fat_g": {{"full_name":"Monounsaturated fatty acids (total)","class":"fatty_acid","impact":"positive"}},
  "polyunsaturated_fat_g": {{"full_name":"Polyunsaturated fatty acids (total)","class":"fatty_acid","impact":"positive"}},
  "trans_fat_g": {{"full_name":"Trans fatty acids (total)","class":"fatty_acid","impact":"negative"}},

  /* Detailed fatty acids (common) */
  "ala_g": {{"full_name":"Alpha-linolenic acid (18:3 n-3, ALA)","class":"fatty_acid","impact":"positive"}},
  "epa_g": {{"full_name":"Eicosapentaenoic acid (20:5 n-3, EPA)","class":"fatty_acid","impact":"positive"}},
  "dpa_g": {{"full_name":"Docosapentaenoic acid (22:5 n-3, DPA)","class":"fatty_acid","impact":"positive"}},
  "dha_g": {{"full_name":"Docosahexaenoic acid (22:6 n-3, DHA)","class":"fatty_acid","impact":"positive"}},
  "omega_3_total_g": {{"full_name":"Omega-3 fatty acids (total)","class":"fatty_acid","impact":"positive"}},
  "linoleic_acid_g": {{"full_name":"Linoleic acid (18:2 n-6, LA)","class":"fatty_acid","impact":"neutral"}},
  "gamma_linolenic_acid_g": {{"full_name":"Gamma-linolenic acid (18:3 n-6, GLA)","class":"fatty_acid","impact":"neutral"}},
  "arachidonic_acid_g": {{"full_name":"Arachidonic acid (20:4 n-6, AA)","class":"fatty_acid","impact":"neutral"}},
  "omega_6_total_g": {{"full_name":"Omega-6 fatty acids (total)","class":"fatty_acid","impact":"neutral"}},
  "oleic_acid_g": {{"full_name":"Oleic acid (18:1 n-9)","class":"fatty_acid","impact":"positive"}},
  "palmitoleic_acid_g": {{"full_name":"Palmitoleic acid (16:1)","class":"fatty_acid","impact":"neutral"}},
  "palmitic_acid_g": {{"full_name":"Palmitic acid (16:0)","class":"fatty_acid","impact":"negative"}},
  "stearic_acid_g": {{"full_name":"Stearic acid (18:0)","class":"fatty_acid","impact":"neutral"}},
  "myristic_acid_g": {{"full_name":"Myristic acid (14:0)","class":"fatty_acid","impact":"negative"}},
  "lauric_acid_g": {{"full_name":"Lauric acid (12:0)","class":"fatty_acid","impact":"neutral"}},
  "butyric_acid_g": {{"full_name":"Butyric acid (4:0)","class":"fatty_acid","impact":"neutral"}},
  "elaidic_acid_g": {{"full_name":"Elaidic acid (18:1 trans)","class":"fatty_acid","impact":"negative"}},

  /* Sterols */
  "cholesterol_g": {{"full_name":"Cholesterol","class":"sterol","impact":"neutral"}},
  "phytosterols_g": {{"full_name":"Phytosterols (total)","class":"sterol","impact":"positive"}},
  "beta_sitosterol_g": {{"full_name":"Beta-sitosterol","class":"sterol","impact":"positive"}},
  "campesterol_g": {{"full_name":"Campesterol","class":"sterol","impact":"positive"}},
  "stigmasterol_g": {{"full_name":"Stigmasterol","class":"sterol","impact":"positive"}},

  /* Amino acids */
  "tryptophan_g": {{"full_name":"Tryptophan","class":"amino_acid","impact":"positive"}},
  "threonine_g": {{"full_name":"Threonine","class":"amino_acid","impact":"positive"}},
  "isoleucine_g": {{"full_name":"Isoleucine","class":"amino_acid","impact":"positive"}},
  "leucine_g": {{"full_name":"Leucine","class":"amino_acid","impact":"positive"}},
  "lysine_g": {{"full_name":"Lysine","class":"amino_acid","impact":"positive"}},
  "methionine_g": {{"full_name":"Methionine","class":"amino_acid","impact":"positive"}},
  "cystine_g": {{"full_name":"Cystine","class":"amino_acid","impact":"positive"}},
  "phenylalanine_g": {{"full_name":"Phenylalanine","class":"amino_acid","impact":"positive"}},
  "tyrosine_g": {{"full_name":"Tyrosine","class":"amino_acid","impact":"positive"}},
  "valine_g": {{"full_name":"Valine","class":"amino_acid","impact":"positive"}},
  "histidine_g": {{"full_name":"Histidine","class":"amino_acid","impact":"positive"}},
  "alanine_g": {{"full_name":"Alanine","class":"amino_acid","impact":"positive"}},
  "arginine_g": {{"full_name":"Arginine","class":"amino_acid","impact":"positive"}},
  "aspartic_acid_g": {{"full_name":"Aspartic acid","class":"amino_acid","impact":"positive"}},
  "glutamic_acid_g": {{"full_name":"Glutamic acid","class":"amino_acid","impact":"positive"}},
  "glycine_g": {{"full_name":"Glycine","class":"amino_acid","impact":"positive"}},
  "proline_g": {{"full_name":"Proline","class":"amino_acid","impact":"positive"}},
  "serine_g": {{"full_name":"Serine","class":"amino_acid","impact":"positive"}},

  /* Minerals */
  "calcium_g": {{"full_name":"Calcium","class":"mineral","impact":"positive"}},
  "iron_g": {{"full_name":"Iron","class":"mineral","impact":"positive"}},
  "magnesium_g": {{"full_name":"Magnesium","class":"mineral","impact":"positive"}},
  "phosphorus_g": {{"full_name":"Phosphorus","class":"mineral","impact":"positive"}},
  "potassium_g": {{"full_name":"Potassium","class":"mineral","impact":"positive"}},
  "sodium_g": {{"full_name":"Sodium","class":"mineral","impact":"negative"}},
  "zinc_g": {{"full_name":"Zinc","class":"mineral","impact":"positive"}},
  "copper_g": {{"full_name":"Copper","class":"mineral","impact":"positive"}},
  "manganese_g": {{"full_name":"Manganese","class":"mineral","impact":"positive"}},
  "selenium_g": {{"full_name":"Selenium","class":"mineral","impact":"positive"}},
  "iodine_g": {{"full_name":"Iodine","class":"mineral","impact":"positive"}},
  "chromium_g": {{"full_name":"Chromium","class":"mineral","impact":"positive"}},
  "molybdenum_g": {{"full_name":"Molybdenum","class":"mineral","impact":"positive"}},
  "fluoride_g": {{"full_name":"Fluoride","class":"mineral","impact":"neutral"}},
  "chloride_g": {{"full_name":"Chloride","class":"mineral","impact":"neutral"}},
  "boron_g": {{"full_name":"Boron","class":"mineral","impact":"neutral"}},
  "nickel_g": {{"full_name":"Nickel","class":"mineral","impact":"neutral"}},
  "silicon_g": {{"full_name":"Silicon","class":"mineral","impact":"neutral"}},

  /* Vitamins & provitamins */
  "vitamin_a_rae_g": {{"full_name":"Vitamin A (RAE)","class":"vitamin","impact":"positive"}},
  "retinol_g": {{"full_name":"Retinol (Vitamin A)","class":"vitamin","impact":"positive"}},
  "alpha_carotene_g": {{"full_name":"Alpha-carotene","class":"vitamin","impact":"positive"}},
  "beta_carotene_g": {{"full_name":"Beta-carotene","class":"vitamin","impact":"positive"}},
  "beta_cryptoxanthin_g": {{"full_name":"Beta-cryptoxanthin","class":"vitamin","impact":"positive"}},
  "lutein_zeaxanthin_g": {{"full_name":"Lutein + zeaxanthin","class":"vitamin","impact":"positive"}},
  "lycopene_g": {{"full_name":"Lycopene","class":"vitamin","impact":"positive"}},
  "vitamin_c_g": {{"full_name":"Vitamin C (ascorbic acid)","class":"vitamin","impact":"positive"}},
  "vitamin_d_g": {{"full_name":"Vitamin D (total)","class":"vitamin","impact":"positive"}},
  "vitamin_d2_g": {{"full_name":"Ergocalciferol (Vitamin D2)","class":"vitamin","impact":"positive"}},
  "vitamin_d3_g": {{"full_name":"Cholecalciferol (Vitamin D3)","class":"vitamin","impact":"positive"}},
  "vitamin_e_g": {{"full_name":"Vitamin E (alpha-tocopherol)","class":"vitamin","impact":"positive"}},
  "gamma_tocopherol_g": {{"full_name":"Gamma-tocopherol","class":"vitamin","impact":"positive"}},
  "delta_tocopherol_g": {{"full_name":"Delta-tocopherol","class":"vitamin","impact":"positive"}},
  "alpha_tocotrienol_g": {{"full_name":"Alpha-tocotrienol","class":"vitamin","impact":"positive"}},
  "gamma_tocotrienol_g": {{"full_name":"Gamma-tocotrienol","class":"vitamin","impact":"positive"}},
  "vitamin_k_g": {{"full_name":"Vitamin K (total)","class":"vitamin","impact":"positive"}},
  "vitamin_k1_g": {{"full_name":"Phylloquinone (Vitamin K1)","class":"vitamin","impact":"positive"}},
  "vitamin_k2_g": {{"full_name":"Menaquinones (Vitamin K2)","class":"vitamin","impact":"positive"}},
  "thiamin_b1_g": {{"full_name":"Thiamin (Vitamin B1)","class":"vitamin","impact":"positive"}},
  "riboflavin_b2_g": {{"full_name":"Riboflavin (Vitamin B2)","class":"vitamin","impact":"positive"}},
  "niacin_b3_g": {{"full_name":"Niacin (Vitamin B3)","class":"vitamin","impact":"positive"}},
  "pantothenic_acid_b5_g": {{"full_name":"Pantothenic acid (Vitamin B5)","class":"vitamin","impact":"positive"}},
  "vitamin_b6_g": {{"full_name":"Vitamin B6","class":"vitamin","impact":"positive"}},
  "biotin_b7_g": {{"full_name":"Biotin (Vitamin B7)","class":"vitamin","impact":"positive"}},
  "folate_b9_dfe_g": {{"full_name":"Folate (DFE, Vitamin B9)","class":"vitamin","impact":"positive"}},
  "folic_acid_g": {{"full_name":"Folic acid","class":"vitamin","impact":"positive"}},
  "vitamin_b12_g": {{"full_name":"Vitamin B12","class":"vitamin","impact":"positive"}},
  "choline_g": {{"full_name":"Choline","class":"vitamin","impact":"positive"}},
  "betaine_g": {{"full_name":"Betaine","class":"vitamin","impact":"positive"}},

  /* Bioactives & polyphenols */
  "caffeine_g": {{"full_name":"Caffeine","class":"bioactive","impact":"neutral"}},
  "theobromine_g": {{"full_name":"Theobromine","class":"bioactive","impact":"neutral"}},
  "taurine_g": {{"full_name":"Taurine","class":"bioactive","impact":"neutral"}},
  "polyphenols_g": {{"full_name":"Polyphenols (total)","class":"bioactive","impact":"positive"}},
  "flavanols_total_g": {{"full_name":"Flavanols (total)","class":"bioactive","impact":"positive"}},
  "catechins_total_g": {{"full_name":"Catechins (total)","class":"bioactive","impact":"positive"}},
  "egcg_g": {{"full_name":"Epigallocatechin gallate (EGCG)","class":"bioactive","impact":"positive"}},
  "anthocyanins_g": {{"full_name":"Anthocyanins","class":"bioactive","impact":"positive"}},
  "flavonols_g": {{"full_name":"Flavonols (total)","class":"bioactive","impact":"positive"}},
  "quercetin_g": {{"full_name":"Quercetin","class":"bioactive","impact":"positive"}},
  "resveratrol_g": {{"full_name":"Resveratrol","class":"bioactive","impact":"positive"}},
  "isoflavones_g": {{"full_name":"Isoflavones (total)","class":"bioactive","impact":"positive"}},
  "genistein_g": {{"full_name":"Genistein","class":"bioactive","impact":"positive"}},
  "daidzein_g": {{"full_name":"Daidzein","class":"bioactive","impact":"positive"}},
  "lignans_g": {{"full_name":"Lignans (total)","class":"bioactive","impact":"positive"}},
  "ellagic_acid_g": {{"full_name":"Ellagic acid","class":"bioactive","impact":"positive"}},
  "curcumin_g": {{"full_name":"Curcumin","class":"bioactive","impact":"positive"}},
  "capsaicin_g": {{"full_name":"Capsaicin","class":"bioactive","impact":"neutral"}},
  "allicin_g": {{"full_name":"Allicin","class":"bioactive","impact":"positive"}},

  /* Organic & other acids */
  "citric_acid_g": {{"full_name":"Citric acid","class":"organic_acid","impact":"neutral"}},
  "malic_acid_g": {{"full_name":"Malic acid","class":"organic_acid","impact":"neutral"}},
  "tartaric_acid_g": {{"full_name":"Tartaric acid","class":"organic_acid","impact":"neutral"}},
  "oxalic_acid_g": {{"full_name":"Oxalic acid","class":"organic_acid","impact":"neutral"}},
  "acetic_acid_g": {{"full_name":"Acetic acid","class":"organic_acid","impact":"neutral"}},
  "lactic_acid_g": {{"full_name":"Lactic acid","class":"organic_acid","impact":"neutral"}},
  "succinic_acid_g": {{"full_name":"Succinic acid","class":"organic_acid","impact":"neutral"}},

  /* Sweeteners & polyols */
  "sugar_alcohols_g": {{"full_name":"Sugar alcohols (polyols, total)","class":"sweetener","impact":"neutral"}},
  "glycerol_g": {{"full_name":"Glycerol","class":"sweetener","impact":"neutral"}},
  "inulin_g": {{"full_name":"Inulin (fructans)","class":"sweetener","impact":"positive"}},
  "fructooligosaccharides_g": {{"full_name":"Fructo-oligosaccharides (FOS)","class":"sweetener","impact":"positive"}},

  /* Other/antinutrients/compounds */
  "alcohol_g": {{"full_name":"Ethanol (alcohol)","class":"other","impact":"negative"}},
  "nitrate_g": {{"full_name":"Nitrate (NO3-)","class":"other","impact":"neutral"}},
  "nitrite_g": {{"full_name":"Nitrite (NO2-)","class":"other","impact":"negative"}},
  "purines_g": {{"full_name":"Purines (total)","class":"other","impact":"neutral"}},
  "phytate_g": {{"full_name":"Phytic acid (myo-inositol hexakisphosphate)","class":"other","impact":"neutral"}},
  "ash_g": {{"full_name":"Ash (total minerals)","class":"other","impact":"neutral"}},
  "gluten_g": {{"full_name":"Gluten (wheat prolamins)","class":"other","impact":"neutral"}}
}}

OUTPUT SCHEMA (exact keys)
Return a JSON array of objects, each with exactly these keys:
[
  {{
    "food_name": "string",
    "meal_type": "breakfast|lunch|dinner|snack",
    "serving": {{
      "description": "string",
      "grams": 0.0
    }},
    "ingredients": [
      {{"name": "string", "portion_percent": 0.0}}
    ],
    "nutrients_g": {{
      "<any key from ALLOWED_NUTRIENTS>": {{
        "full_name": "string",
        "class": "macronutrient|fatty_acid|amino_acid|mineral|vitamin|bioactive|organic_acid|sterol|sweetener|other",
        "impact": "positive|neutral|negative",
        "total_g": 0.0,
        "by_ingredient": [
          {{"ingredient": "string", "grams": 0.0, "percent_of_chemical": 0.0}}
        ]
      }}
      // include ALL allowed nutrient keys, even if total_g is 0.0 (then by_ingredient MUST be [])
    }}
  }}
]

VALIDATION
- Sum(ingredients.portion_percent) = 100 ± 0.1.
- For each nutrient: Sum(by_ingredient.grams) = total_g ± 0.1, and Sum(by_ingredient.percent_of_chemical) = 100 ± 0.1 (unless total_g == 0, then by_ingredient MUST be []).
- All numeric fields are numbers (no strings or units). All nutrient amounts in grams. Convert mg/µg to grams before reporting.
- Include every nutrient defined in ALLOWED_NUTRIENTS; do not add or remove keys.
- Output ONLY the final JSON array; no explanations or markdown."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional nutritionist and food scientist with access to comprehensive nutritional databases. Provide accurate, detailed nutritional analysis with precise measurements."},
                    {"role": "user", "content": f"{prompt}\n\n{json.dumps(foods)}"}
                ],
                max_tokens=12000,  # Increased for comprehensive analysis
                temperature=0.1  # Low temperature for consistency
            )

            response_text = response.choices[0].message.content.strip()
            print(response_text)
            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('[')
                json_end = response_text.rfind(']') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON array found in response: {response_text[:500]}...")
                    raise json.JSONDecodeError("No JSON array found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Validate that we got the expected structure
                if not isinstance(parsed_data, list):
                    logger.warning("Response is not a JSON array")
                    raise json.JSONDecodeError("Response is not a JSON array", response_text, 0)

                return parsed_data

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse comprehensive analysis JSON response: {str(e)}")
                raise

        except Exception as e:
            logger.error(f"Error in comprehensive food analysis: {str(e)}")
            raise

    def _get_mock_comprehensive_response(self, foods: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Return mock comprehensive response when API key is not available"""
        mock_responses = []

        # Define all allowed nutrient keys (simplified for mock)
        nutrient_keys = [
            "water_g", "protein_g", "carbohydrate_g", "fiber_g", "total_fat_g",
            "vitamin_c_g", "calcium_g", "iron_g", "sodium_g", "potassium_g"
        ]

        for food in foods:
            mock_response = {
                "food_name": food["food_name"],
                "meal_type": food["meal_type"],
                "serving": {
                    "description": f"Typical single-person serving of {food['food_name']}",
                    "grams": 200.0
                },
                "ingredients": [
                    {"name": f"Main ingredient for {food['food_name']}", "portion_percent": 60.0},
                    {"name": "Secondary ingredient", "portion_percent": 30.0},
                    {"name": "Seasoning", "portion_percent": 10.0}
                ],
                "nutrients_g": {}
            }

            # Add all required nutrient keys with mock data
            for key in nutrient_keys:
                mock_response["nutrients_g"][key] = {
                    "full_name": f"Mock {key.replace('_', ' ')}",
                    "class": "macronutrient" if key in ["water_g", "protein_g", "carbohydrate_g", "fiber_g", "total_fat_g"] else "mineral" if "_g" in key else "vitamin",
                    "impact": "positive" if key in ["protein_g", "fiber_g", "vitamin_c_g"] else "negative" if key == "sodium_g" else "neutral",
                    "total_g": 10.0 if key == "protein_g" else 5.0 if key in ["vitamin_c_g", "iron_g"] else 1.0,
                    "by_ingredient": [
                        {"ingredient": f"Main ingredient for {food['food_name']}", "grams": 6.0, "percent_of_chemical": 60.0},
                        {"ingredient": "Secondary ingredient", "grams": 3.0, "percent_of_chemical": 30.0},
                        {"ingredient": "Seasoning", "grams": 1.0, "percent_of_chemical": 10.0}
                    ]
                }

            mock_responses.append(mock_response)

        return mock_responses

    def _get_fallback_comprehensive_response(self, foods: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Return fallback comprehensive response when analysis fails"""
        fallback_responses = []

        for food in foods:
            fallback_response = {
                "food_name": food["food_name"],
                "meal_type": food["meal_type"],
                "serving": {
                    "description": "Analysis temporarily unavailable",
                    "grams": 0.0
                },
                "ingredients": [
                    {"name": "Analysis temporarily unavailable", "portion_percent": 100.0}
                ],
                "nutrients_g": {
                    "protein_g": {
                        "full_name": "Protein",
                        "class": "macronutrient",
                        "impact": "positive",
                        "total_g": 0.0,
                        "by_ingredient": []
                    }
                }
            }
            fallback_responses.append(fallback_response)

        return fallback_responses

