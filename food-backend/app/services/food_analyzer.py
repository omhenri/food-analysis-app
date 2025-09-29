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

    def get_recommended_intake(self, nutrients_consumed: List[Dict[str, Any]], age_group: str = "18-29", gender: str = "general") -> Dict[str, Any]:
        """
        Get recommended daily intake values based on nutrients consumed using AI analysis
        Returns: Structured response with recommended intakes for 18-29 year olds
        """
        try:
            if self.use_mock:
                return self._get_mock_recommended_intake(nutrients_consumed, age_group, gender)

            # Use AI to generate recommended intake based on consumed nutrients
            result = self._analyze_recommended_intake_with_ai(nutrients_consumed, age_group, gender)
            print(f"Generated recommended intake for {len(nutrients_consumed)} nutrients")
            return result

        except Exception as e:
            logger.error(f"Error getting recommended intake: {str(e)}")
            return self._get_fallback_recommended_intake()

    def get_weekly_recommended_intake(self, nutrients_consumed: List[Dict[str, Any]], age_group: str = "18-29", gender: str = "general") -> Dict[str, Any]:
        """
        Get recommended weekly intake values based on nutrients consumed over a week using AI analysis
        Returns: Structured response with recommended weekly intakes for 18-29 year olds
        """
        try:
            if self.use_mock:
                return self._get_mock_weekly_recommended_intake(nutrients_consumed, age_group, gender)

            # Use AI to generate recommended weekly intake based on consumed nutrients
            result = self._analyze_weekly_recommended_intake_with_ai(nutrients_consumed, age_group, gender)
            print(f"Generated weekly recommended intake for {len(nutrients_consumed)} nutrients")
            return result

        except Exception as e:
            logger.error(f"Error getting weekly recommended intake: {str(e)}")
            return self._get_fallback_weekly_recommended_intake()

    def _analyze_weekly_recommended_intake_with_ai(self, nutrients_consumed: List[Dict[str, Any]], age_group: str, gender: str) -> Dict[str, Any]:
        """
        Use AI to generate recommended weekly intake based on consumed nutrients and the prompt
        """
        prompt_template = self._get_embedded_weekly_recommend_intake_prompt()

        # Prepare the input data
        input_data = {
            "nutrients_consumed": nutrients_consumed
        }
        print(input_data)
        prompt = f"{prompt_template}\n\n{json.dumps(input_data)}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional nutritionist providing evidence-based nutritional recommendations. Always return valid JSON responses with the exact structure requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=12000,
                temperature=0.1  # Low temperature for consistency
            )

            response_text = response.choices[0].message.content.strip()
            print(response_text)
            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text[:500]}...")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Validate the response structure
                if not self._validate_recommended_intake_response(parsed_data):
                    logger.warning("AI response has invalid structure, using fallback")
                    return self._get_fallback_weekly_recommended_intake()

                return parsed_data

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse weekly recommended intake JSON response: {str(e)}")
                logger.error(f"Response text: {response_text[:1000]}...")
                return self._get_fallback_weekly_recommended_intake()

        except Exception as e:
            logger.error(f"Error calling AI for weekly recommended intake: {str(e)}")
            return self._get_fallback_weekly_recommended_intake()

    def _get_embedded_weekly_recommend_intake_prompt(self) -> str:
        """Return embedded prompt for weekly intake recommendations"""
        return """You are a professional nutritionist and dietitian specializing in evidence-based nutritional recommendations. Your task is to provide recommended weekly intake values for nutrients based on a comprehensive analysis of what nutrients were consumed over a 7-day period.

INPUT:
You will receive a JSON object containing a list of nutrients that were consumed/absorbed over a 7-day period, with each nutrient having:
- name: the nutrient identifier (e.g., "protein", "vitamin_c", "sodium")
- total_amount: the total amount consumed in grams (summed across 7 days)
- unit: measurement unit (always "grams")

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object with recommended weekly intake values for adults aged 18-29. The output must follow this exact structure:

{
  "recommended_intakes": {
    "nutrient_name_1": recommended_weekly_grams,
    "nutrient_name_2": recommended_weekly_grams,
    "nutrient_name_3": recommended_weekly_grams
  },
  "age_group": "18-29",
  "gender": "general",
  "disclaimer": "These are general recommendations for a 7-day period. Individual needs may vary based on health status, activity level, and specific conditions. Consult a healthcare professional for personalized advice."
}

IMPORTANT NOTES:
- All values are multiplied by 7 to represent weekly intake recommendations
- Use the exact sources and notes as specified above for each nutrient
- MUST include each of the nutrients received
- Focus on 18-29 age group recommendations
- All values must be in grams
- Return ONLY valid JSON, no additional text or formatting"""

    def _get_mock_weekly_recommended_intake(self, nutrients_consumed: List[Dict[str, Any]], age_group: str, gender: str) -> Dict[str, Any]:
        """Return mock weekly recommended intake when API key is not available"""
        # Base weekly recommended intakes (7 days × daily values)
        base_recommendations = {
            "protein": {"value": 350, "source": "RDA", "notes": "7 days × General average recommendation for adults aged 18-29"},
            "fat": {"value": 455, "source": "DRI", "notes": "7 days × General average recommendation based on 20-35% of total daily calories"},
            "carbohydrate": {"value": 2100, "source": "DRI", "notes": "7 days × General average recommendation based on 45-65% of total daily calories"},
            "fiber": {"value": 175, "source": "EFSA", "notes": "7 days × Minimum recommended daily intake for adults"},
            "sugar": {"value": 350, "source": "WHO", "notes": "7 days × Maximum recommended daily limit for added sugars"},
            "sodium": {"value": 16.1, "source": "WHO/FAO", "notes": "7 days × Maximum recommended daily intake for adults"},
            "potassium": {"value": 24.5, "source": "EFSA", "notes": "7 days × Adequate intake recommendation for adults"},
            "calcium": {"value": 7.0, "source": "RDA", "notes": "7 days × Recommended daily allowance for adults aged 19-50"},
            "iron": {"value": 0.126, "source": "RDA", "notes": "7 days × General recommendation using women's RDA to cover higher needs"},
            "vitamin-c": {"value": 0.63, "source": "RDA", "notes": "7 days × Recommended daily allowance for adults"},
            "vitamin-d": {"value": 0.00014, "source": "RDA", "notes": "7 days × General recommendation for adults"},
            "magnesium": {"value": 2.8, "source": "RDA", "notes": "7 days × General average recommendation for adults"}
        }

        recommended_intakes = []
        consumed_nutrient_names = {nutrient['name'] for nutrient in nutrients_consumed}

        # Build dynamic recommended intakes object
        recommended_intakes_obj = {}

        # Include recommendations for nutrients that were consumed (only if they have established values > 0)
        for nutrient_name in consumed_nutrient_names:
            if nutrient_name in base_recommendations:
                value = base_recommendations[nutrient_name]["value"]
                if value > 0:
                    recommended_intakes_obj[nutrient_name] = value

        # If no specific nutrients were consumed, return all recommendations (excluding those with 0 values)
        if not recommended_intakes_obj:
            for nutrient_name, rec in base_recommendations.items():
                if rec["value"] > 0:
                    recommended_intakes_obj[nutrient_name] = rec["value"]

        return {
            "recommended_intakes": recommended_intakes_obj,
            "age_group": age_group,
            "gender": gender,
            "disclaimer": "These are general recommendations for a 7-day period. Individual needs may vary based on health status, activity level, and specific conditions. Consult a healthcare professional for personalized advice."
        }

    def _get_fallback_weekly_recommended_intake(self) -> Dict[str, Any]:
        """Return fallback weekly recommended intake when analysis fails"""
        return {
            "recommended_intakes": {
                "protein": 350,
                "fat": 455,
                "carbohydrate": 2100,
                "fiber": 175,
                "sugar": 350,
                "sodium": 16.1,
                "potassium": 24.5,
                "calcium": 7.0,
                "iron": 0.126,
                "vitamin-c": 0.63,
                "vitamin-d": 0.00014,
                "magnesium": 2.8
            },
            "age_group": "18-29",
            "gender": "general",
            "disclaimer": "These are general recommendations for a 7-day period. Individual needs may vary based on health status, activity level, and specific conditions. Consult a healthcare professional for personalized advice."
        }

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
        # Comprehensive prompt from foodanalyze.txt with enhanced JSON completion requirements
        prompt = f"""You are a nutrition analyzer.

Goal: For each food item, output a **strict JSON** record for a **single-person serving**, with ingredients, portion %, and a comprehensive set of nutrients (macros, fatty acids, amino acids, minerals, vitamins, bioactives, organic/other compounds). Every nutrient value must be in **grams**, with **per-ingredient** contributions and a **nutrient impact** tag (positive | neutral | negative). Output **JSON only** (no prose, no markdown).

INPUT
You will receive a JSON array like:
[
  {{"food_name":"string","meal_type":"breakfast|lunch|dinner|snack"}},
  ...
]

REQUIREMENTS
1. Assume a standard **one-person serving** (typical recipe or portion). If ambiguous, pick the most common interpretation.  
2. The **ingredients** array must list all key components, including main items and extras like *seasonings, oils, condiments, sauces, or garnishes*. Each ingredient has a portion_percent, summing to **100 ± 0.1**.  
3. The **nutrients_g** object must contain only those nutrients that are > 0 for the dish. For each nutrient, include:
   - full_name (descriptive name of the nutrient)
   - class (one of: "macronutrient" | "fatty_acid" | "amino_acid" | "mineral" | "vitamin" | "bioactive" | "organic_acid" | "sterol" | "sweetener" | "other")
   - impact (one of: "positive" | "neutral" | "negative")
   - total_g (grams for nutrients, kcal for energy_kcal, always numeric)  
   - by_ingredient: list of {{ingredient, grams_or_kcal, percent_of_chemical}} that sums to the nutrient's total_g.  
4. Units: Use grams for all nutrients EXCEPT energy_kcal which should be in kilocalories (kcal). Convert mg → g (e.g., 730 mg = 0.73; 120 µg = 0.00012).  
5. **CRITICAL**: Use ONLY singular forms of nutrients. DO NOT use plural forms (e.g., use "carbohydrate_g", not "carbohydrates_g"). Always include energy_kcal (calories) as a key nutrient.

OUTPUT SCHEMA
Return a valid JSON array of objects, each with exactly these keys:
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
      "<nutrient_key>": {{
        "full_name": "string",
        "class": "macronutrient|fatty_acid|amino_acid|mineral|vitamin|bioactive|organic_acid|sterol|sweetener|other",
        "impact": "positive|neutral|negative",
        "total_g": 0.0,
        "by_ingredient": [
          {{"ingredient": "string", "grams": 0.0, "percent_of_chemical": 0.0}}
        ]
      }}
      // DO NOT INCLUDE nutrient if total_g is 0.0
      // Always include energy_kcal (calories) as a key nutrient
    }}
  }}
]

CRITICAL JSON REQUIREMENTS:
1. Count opening and closing braces: every {{ must have a }}
2. Count opening and closing brackets: every [ must have a ]
3. Ensure no trailing commas before closing braces/brackets
4. Test that the JSON can be parsed successfully
5. If the response would be too long, prioritize core nutrients (energy_kcal, protein_g, carbohydrate_g, total_fat_g, fiber_g, vitamin_c_g, vitamin_a_rae_g, calcium_g, iron_g, potassium_g) and omit less critical ones, but maintain valid structure

VALIDATION
- Sum(ingredients.portion_percent) = 100 ± 0.1.
- For each nutrient: Sum(by_ingredient.grams) = total_g ± 0.1, and Sum(by_ingredient.percent_of_chemical) = 100 ± 0.1 (unless total_g == 0, then by_ingredient MUST be []).
- All numeric fields are numbers (no strings or units). All nutrient amounts in grams EXCEPT energy_kcal in kilocalories. Convert mg/µg to grams before reporting.
- Use singular forms of nutrients only - no plural forms allowed (e.g., use "carbohydrate_g", not "carbohydrates_g").
- Before finishing your response, validate that your JSON is complete and parseable.
"""

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

                # Validate the detailed structure of the parsed data
                if not self._validate_response_structure(parsed_data, len(foods)):
                    logger.warning("JSON has invalid structure")
                    raise json.JSONDecodeError("JSON has invalid structure", response_text, 0)

                return parsed_data

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse comprehensive analysis JSON response: {str(e)}")

                # Try to repair incomplete JSON
                repaired_json = self._repair_incomplete_json(json_content)
                if repaired_json:
                    logger.info("Successfully repaired incomplete JSON, retrying parse...")
                    try:
                        parsed_data = json.loads(repaired_json)

                        # Validate that we got the expected structure
                        if not isinstance(parsed_data, list):
                            logger.warning("Repaired response is not a JSON array")
                            raise json.JSONDecodeError("Repaired response is not a JSON array", repaired_json, 0)

                        # Validate the structure of the parsed data
                        if not self._validate_response_structure(parsed_data, len(foods)):
                            logger.warning("Repaired JSON has invalid structure")
                            raise json.JSONDecodeError("Repaired JSON has invalid structure", repaired_json, 0)

                        logger.info("Successfully parsed and validated repaired JSON response")
                        return parsed_data
                    except json.JSONDecodeError as repair_error:
                        logger.error(f"Failed to parse even repaired JSON: {str(repair_error)}")

                raise

        except Exception as e:
            logger.error(f"Error in comprehensive food analysis: {str(e)}")
            raise

    def _repair_incomplete_json(self, json_str: str) -> str | None:
        """
        Attempt to repair incomplete JSON responses from AI models.
        Handles common truncation issues like missing closing braces/brackets.
        """
        try:
            # Count braces and brackets to identify what's missing
            open_braces = json_str.count('{')
            close_braces = json_str.count('}')
            open_brackets = json_str.count('[')
            close_brackets = json_str.count(']')

            logger.info(f"JSON structure counts - braces: {open_braces}/{close_braces}, brackets: {open_brackets}/{close_brackets}")

            # If counts don't match, try to add missing closers
            repaired = json_str

            # Add missing closing braces
            while open_braces > close_braces:
                repaired += '}'
                close_braces += 1
                logger.info("Added missing closing brace")

            # Add missing closing brackets
            while open_brackets > close_brackets:
                repaired += ']'
                close_brackets += 1
                logger.info("Added missing closing bracket")

            # Try to balance any remaining structural issues
            repaired = self._balance_json_structure(repaired)

            # Test if the repaired JSON is valid
            try:
                json.loads(repaired)
                logger.info("Repaired JSON is valid")
                return repaired
            except json.JSONDecodeError as e:
                logger.warning(f"Repaired JSON still invalid: {str(e)}")
                return None

        except Exception as e:
            logger.error(f"Error during JSON repair: {str(e)}")
            return None

    def _balance_json_structure(self, json_str: str) -> str:
        """
        Attempt to balance JSON structure by fixing common issues.
        """
        try:
            # Remove trailing commas before closing braces/brackets
            import re
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)

            # Fix incomplete objects/arrays at the end
            lines = json_str.split('\n')
            last_line = lines[-1].strip() if lines else ""

            # If last line ends with a colon or comma, it's likely incomplete
            if last_line.endswith(':') or last_line.endswith(','):
                # Remove the incomplete line
                lines = lines[:-1]
                json_str = '\n'.join(lines)

                # Close any open structures
                open_count = json_str.count('{') + json_str.count('[') - json_str.count('}') - json_str.count(']')
                for _ in range(open_count):
                    if json_str.count('{') > json_str.count('}'):
                        json_str += '}'
                    elif json_str.count('[') > json_str.count(']'):
                        json_str += ']'

            return json_str

        except Exception as e:
            logger.error(f"Error balancing JSON structure: {str(e)}")
            return json_str

    def _validate_response_structure(self, data: List[Dict[str, Any]], expected_count: int) -> bool:
        """
        Validate that the parsed JSON response has the correct structure.
        """
        try:
            if not isinstance(data, list):
                logger.warning("Response is not a list")
                return False

            if len(data) != expected_count:
                logger.warning(f"Expected {expected_count} food items, got {len(data)}")
                return False

            required_keys = {"food_name", "meal_type", "serving", "ingredients", "nutrients_g"}

            for i, food_item in enumerate(data):
                if not isinstance(food_item, dict):
                    logger.warning(f"Food item {i} is not a dictionary")
                    return False

                # Check required top-level keys
                missing_keys = required_keys - set(food_item.keys())
                if missing_keys:
                    logger.warning(f"Food item {i} missing keys: {missing_keys}")
                    return False

                # Validate serving structure
                serving = food_item.get("serving", {})
                if not isinstance(serving, dict) or "description" not in serving or "grams" not in serving:
                    logger.warning(f"Food item {i} has invalid serving structure")
                    return False

                # Validate ingredients structure
                ingredients = food_item.get("ingredients", [])
                if not isinstance(ingredients, list) or len(ingredients) == 0:
                    logger.warning(f"Food item {i} has invalid ingredients structure")
                    return False

                # Validate nutrients_g structure
                nutrients_g = food_item.get("nutrients_g", {})
                if not isinstance(nutrients_g, dict):
                    logger.warning(f"Food item {i} has invalid nutrients_g structure")
                    return False

            logger.info(f"Response structure validation passed for {len(data)} food items")
            return True

        except Exception as e:
            logger.error(f"Error validating response structure: {str(e)}")
            return False

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

    def _analyze_recommended_intake_with_ai(self, nutrients_consumed: List[Dict[str, Any]], age_group: str, gender: str) -> Dict[str, Any]:
        """
        Use AI to generate recommended daily intake based on consumed nutrients and the prompt
        """
        prompt_template = self._get_embedded_recommend_intake_prompt()

        # Prepare the input data
        input_data = {
            "nutrients_consumed": nutrients_consumed
        }
        print(input_data)
        prompt = f"{prompt_template}\n\n{json.dumps(input_data)}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional nutritionist providing evidence-based nutritional recommendations. Always return valid JSON responses with the exact structure requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.1  # Low temperature for consistency
            )

            response_text = response.choices[0].message.content.strip()
            print(response_text)
            # Parse JSON response
            try:
                # Clean up response text to extract JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start == -1 or json_end == 0:
                    logger.warning(f"No JSON object found in response: {response_text[:500]}...")
                    raise json.JSONDecodeError("No JSON object found", response_text, 0)

                json_content = response_text[json_start:json_end]
                parsed_data = json.loads(json_content)

                # Validate the response structure
                if not self._validate_recommended_intake_response(parsed_data):
                    logger.warning("AI response has invalid structure, using fallback")
                    return self._get_fallback_recommended_intake()

                return parsed_data

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse recommended intake JSON response: {str(e)}")
                logger.error(f"Response text: {response_text[:1000]}...")
                return self._get_fallback_recommended_intake()

        except Exception as e:
            logger.error(f"Error in AI recommended intake analysis: {str(e)}")
            return self._get_fallback_recommended_intake()

    def _validate_recommended_intake_response(self, data: Dict[str, Any]) -> bool:
        """
        Validate that the AI response has the correct structure for recommended intake
        """
        try:
            required_keys = {"recommended_intakes", "age_group", "gender", "disclaimer"}

            if not isinstance(data, dict):
                logger.warning("Response is not a dictionary")
                return False

            # Check required top-level keys
            missing_keys = required_keys - set(data.keys())
            if missing_keys:
                logger.warning(f"Response missing keys: {missing_keys}")
                return False

            # Validate recommended_intakes structure - should now be an object, not array
            recommended_intakes = data.get("recommended_intakes", {})
            if not isinstance(recommended_intakes, dict) or len(recommended_intakes) == 0:
                logger.warning("recommended_intakes is not a valid object or is empty")
                return False

            # Validate that all values are numbers
            for nutrient, value in recommended_intakes.items():
                if not isinstance(value, (int, float)):
                    logger.warning(f"Recommended intake value for {nutrient} is not a number: {value}")
                    return False

            logger.info(f"Recommended intake response validation passed for {len(recommended_intakes)} nutrients")
            return True

        except Exception as e:
            logger.error(f"Error validating recommended intake response: {str(e)}")
            return False

    def _get_embedded_recommend_intake_prompt(self) -> str:
        """Return embedded prompt if file is not found"""
        return """You are a professional nutritionist and dietitian specializing in evidence-based nutritional recommendations. Your task is to provide recommended daily intake values for nutrients based on a comprehensive analysis of what nutrients were consumed on a given day.

INPUT:
You will receive a JSON object containing a list of nutrients that were consumed/absorbed on a given day, with each nutrient having:
- name: the nutrient identifier (e.g., "protein", "vitamin_c", "sodium")
- total_amount: the total amount consumed in grams
- unit: measurement unit (always "grams")

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object with recommended daily intake values for adults aged 18-29. The output must follow this exact structure:

{
  "recommended_intakes": {
    "nutrient_name_1": recommended_daily_grams,
    "nutrient_name_2": recommended_daily_grams,
    "nutrient_name_3": recommended_daily_grams
  },
  "age_group": "18-29",
  "gender": "general",
  "disclaimer": "These are general recommendations. Individual needs may vary based on health status, activity level, and specific conditions. Consult a healthcare professional for personalized advice."
}

RECOMMENDATION GUIDELINES:

1. **Macronutrients:**
   - Protein: 50g (RDA - General average recommendation for adults aged 18-29)
   - Fat: 65g (DRI - General average recommendation based on 20-35% of total daily calories)
   - Carbohydrate: 300g (DRI - General average recommendation based on 45-65% of total daily calories)
   - Fiber: 25g (EFSA - Minimum recommended daily intake for adults)
   - Sugar: 50g (WHO - Maximum recommended daily limit for added sugars)

2. **Minerals:**
   - Sodium: 2.3g (WHO/FAO - Maximum recommended daily intake for adults)
   - Potassium: 3.5g (EFSA - Adequate intake recommendation for adults)
   - Calcium: 1.0g (RDA - Recommended daily allowance for adults aged 19-50)
   - Iron: 0.018g (RDA - General recommendation using women's RDA to cover higher needs)
   - Magnesium: 0.4g (RDA - General average recommendation for adults)

3. **Vitamins:**
   - Vitamin C: 0.09g (RDA - Recommended daily allowance for adults)
   - Vitamin D: 0.00002g (RDA - General recommendation for adults)

4. **Other nutrients:**
   - Include any other nutrients present in the input that have established recommendations

IMPORTANT NOTES:
- Use the exact sources and notes as specified above for each nutrient
- Focus on 18-29 age group recommendations
- All values must be in grams
- Return ONLY valid JSON, no additional text or formatting"""

    def _get_mock_recommended_intake(self, nutrients_consumed: List[Dict[str, Any]], age_group: str, gender: str) -> Dict[str, Any]:
        """Return mock recommended intake when API key is not available"""
        # Base recommended intakes (matching analysisdata.json structure exactly)
        base_recommendations = {
            "protein": {"value": 50, "source": "RDA", "notes": "General average recommendation for adults aged 18-29"},
            "fat": {"value": 65, "source": "DRI", "notes": "General average recommendation based on 20-35% of total daily calories"},
            "carbohydrate": {"value": 300, "source": "DRI", "notes": "General average recommendation based on 45-65% of total daily calories"},
            "fiber": {"value": 25, "source": "EFSA", "notes": "Minimum recommended daily intake for adults"},
            "sugar": {"value": 50, "source": "WHO", "notes": "Maximum recommended daily limit for added sugars"},
            "sodium": {"value": 2.3, "source": "WHO/FAO", "notes": "Maximum recommended daily intake for adults"},
            "potassium": {"value": 3.5, "source": "EFSA", "notes": "Adequate intake recommendation for adults"},
            "calcium": {"value": 1.0, "source": "RDA", "notes": "Recommended daily allowance for adults aged 19-50"},
            "iron": {"value": 0.018, "source": "RDA", "notes": "General recommendation using women's RDA to cover higher needs"},
            "vitamin-c": {"value": 0.09, "source": "RDA", "notes": "Recommended daily allowance for adults"},
            "vitamin-d": {"value": 0.00002, "source": "RDA", "notes": "General recommendation for adults"},
            "magnesium": {"value": 0.4, "source": "RDA", "notes": "General average recommendation for adults"}
        }

        recommended_intakes = []
        consumed_nutrient_names = {nutrient['name'] for nutrient in nutrients_consumed}

        # Build dynamic recommended intakes object
        recommended_intakes_obj = {}

        # Include recommendations for nutrients that were consumed (only if they have established values > 0)
        for nutrient_name in consumed_nutrient_names:
            if nutrient_name in base_recommendations:
                value = base_recommendations[nutrient_name]["value"]
                if value > 0:
                    recommended_intakes_obj[nutrient_name] = value

        # If no specific nutrients were consumed, return all recommendations (excluding those with 0 values)
        if not recommended_intakes_obj:
            for nutrient_name, rec in base_recommendations.items():
                if rec["value"] > 0:
                    recommended_intakes_obj[nutrient_name] = rec["value"]

        return {
            "recommended_intakes": recommended_intakes_obj,
            "age_group": age_group,
            "gender": gender,
            "disclaimer": "These are general recommendations. Individual needs may vary based on health status, activity level, and specific conditions. Consult a healthcare professional for personalized advice."
        }

    def _get_fallback_recommended_intake(self) -> Dict[str, Any]:
        """Return fallback recommended intake when analysis fails"""
        return {
            "recommended_intakes": {
                "protein": 50,
                "carbohydrates": 300
            },
            "age_group": "18-29",
            "gender": "general",
            "disclaimer": "Analysis temporarily unavailable. Using general recommendations. Individual needs may vary based on health status, activity level, and specific conditions. Consult a healthcare professional for personalized advice."
        }

    def get_neutralization_recommendations(self, overdosed_substances: List[str]) -> Dict[str, Any]:
        """
        Generate recommendations to neutralize over-dosed substances through various methods
        including food, physical activities, drinks, and supplements.

        Args:
            overdosed_substances: List of substance names that are over the recommended levels

        Returns:
            Dict containing recommendations categorized by method
        """
        try:
            if not overdosed_substances:
                return {
                    "success": False,
                    "error": "No over-dosed substances provided",
                    "recommendations": {},
                    "disclaimer": self.disclaimer
                }

            # Create prompt for AI
            prompt = self._get_neutralization_prompt(overdosed_substances)

            if self.use_mock:
                return self._get_mock_neutralization_recommendations(overdosed_substances)

            # Call AI for recommendations
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a nutrition and health expert. Provide safe, evidence-based recommendations for balancing nutrient levels."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=2000
            )

            ai_response = response.choices[0].message.content
            logger.info(f"AI response for neutralization: {ai_response}")

            # Parse and validate response
            return self._parse_neutralization_response(ai_response, overdosed_substances)

        except Exception as e:
            logger.error(f"Error getting neutralization recommendations: {str(e)}")
            return self._get_fallback_neutralization_recommendations(overdosed_substances)

    def _get_neutralization_prompt(self, overdosed_substances: List[str]) -> str:
        """Generate prompt for neutralization recommendations"""
        substances_str = ", ".join(overdosed_substances)

        return f"""
        The user has consumed excessive amounts of the following nutrients/substances: {substances_str}

        Please provide practical, safe recommendations to help neutralize or balance these over-consumed nutrients through various methods:

        1. FOOD CHOICES: Suggest foods that can help balance or counteract the excess
        2. PHYSICAL ACTIVITIES: Recommend exercises or activities that may help metabolize or utilize the excess nutrients
        3. DRINKS/BEVERAGES: Suggest drinks that may help with elimination or balancing
        4. SUPPLEMENTS: Recommend safe supplements that may help (if appropriate)
        5. GENERAL LIFESTYLE: Other lifestyle recommendations

        IMPORTANT SAFETY GUIDELINES:
        - Never suggest harmful practices
        - Focus on natural, safe methods
        - Include hydration recommendations when relevant
        - Suggest consulting healthcare professionals for serious imbalances
        - Be specific about timing and amounts when possible

        Format your response as a valid JSON object with this structure:
        {{
            "food_recommendations": [
                {{
                    "substance": "substance_name",
                    "foods": ["food1", "food2"],
                    "reasoning": "brief explanation",
                    "timing": "when to consume"
                }}
            ],
            "activity_recommendations": [
                {{
                    "substance": "substance_name",
                    "activities": ["activity1", "activity2"],
                    "duration": "recommended duration",
                    "reasoning": "brief explanation"
                }}
            ],
            "drink_recommendations": [
                {{
                    "substance": "substance_name",
                    "drinks": ["drink1", "drink2"],
                    "reasoning": "brief explanation",
                    "amount": "recommended amount"
                }}
            ],
            "supplement_recommendations": [
                {{
                    "substance": "substance_name",
                    "supplements": ["supplement1", "supplement2"],
                    "dosage": "recommended dosage",
                    "reasoning": "brief explanation",
                    "caution": "any precautions"
                }}
            ],
            "lifestyle_recommendations": [
                {{
                    "substance": "substance_name",
                    "advice": ["advice1", "advice2"],
                    "reasoning": "brief explanation"
                }}
            ]
        }}

        Be specific, practical, and prioritize safety. Focus on evidence-based approaches when possible.
        """

    def _parse_neutralization_response(self, ai_response: str, overdosed_substances: List[str]) -> Dict[str, Any]:
        """Parse AI response for neutralization recommendations"""
        try:
            # Clean the response
            cleaned_response = ai_response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]

            parsed_data = json.loads(cleaned_response.strip())

            # Validate structure
            if not isinstance(parsed_data, dict):
                raise ValueError("Response is not a valid object")

            return {
                "success": True,
                "recommendations": parsed_data,
                "overdosed_substances": overdosed_substances,
                "disclaimer": self.disclaimer
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse neutralization response: {e}")
            return self._get_fallback_neutralization_recommendations(overdosed_substances)
        except Exception as e:
            logger.error(f"Error parsing neutralization response: {e}")
            return self._get_fallback_neutralization_recommendations(overdosed_substances)

    def _get_mock_neutralization_recommendations(self, overdosed_substances: List[str]) -> Dict[str, Any]:
        """Return mock neutralization recommendations for testing"""
        mock_recommendations = {
            "food_recommendations": [],
            "activity_recommendations": [],
            "drink_recommendations": [],
            "supplement_recommendations": [],
            "lifestyle_recommendations": []
        }

        for substance in overdosed_substances:
            substance_lower = substance.lower()
            if "sodium" in substance_lower or "salt" in substance_lower:
                mock_recommendations["food_recommendations"].append({
                    "substance": substance,
                    "foods": ["potassium-rich foods (bananas, spinach, avocados)", "watermelon", "oranges"],
                    "reasoning": "Potassium helps balance sodium levels in the body",
                    "timing": "Throughout the day"
                })
                mock_recommendations["drink_recommendations"].append({
                    "substance": substance,
                    "drinks": ["herbal teas", "coconut water", "electrolyte-balanced drinks"],
                    "reasoning": "Helps flush excess sodium and maintain hydration",
                    "amount": "8-10 glasses of water daily"
                })
            elif "sugar" in substance_lower or "carbohydrates" in substance_lower:
                mock_recommendations["activity_recommendations"].append({
                    "substance": substance,
                    "activities": ["brisk walking", "cycling", "swimming"],
                    "duration": "30-45 minutes",
                    "reasoning": "Exercise helps utilize excess carbohydrates as energy"
                })
                mock_recommendations["food_recommendations"].append({
                    "substance": substance,
                    "foods": ["high-fiber vegetables", "lean proteins", "whole grains"],
                    "reasoning": "Fiber slows sugar absorption and provides balanced nutrition",
                    "timing": "With each meal"
                })
            elif "protein" in substance_lower:
                mock_recommendations["activity_recommendations"].append({
                    "substance": substance,
                    "activities": ["weight training", "resistance exercises", "yoga"],
                    "duration": "45-60 minutes",
                    "reasoning": "Building muscle utilizes excess protein amino acids"
                })
            else:
                mock_recommendations["lifestyle_recommendations"].append({
                    "substance": substance,
                    "advice": ["Stay hydrated", "Monitor intake for a few days", "Consult a nutritionist if concerned"],
                    "reasoning": "General balancing approach for nutrient excess"
                })

        return {
            "success": True,
            "recommendations": mock_recommendations,
            "overdosed_substances": overdosed_substances,
            "disclaimer": self.disclaimer
        }

    def _get_fallback_neutralization_recommendations(self, overdosed_substances: List[str]) -> Dict[str, Any]:
        """Return fallback recommendations when AI analysis fails"""
        return {
            "success": False,
            "error": "Unable to generate personalized recommendations at this time",
            "recommendations": {
                "general_advice": [
                    "Stay well hydrated with water",
                    "Consider lighter meals for the next 24 hours",
                    "Focus on balanced nutrition moving forward",
                    "Consult a healthcare professional if you have concerns about nutrient levels"
                ]
            },
            "overdosed_substances": overdosed_substances,
            "disclaimer": "General recommendations only. Please consult a healthcare professional for personalized advice regarding nutrient imbalances."
        }

