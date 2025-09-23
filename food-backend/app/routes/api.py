from flask import Blueprint, request, jsonify, current_app
import logging
from app.services.food_analyzer import FoodAnalyzer
from app.utils.validators import validate_food_name
from app.utils.rate_limiter import RateLimiter
from app.models.request_models import FoodAnalysisRequest, UserProfile, MealAnalysisRequest

api_bp = Blueprint('api', __name__)

# Initialize services
food_analyzer = FoodAnalyzer()
rate_limiter = RateLimiter()

logger = logging.getLogger(__name__)

@api_bp.route('/analyze-ingredients', methods=['POST'])
def analyze_ingredients():
    """
    Analyze food based on selected ingredients
    Expects: {"ingredients": ["string"], "user_profile": {...}, "portion_for_one": true}
    Returns: {"ingredients": [...], "substances": [...], "mitigation_tips": [...], "categorized_tips": [...], "disclaimer": "..."}
    """
    try:
        # Get client IP for rate limiting
        client_ip = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', 'unknown')

        # Check rate limit
        if not rate_limiter.is_allowed(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }), 429

        # Get and validate input
        data = request.get_json()

        if not data or 'ingredients' not in data:
            return jsonify({
                'error': 'Missing required field: ingredients',
                'code': 'MISSING_FIELD'
            }), 400

        ingredients = data['ingredients']
        if not isinstance(ingredients, list) or len(ingredients) == 0:
            return jsonify({
                'error': 'Ingredients must be a non-empty array',
                'code': 'INVALID_FIELD_TYPE'
            }), 400

        # Validate each ingredient
        for ingredient in ingredients:
            if not isinstance(ingredient, str) or not ingredient.strip():
                return jsonify({
                    'error': 'All ingredients must be non-empty strings',
                    'code': 'INVALID_INGREDIENT'
                }), 400

        # Parse portion specification (defaults to True for one person)
        portion_for_one = data.get('portion_for_one', True)
        if not isinstance(portion_for_one, bool):
            return jsonify({
                'error': 'portion_for_one must be a boolean value',
                'code': 'INVALID_FIELD_TYPE'
            }), 400

        # Parse and validate user profile if provided
        user_profile = None
        if 'user_profile' in data and data['user_profile']:
            profile_data = data['user_profile']
            try:
                # Validate profile data
                if not all(key in profile_data for key in ['age_group', 'weight', 'height', 'is_completed']):
                    logger.warning("Incomplete profile data provided")
                else:
                    # Validate age group
                    if profile_data['age_group'] not in ['0-18', '19-40', '>40']:
                        logger.warning(f"Invalid age group: {profile_data['age_group']}")
                    # Validate weight and height ranges
                    elif not (30 <= profile_data['weight'] <= 300):
                        logger.warning(f"Invalid weight: {profile_data['weight']}")
                    elif not (100 <= profile_data['height'] <= 250):
                        logger.warning(f"Invalid height: {profile_data['height']}")
                    else:
                        user_profile = UserProfile(
                            age_group=profile_data['age_group'],
                            weight=int(profile_data['weight']),
                            height=int(profile_data['height']),
                            is_completed=bool(profile_data['is_completed']),
                            created_at=profile_data.get('created_at', ''),
                            updated_at=profile_data.get('updated_at', '')
                        )
                        logger.info(f"Profile data included: Age {user_profile.age_group}, Weight {user_profile.weight}cm, Height {user_profile.height}cm")
            except Exception as e:
                logger.warning(f"Error parsing profile data: {str(e)}")

        # Clean and prepare ingredients list
        cleaned_ingredients = [ing.strip() for ing in ingredients if ing.strip()]

        # Log the request
        logger.info(f"Analyzing {len(cleaned_ingredients)} ingredients from IP: {client_ip}" + (f" with profile data" if user_profile else ""))

        # Analyze ingredients using AI
        result = food_analyzer.analyze_ingredients(cleaned_ingredients, user_profile, portion_for_one)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return successful response
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error analyzing ingredients: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/extract-ingredients', methods=['POST'])
def extract_ingredients():
    """
    Extract ingredients from food name using AI
    Expects: {"food_name": "string"}
    Returns: {"ingredients": [{"name": "string", "quantity": "string", "selected": bool, "is_custom": bool}], "food_name": "string"}
    """
    try:
        # Get client IP for rate limiting
        client_ip = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', 'unknown')

        # Check rate limit
        if not rate_limiter.is_allowed(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }), 429

        # Get and validate input
        data = request.get_json()

        if not data or 'food_name' not in data:
            return jsonify({
                'error': 'Missing required field: food_name',
                'code': 'MISSING_FIELD'
            }), 400

        food_name = data['food_name'].strip()

        # Validate food name
        validation_result = validate_food_name(food_name)
        if not validation_result['valid']:
            return jsonify({
                'error': validation_result['error'],
                'code': 'INVALID_INPUT'
            }), 400

        # Log the request
        logger.info(f"Extracting ingredients for food: {food_name} from IP: {client_ip}")

        # Extract ingredients using AI
        ingredients = food_analyzer.extract_ingredients(food_name)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return successful response
        return jsonify({
            'ingredients': ingredients,
            'food_name': food_name
        }), 200

    except Exception as e:
        logger.error(f"Error extracting ingredients: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/analyze-food', methods=['POST'])
def analyze_food():
    """
    Analyze food impact endpoint with portion specification and optional profile data
    Expects: {"food_name": "string", "portion_for_one": true, "user_profile": {...}}
    Returns: {"ingredients": [...], "ingredient_quantities": [...], "substances": [...], "mitigation_tips": [...], "disclaimer": "...", "portion_for_one": true, "personalized_recommendations": [...]}
    """
    try:
        # Get client IP for rate limiting
        client_ip = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', 'unknown')

        # Check rate limit
        if not rate_limiter.is_allowed(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }), 429

        # Get and validate input
        data = request.get_json()

        if not data or 'food_name' not in data:
            return jsonify({
                'error': 'Missing required field: food_name',
                'code': 'MISSING_FIELD'
            }), 400

        food_name = data['food_name'].strip()

        # Parse portion specification (defaults to True for one person)
        portion_for_one = data.get('portion_for_one', True)
        if not isinstance(portion_for_one, bool):
            return jsonify({
                'error': 'portion_for_one must be a boolean value',
                'code': 'INVALID_FIELD_TYPE'
            }), 400

        # Validate food name
        validation_result = validate_food_name(food_name)
        if not validation_result['valid']:
            return jsonify({
                'error': validation_result['error'],
                'code': 'INVALID_INPUT'
            }), 400

        # Parse and validate user profile if provided
        user_profile = None
        if 'user_profile' in data and data['user_profile']:
            profile_data = data['user_profile']
            try:
                # Validate profile data
                if not all(key in profile_data for key in ['age_group', 'weight', 'height', 'is_completed']):
                    logger.warning("Incomplete profile data provided")
                else:
                    # Validate age group
                    if profile_data['age_group'] not in ['0-18', '19-40', '>40']:
                        logger.warning(f"Invalid age group: {profile_data['age_group']}")
                    # Validate weight and height ranges
                    elif not (30 <= profile_data['weight'] <= 300):
                        logger.warning(f"Invalid weight: {profile_data['weight']}")
                    elif not (100 <= profile_data['height'] <= 250):
                        logger.warning(f"Invalid height: {profile_data['height']}")
                    else:
                        user_profile = UserProfile(
                            age_group=profile_data['age_group'],
                            weight=int(profile_data['weight']),
                            height=int(profile_data['height']),
                            is_completed=bool(profile_data['is_completed']),
                            created_at=profile_data.get('created_at', ''),
                            updated_at=profile_data.get('updated_at', '')
                        )
                        logger.info(f"Profile data included: Age {user_profile.age_group}, Weight {user_profile.weight}cm, Height {user_profile.height}cm")
            except Exception as e:
                logger.warning(f"Error parsing profile data: {str(e)}")

        # Create request object
        analysis_request = FoodAnalysisRequest(
            food_name=food_name,
            portion_for_one=portion_for_one,
            user_profile=user_profile
        )

        # Log the request
        logger.info(f"Analyzing food: {food_name} from IP: {client_ip}" + (f" with profile data" if user_profile else ""))

        # Analyze the food using GenAI
        result = food_analyzer.analyze_food_with_profile(analysis_request)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return successful response
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error analyzing food: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/analyze-meal', methods=['POST'])
def analyze_meal():
    """
    Analyze a meal using single AI prompt for both ingredients and substances
    Expects: {"food_name": "string", "meal_type": "breakfast|lunch|dinner|snack"}
    Returns: {"food_name": "string", "meal_type": "string", "ingredients": [...], "substances": [...]}
    """
    try:
        # Get client IP for rate limiting
        client_ip = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', 'unknown')

        # Check rate limit
        if not rate_limiter.is_allowed(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }), 429

        # Get and validate input
        data = request.get_json()

        if not data or 'food_name' not in data or 'meal_type' not in data:
            return jsonify({
                'error': 'Missing required fields: food_name and meal_type',
                'code': 'MISSING_FIELD'
            }), 400

        food_name = data['food_name'].strip()
        meal_type = data['meal_type'].strip()

        # Validate food name
        if not food_name or len(food_name) < 2:
            return jsonify({
                'error': 'Food name must be at least 2 characters long',
                'code': 'INVALID_FOOD_NAME'
            }), 400

        # Validate meal type
        valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
        if meal_type not in valid_meal_types:
            return jsonify({
                'error': f'Meal type must be one of: {", ".join(valid_meal_types)}',
                'code': 'INVALID_MEAL_TYPE'
            }), 400

        # Log the request
        logger.info(f"Meal analysis request: {food_name} ({meal_type}) from IP: {client_ip}")

        # Analyze the meal
        result = food_analyzer.analyze_meal(food_name, meal_type)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Log success
        logger.info(f"Meal analysis completed: {food_name} - {len(result.get('ingredients', []))} ingredients, {len(result.get('substances', []))} substances")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in meal analysis endpoint: {str(e)}")
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/analyze-foods', methods=['POST'])
def analyze_foods():
    """
    Analyze multiple foods in a single AI prompt for detailed analysis
    Expects: {"foods": [{"food_name": "string", "meal_type": "breakfast|lunch|dinner|snack", "id": "string"}]}
    Returns: {"results": [{"food_id": "string", "food_name": "string", "meal_type": "string", "ingredients": [...], "substances": [...]}]}
    """
    try:
        # Get client IP for rate limiting
        client_ip = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', 'unknown')

        # Check rate limit
        if not rate_limiter.is_allowed(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }), 429

        # Get and validate input
        data = request.get_json()

        if not data or 'foods' not in data:
            return jsonify({
                'error': 'Missing required field: foods',
                'code': 'MISSING_FIELD'
            }), 400

        foods = data['foods']
        if not isinstance(foods, list) or len(foods) == 0:
            return jsonify({
                'error': 'Foods must be a non-empty array',
                'code': 'INVALID_FIELD_TYPE'
            }), 400

        # Validate each food item
        for i, food in enumerate(foods):
            if not isinstance(food, dict):
                return jsonify({
                    'error': f'Food item at index {i} must be an object',
                    'code': 'INVALID_FOOD_ITEM'
                }), 400

            required_fields = ['food_name', 'meal_type', 'id']
            for field in required_fields:
                if field not in food:
                    return jsonify({
                        'error': f'Missing required field "{field}" in food item at index {i}',
                        'code': 'MISSING_FIELD'
                    }), 400

            # Validate food name
            food_name = food['food_name'].strip()
            if not food_name or len(food_name) < 2:
                return jsonify({
                    'error': f'Food name at index {i} must be at least 2 characters long',
                    'code': 'INVALID_FOOD_NAME'
                }), 400

            # Validate meal type
            valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
            meal_type = food['meal_type'].strip()
            if meal_type not in valid_meal_types:
                return jsonify({
                    'error': f'Meal type at index {i} must be one of: {", ".join(valid_meal_types)}',
                    'code': 'INVALID_MEAL_TYPE'
                }), 400

        # Log the request
        logger.info(f"Batch food analysis request: {len(foods)} foods from IP: {client_ip}")

        # Analyze all foods in a single prompt
        result = food_analyzer.analyze_foods_batch(foods)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Log success
        logger.info(f"Batch food analysis completed: {len(result.get('results', []))} results")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in batch food analysis endpoint: {str(e)}")
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'food-impact-api',
        'version': '1.0.0'
    })
