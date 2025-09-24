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

@api_bp.route('/analyze-food', methods=['POST'])
def analyze_food():
    """
    Analyze food impact endpoint using comprehensive nutritional analysis
    Expects: [{"food_name": "string", "meal_type": "breakfast|lunch|dinner|snack"}, ...]
    Returns: [{"food_name": "string", "meal_type": "string", "serving": {...}, "ingredients": [...], "nutrients_g": {...}}]
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

        if not data:
            return jsonify({
                'error': 'Missing request data',
                'code': 'MISSING_DATA'
            }), 400

        # Expect an array of food objects
        if not isinstance(data, list):
            return jsonify({
                'error': 'Input must be an array of food objects',
                'code': 'INVALID_INPUT_FORMAT'
            }), 400

        if len(data) == 0:
            return jsonify({
                'error': 'Food array cannot be empty',
                'code': 'EMPTY_FOOD_ARRAY'
            }), 400

        # Validate each food item
        validated_foods = []
        for i, food_item in enumerate(data):
            if not isinstance(food_item, dict):
                return jsonify({
                    'error': f'Food item at index {i} must be an object',
                    'code': 'INVALID_FOOD_ITEM'
                }), 400

            if 'food_name' not in food_item:
                return jsonify({
                    'error': f'Missing food_name in food item at index {i}',
                    'code': 'MISSING_FOOD_NAME'
                }), 400

            if 'meal_type' not in food_item:
                return jsonify({
                    'error': f'Missing meal_type in food item at index {i}',
                    'code': 'MISSING_MEAL_TYPE'
                }), 400

            food_name = food_item['food_name'].strip()
            meal_type = food_item['meal_type'].strip()

            # Validate food name
            validation_result = validate_food_name(food_name)
            if not validation_result['valid']:
                return jsonify({
                    'error': f'Invalid food_name at index {i}: {validation_result["error"]}',
                    'code': 'INVALID_FOOD_NAME'
                }), 400

            # Validate meal type
            valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
            if meal_type not in valid_meal_types:
                return jsonify({
                    'error': f'Invalid meal_type at index {i}. Must be one of: {", ".join(valid_meal_types)}',
                    'code': 'INVALID_MEAL_TYPE'
                }), 400

            validated_foods.append({
                'food_name': food_name,
                'meal_type': meal_type
            })

        # Log the request
        logger.info(f"Analyzing {len(validated_foods)} foods from IP: {client_ip}")

        # Analyze the foods using comprehensive nutritional analysis
        result = food_analyzer.analyze_foods_comprehensive(validated_foods)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return successful response
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error analyzing foods: {str(e)}", exc_info=True)
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
