from flask import Blueprint, request, jsonify, current_app
import logging
from decimal import Decimal
from app.services.food_analyzer import FoodAnalyzer
from app.utils.validators import validate_food_name
from app.utils.rate_limiter import RateLimiter
from app.models.request_models import FoodAnalysisRequest, UserProfile, MealAnalysisRequest, RecommendedIntakeRequest, NutrientConsumed

api_bp = Blueprint('api', __name__)

# Initialize services
food_analyzer = FoodAnalyzer()
rate_limiter = RateLimiter()

# Import job manager for async processing
try:
    from app.services.job_manager import JobManager
    job_manager = JobManager()
except ImportError:
    job_manager = None

logger = logging.getLogger(__name__)

def convert_decimals_to_floats(obj):
    """
    Recursively convert Decimal values to float for JSON serialization
    """
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {key: convert_decimals_to_floats(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals_to_floats(item) for item in obj]
    else:
        return obj

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


@api_bp.route('/recommended-intake', methods=['POST'])
def get_recommended_intake():
    """
    Get recommended daily intake based on nutrients consumed on a given day
    Expects: {"nutrients_consumed": [{"name": "protein", "total_amount": 75.2, "unit": "grams"}, ...], "age_group": "18-29", "gender": "general"}
    Returns: {"recommended_intakes": [...], "age_group": "18-29", "gender": "general", "disclaimer": "..."}
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

        # Validate required fields
        if 'nutrients_consumed' not in data:
            return jsonify({
                'error': 'Missing nutrients_consumed field',
                'code': 'MISSING_NUTRIENTS_CONSUMED'
            }), 400

        nutrients_consumed = data['nutrients_consumed']
        if not isinstance(nutrients_consumed, list):
            return jsonify({
                'error': 'nutrients_consumed must be an array',
                'code': 'INVALID_NUTRIENTS_FORMAT'
            }), 400

        if len(nutrients_consumed) == 0:
            return jsonify({
                'error': 'nutrients_consumed array cannot be empty',
                'code': 'EMPTY_NUTRIENTS_ARRAY'
            }), 400

        # Validate each nutrient item
        validated_nutrients = []
        for i, nutrient in enumerate(nutrients_consumed):
            if not isinstance(nutrient, dict):
                return jsonify({
                    'error': f'Nutrient item at index {i} must be an object',
                    'code': 'INVALID_NUTRIENT_ITEM'
                }), 400

            required_fields = ['name', 'total_amount']
            for field in required_fields:
                if field not in nutrient:
                    return jsonify({
                        'error': f'Missing {field} in nutrient item at index {i}',
                        'code': 'MISSING_NUTRIENT_FIELD'
                    }), 400

            # Validate nutrient name (should be a string)
            if not isinstance(nutrient['name'], str) or not nutrient['name'].strip():
                return jsonify({
                    'error': f'Invalid nutrient name at index {i}',
                    'code': 'INVALID_NUTRIENT_NAME'
                }), 400

            # Validate total_amount (should be a number)
            try:
                total_amount = float(nutrient['total_amount'])
                if total_amount < 0:
                    return jsonify({
                        'error': f'Nutrient amount must be non-negative at index {i}',
                        'code': 'INVALID_NUTRIENT_AMOUNT'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'error': f'Invalid nutrient amount at index {i}',
                    'code': 'INVALID_NUTRIENT_AMOUNT'
                }), 400

            # Validate unit (optional, defaults to "grams")
            unit = nutrient.get('unit', 'grams')
            if not isinstance(unit, str):
                unit = 'grams'

            validated_nutrients.append({
                'name': nutrient['name'].strip(),
                'total_amount': total_amount,
                'unit': unit
            })

        # Get optional parameters
        age_group = data.get('age_group', '18-29')
        gender = data.get('gender', 'general')

        # Validate age_group and gender
        valid_age_groups = ['0-18', '19-40', '18-29', '>40']
        if age_group not in valid_age_groups:
            return jsonify({
                'error': f'Invalid age_group. Must be one of: {", ".join(valid_age_groups)}',
                'code': 'INVALID_AGE_GROUP'
            }), 400

        valid_genders = ['male', 'female', 'general']
        if gender not in valid_genders:
            return jsonify({
                'error': f'Invalid gender. Must be one of: {", ".join(valid_genders)}',
                'code': 'INVALID_GENDER'
            }), 400

        # Log the request
        logger.info(f"Getting recommended intake for {len(validated_nutrients)} nutrients from IP: {client_ip}")

        # Get recommended intake using AI analysis
        result = food_analyzer.get_recommended_intake(validated_nutrients, age_group, gender)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return successful response
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting recommended intake: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/recommended-intake-async', methods=['POST'])
def get_recommended_intake_async():
    """
    Start asynchronous recommended intake analysis job
    Expects: {"nutrients_consumed": [{"name": "protein", "total_amount": 75.2, "unit": "grams"}, ...], "age_group": "18-29", "gender": "general"}
    Returns: {"job_id": "string", "status": "queued", "message": "Job queued for processing"}
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

        if not job_manager:
            return jsonify({
                'error': 'Asynchronous processing not available',
                'code': 'ASYNC_NOT_AVAILABLE'
            }), 503

        # Get and validate input
        data = request.get_json()

        if not data:
            return jsonify({
                'error': 'Missing request data',
                'code': 'MISSING_DATA'
            }), 400

        # Validate required fields
        if 'nutrients_consumed' not in data:
            return jsonify({
                'error': 'Missing nutrients_consumed field',
                'code': 'MISSING_NUTRIENTS_CONSUMED'
            }), 400

        nutrients_consumed = data['nutrients_consumed']
        if not isinstance(nutrients_consumed, list):
            return jsonify({
                'error': 'nutrients_consumed must be an array',
                'code': 'INVALID_NUTRIENTS_FORMAT'
            }), 400

        if len(nutrients_consumed) == 0:
            return jsonify({
                'error': 'nutrients_consumed array cannot be empty',
                'code': 'EMPTY_NUTRIENTS_ARRAY'
            }), 400

        # Validate each nutrient item
        validated_nutrients = []
        for i, nutrient in enumerate(nutrients_consumed):
            if not isinstance(nutrient, dict):
                return jsonify({
                    'error': f'Nutrient item at index {i} must be an object',
                    'code': 'INVALID_NUTRIENT_ITEM'
                }), 400

            required_fields = ['name', 'total_amount']
            for field in required_fields:
                if field not in nutrient:
                    return jsonify({
                        'error': f'Missing {field} in nutrient item at index {i}',
                        'code': 'MISSING_NUTRIENT_FIELD'
                    }), 400

            # Validate nutrient name (should be a string)
            if not isinstance(nutrient['name'], str) or not nutrient['name'].strip():
                return jsonify({
                    'error': f'Invalid nutrient name at index {i}',
                    'code': 'INVALID_NUTRIENT_NAME'
                }), 400

            # Validate total_amount (should be a number)
            try:
                total_amount = float(nutrient['total_amount'])
                if total_amount < 0:
                    return jsonify({
                        'error': f'Nutrient amount must be non-negative at index {i}',
                        'code': 'INVALID_NUTRIENT_AMOUNT'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'error': f'Invalid nutrient amount at index {i}',
                    'code': 'INVALID_NUTRIENT_AMOUNT'
                }), 400

            # Validate unit (optional, defaults to "grams")
            unit = nutrient.get('unit', 'grams')
            if not isinstance(unit, str):
                unit = 'grams'

            validated_nutrients.append({
                'name': nutrient['name'].strip(),
                'total_amount': total_amount,
                'unit': unit
            })

        # Get optional parameters
        age_group = data.get('age_group', '18-29')
        gender = data.get('gender', 'general')

        # Validate age_group and gender
        valid_age_groups = ['0-18', '19-40', '18-29', '>40']
        if age_group not in valid_age_groups:
            return jsonify({
                'error': f'Invalid age_group. Must be one of: {", ".join(valid_age_groups)}',
                'code': 'INVALID_AGE_GROUP'
            }), 400

        valid_genders = ['male', 'female', 'general']
        if gender not in valid_genders:
            return jsonify({
                'error': f'Invalid gender. Must be one of: {", ".join(valid_genders)}',
                'code': 'INVALID_GENDER'
            }), 400

        # Log the request
        logger.info(f"Creating async job for recommended intake analysis of {len(validated_nutrients)} nutrients from IP: {client_ip}")

        # Create async job with proper job_data structure
        job_data = {
            'job_type': 'recommended_intake',
            'nutrients_consumed': validated_nutrients,
            'age_group': age_group,
            'gender': gender
        }
        job_id = job_manager.create_job(job_data)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return job ID immediately
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'message': 'Job queued for processing. Use /job-status/{job_id} to check progress.',
            'estimated_time': '30-60 seconds'
        }), 202

    except Exception as e:
        logger.error(f"Error creating async recommended intake job: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/recommended-intake-for-week', methods=['POST'])
def get_weekly_recommended_intake():
    """
    Get recommended weekly intake based on nutrients consumed over a week
    Expects: {"nutrients_consumed": [{"name": "protein", "total_amount": 75.2, "unit": "grams"}, ...], "age_group": "18-29", "gender": "general"}
    Returns: {"recommended_intakes": {...}, "age_group": "18-29", "gender": "general", "disclaimer": "..."}
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

        # Validate required fields
        if 'nutrients_consumed' not in data:
            return jsonify({
                'error': 'Missing nutrients_consumed field',
                'code': 'MISSING_NUTRIENTS_CONSUMED'
            }), 400

        nutrients_consumed = data['nutrients_consumed']
        if not isinstance(nutrients_consumed, list):
            return jsonify({
                'error': 'nutrients_consumed must be an array',
                'code': 'INVALID_NUTRIENTS_FORMAT'
            }), 400

        if len(nutrients_consumed) == 0:
            return jsonify({
                'error': 'nutrients_consumed array cannot be empty',
                'code': 'EMPTY_NUTRIENTS_ARRAY'
            }), 400

        # Validate each nutrient item and filter out invalid ones
        validated_nutrients = []
        for i, nutrient in enumerate(nutrients_consumed):
            # Skip nutrients with invalid or zero amounts early
            try:
                amount = float(nutrient.get('total_amount', 0))
                if amount <= 0:
                    continue
            except (ValueError, TypeError):
                continue

            if not isinstance(nutrient, dict):
                return jsonify({
                    'error': f'Nutrient item at index {i} must be an object',
                    'code': 'INVALID_NUTRIENT_ITEM'
                }), 400

            required_fields = ['name', 'total_amount']
            for field in required_fields:
                if field not in nutrient:
                    return jsonify({
                        'error': f'Missing {field} in nutrient item at index {i}',
                        'code': 'MISSING_NUTRIENT_FIELD'
                    }), 400

            # Validate nutrient name (should be a string)
            if not isinstance(nutrient['name'], str) or not nutrient['name'].strip():
                return jsonify({
                    'error': f'Invalid nutrient name at index {i}',
                    'code': 'INVALID_NUTRIENT_NAME'
                }), 400

            # Validate total_amount (should be a number)
            try:
                total_amount = float(nutrient['total_amount'])
                if total_amount < 0:
                    return jsonify({
                        'error': f'Nutrient amount must be non-negative at index {i}',
                        'code': 'INVALID_NUTRIENT_AMOUNT'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'error': f'Invalid nutrient amount at index {i}',
                    'code': 'INVALID_NUTRIENT_AMOUNT'
                }), 400

            # Validate unit (optional, defaults to "grams")
            unit = nutrient.get('unit', 'grams')
            if not isinstance(unit, str):
                unit = 'grams'

            validated_nutrients.append({
                'name': nutrient['name'].strip(),
                'total_amount': total_amount,
                'unit': unit
            })

        # Get optional parameters
        age_group = data.get('age_group', '18-29')
        gender = data.get('gender', 'general')

        # Validate age_group and gender
        valid_age_groups = ['0-18', '19-40', '18-29', '>40']
        if age_group not in valid_age_groups:
            return jsonify({
                'error': f'Invalid age_group. Must be one of: {", ".join(valid_age_groups)}',
                'code': 'INVALID_AGE_GROUP'
            }), 400

        valid_genders = ['male', 'female', 'general']
        if gender not in valid_genders:
            return jsonify({
                'error': f'Invalid gender. Must be one of: {", ".join(valid_genders)}',
                'code': 'INVALID_GENDER'
            }), 400

        # Check if we have any valid nutrients after filtering
        if len(validated_nutrients) == 0:
            return jsonify({
                'error': 'No valid nutrients found in the request. All nutrients were filtered out due to invalid or zero amounts.',
                'code': 'NO_VALID_NUTRIENTS'
            }), 400

        # Log the request
        logger.info(f"Getting weekly recommended intake for {len(validated_nutrients)} nutrients from IP: {client_ip}")

        # Get weekly recommended intake using AI analysis
        result = food_analyzer.get_weekly_recommended_intake(validated_nutrients, age_group, gender)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return successful response
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting weekly recommended intake: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/neutralization-recommendations', methods=['POST'])
def get_neutralization_recommendations():
    """
    Get recommendations to neutralize over-dosed substances
    Expects: {"overdosed_substances": ["sodium", "sugar", ...]}
    Returns: {"success": true, "recommendations": {...}, "overdosed_substances": [...], "disclaimer": "..."}
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

        # Validate required fields
        if 'overdosed_substances' not in data:
            return jsonify({
                'error': 'Missing overdosed_substances field',
                'code': 'MISSING_OVERDOSED_SUBSTANCES'
            }), 400

        overdosed_substances = data['overdosed_substances']
        if not isinstance(overdosed_substances, list):
            return jsonify({
                'error': 'overdosed_substances must be an array',
                'code': 'INVALID_OVERDOSED_SUBSTANCES_FORMAT'
            }), 400

        if len(overdosed_substances) == 0:
            return jsonify({
                'error': 'overdosed_substances array cannot be empty',
                'code': 'EMPTY_OVERDOSED_SUBSTANCES_ARRAY'
            }), 400

        # Validate each substance (should be a non-empty string)
        validated_substances = []
        for i, substance in enumerate(overdosed_substances):
            if not isinstance(substance, str) or not substance.strip():
                return jsonify({
                    'error': f'Invalid substance name at index {i}',
                    'code': 'INVALID_SUBSTANCE_NAME'
                }), 400
            validated_substances.append(substance.strip())

        # Log the request
        logger.info(f"Getting neutralization recommendations for {len(validated_substances)} substances from IP: {client_ip}")

        # Get neutralization recommendations using AI analysis
        result = food_analyzer.get_neutralization_recommendations(validated_substances)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return successful response
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting neutralization recommendations: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/neutralization-recommendations-async', methods=['POST'])
def get_neutralization_recommendations_async():
    """
    Get neutralization recommendations asynchronously
    Expects: {"overdosed_substances": ["sodium", "sugar", ...]}
    Returns: {"job_id": "string", "status": "queued", "message": "Job queued for processing"}
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

        if not job_manager:
            return jsonify({
                'error': 'Asynchronous processing not available',
                'code': 'ASYNC_NOT_AVAILABLE'
            }), 503

        # Get and validate input
        data = request.get_json()

        if not data:
            return jsonify({
                'error': 'Missing request data',
                'code': 'MISSING_DATA'
            }), 400

        # Validate required fields
        if 'overdosed_substances' not in data:
            return jsonify({
                'error': 'Missing overdosed_substances field',
                'code': 'MISSING_OVERDOSED_SUBSTANCES'
            }), 400

        overdosed_substances = data['overdosed_substances']
        if not isinstance(overdosed_substances, list):
            return jsonify({
                'error': 'overdosed_substances must be an array',
                'code': 'INVALID_OVERDOSED_SUBSTANCES_FORMAT'
            }), 400

        if len(overdosed_substances) == 0:
            return jsonify({
                'error': 'overdosed_substances array cannot be empty',
                'code': 'EMPTY_OVERDOSED_SUBSTANCES_ARRAY'
            }), 400

        # Validate each substance (should be a non-empty string)
        validated_substances = []
        for i, substance in enumerate(overdosed_substances):
            if not isinstance(substance, str) or not substance.strip():
                return jsonify({
                    'error': f'Invalid substance name at index {i}',
                    'code': 'INVALID_SUBSTANCE_NAME'
                }), 400
            validated_substances.append(substance.strip())

        # Log the request
        logger.info(f"Creating async neutralization recommendations job for {len(validated_substances)} substances from IP: {client_ip}")

        # Create async job with job type
        job_data = {
            'job_type': 'neutralization_recommendations',
            'overdosed_substances': validated_substances
        }
        job_id = job_manager.create_job(job_data)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return job ID immediately
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'message': 'Job queued for processing. Use /job-status/{job_id} to check progress.',
            'estimated_time': '30-60 seconds'
        }), 202

    except Exception as e:
        logger.error(f"Error creating async neutralization recommendations job: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/analyze-food-async', methods=['POST'])
def analyze_food_async():
    """
    Start asynchronous food analysis job
    Expects: [{"food_name": "string", "meal_type": "breakfast|lunch|dinner|snack"}, ...]
    Returns: {"job_id": "string", "status": "queued", "message": "Job queued for processing"}
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

        if not job_manager:
            return jsonify({
                'error': 'Asynchronous processing not available',
                'code': 'ASYNC_NOT_AVAILABLE'
            }), 503

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
        logger.info(f"Creating async job for {len(validated_foods)} foods from IP: {client_ip}")

        # Create async job with proper job_data structure
        job_data = {
            'job_type': 'food_analysis',
            'foods': validated_foods
        }
        job_id = job_manager.create_job(job_data)

        # Update rate limiter
        rate_limiter.record_request(client_ip)

        # Return job ID immediately
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'message': 'Job queued for processing. Use /job-status/{job_id} to check progress.',
            'estimated_time': '30-60 seconds'
        }), 202

    except Exception as e:
        logger.error(f"Error creating async food analysis job: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500


@api_bp.route('/job-status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """
    Get the status of an asynchronous job
    Returns: {"job_id": "string", "status": "queued|processing|completed|failed", "result": {...}, "error": "string"}
    """
    try:
        if not job_manager:
            return jsonify({
                'error': 'Job status checking not available',
                'code': 'JOB_STATUS_NOT_AVAILABLE'
            }), 503

        job = job_manager.get_job_status(job_id)

        if not job:
            return jsonify({
                'error': 'Job not found',
                'code': 'JOB_NOT_FOUND'
            }), 404

        # Return job status
        response = {
            'job_id': job['job_id'],
            'status': job['status'],
            'created_at': job.get('created_at'),
            'updated_at': job.get('updated_at')
        }

        if job['status'] == 'completed' and 'result' in job:
            response['result'] = convert_decimals_to_floats(job['result'])
        elif job['status'] == 'failed' and 'error' in job:
            response['error'] = job['error']

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error getting job status for {job_id}: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error. Please try again later.',
            'code': 'INTERNAL_ERROR'
        }), 500
