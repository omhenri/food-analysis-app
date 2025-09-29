"""
Asynchronous handler for food analysis processing using SQS and DynamoDB
"""
import os
import json
import logging
import boto3
from datetime import datetime
from decimal import Decimal
from app.services.food_analyzer import FoodAnalyzer

logger = logging.getLogger(__name__)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')

def convert_floats_to_decimals(obj):
    """
    Recursively convert float values to Decimal for DynamoDB compatibility
    """
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(item) for item in obj]
    else:
        return obj

def process_food_analysis(event, context):
    """
    Process food analysis jobs from SQS queue
    """
    try:
        # Import job manager for status updates
        from app.services.job_manager import JobManager
        job_manager = JobManager()

        # Process each message from SQS
        for record in event['Records']:
            message_body = json.loads(record['body'])

            job_id = message_body['job_id']
            job_data = message_body.get('job_data', {})

            job_type = job_data.get('job_type', 'food_analysis')
            logger.info(f"Processing job {job_id} of type {job_type}")

            # Update job status to processing
            job_manager.update_job_status(job_id, 'processing')

            try:
                # Initialize food analyzer
                analyzer = FoodAnalyzer()
                result = None

                # Process based on job type
                if job_type == 'food_analysis':
                    # Backward compatibility for old format
                    foods = message_body.get('foods', job_data.get('foods', []))
                    result = analyzer.analyze_foods_comprehensive(foods)
                elif job_type == 'recommended_intake':
                    nutrients_consumed = job_data.get('nutrients_consumed', [])
                    age_group = job_data.get('age_group', '18-29')
                    gender = job_data.get('gender', 'general')
                    result = analyzer.get_recommended_intake(nutrients_consumed, age_group, gender)
                elif job_type == 'weekly_recommended_intake':
                    nutrients_consumed = job_data.get('nutrients_consumed', [])
                    age_group = job_data.get('age_group', '18-29')
                    gender = job_data.get('gender', 'general')
                    result = analyzer.get_weekly_recommended_intake(nutrients_consumed, age_group, gender)
                elif job_type == 'neutralization_recommendations':
                    overdosed_substances = job_data.get('overdosed_substances', [])
                    result = analyzer.get_neutralization_recommendations(overdosed_substances)
                else:
                    raise ValueError(f"Unknown job type: {job_type}")

                # Convert floats to decimals for DynamoDB compatibility
                result_decimals = convert_floats_to_decimals(result)

                # Update job with completed result
                job_manager.update_job_status(job_id, 'completed', result_decimals)

                logger.info(f"Successfully completed job {job_id} of type {job_type}")

            except Exception as e:
                logger.error(f"Error processing job {job_id}: {str(e)}")

                # Update job with error status
                job_manager.update_job_status(job_id, 'failed', error=str(e))

        return {'statusCode': 200, 'body': 'Processing completed'}

    except Exception as e:
        logger.error(f"Error in async handler: {str(e)}")
        return {'statusCode': 500, 'body': str(e)}
