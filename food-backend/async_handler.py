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
        # Get table name from environment
        table_name = os.environ.get('DYNAMODB_TABLE', 'food-analysis-jobs')
        table = dynamodb.Table(table_name)

        # Process each message from SQS
        for record in event['Records']:
            message_body = json.loads(record['body'])

            job_id = message_body['job_id']
            foods = message_body['foods']

            logger.info(f"Processing job {job_id} with {len(foods)} foods")

            # Update job status to processing
            table.update_item(
                Key={'job_id': job_id},
                UpdateExpression='SET #status = :status, updated_at = :updated_at',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'processing',
                    ':updated_at': datetime.utcnow().isoformat()
                }
            )

            try:
                # Initialize food analyzer
                analyzer = FoodAnalyzer()

                # Process the food analysis
                result = analyzer.analyze_foods_comprehensive(foods)

                # Convert floats to decimals for DynamoDB compatibility
                result_decimals = convert_floats_to_decimals(result)

                # Update job with completed result
                table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression='SET #status = :status, #result = :result, updated_at = :updated_at',
                    ExpressionAttributeNames={
                        '#status': 'status',
                        '#result': 'result'
                    },
                    ExpressionAttributeValues={
                        ':status': 'completed',
                        ':result': result_decimals,
                        ':updated_at': datetime.utcnow().isoformat()
                    }
                )

                logger.info(f"Successfully completed job {job_id}")

            except Exception as e:
                logger.error(f"Error processing job {job_id}: {str(e)}")

                # Update job with error status
                table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression='SET #status = :status, #error = :error, updated_at = :updated_at',
                    ExpressionAttributeNames={
                        '#status': 'status',
                        '#error': 'error'
                    },
                    ExpressionAttributeValues={
                        ':status': 'failed',
                        ':error': str(e),
                        ':updated_at': datetime.utcnow().isoformat()
                    }
                )

        return {'statusCode': 200, 'body': 'Processing completed'}

    except Exception as e:
        logger.error(f"Error in async handler: {str(e)}")
        return {'statusCode': 500, 'body': str(e)}
