"""
Job management service for asynchronous food analysis
"""
import os
import uuid
import json
import boto3
from datetime import datetime
from typing import Dict, List, Any, Optional

class JobManager:
    """Service for managing asynchronous food analysis jobs"""

    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.sqs = boto3.client('sqs')

        # Get resource names from environment or defaults
        self.table_name = os.environ.get('DYNAMODB_TABLE', 'food-analysis-jobs')
        self.queue_name = os.environ.get('SQS_QUEUE_NAME', 'food-analysis-jobs-queue')

        # Initialize table and queue
        self.table = self.dynamodb.Table(self.table_name)

        # Get queue URL (this will work for deployed resources)
        try:
            # In production, get queue URL by name
            account_id = boto3.client('sts').get_caller_identity()['Account']
            region = os.environ.get('AWS_REGION', 'us-east-1')
            self.queue_url = f"https://sqs.{region}.amazonaws.com/{account_id}/{self.queue_name}"
        except Exception:
            # Fallback for local development
            self.queue_url = None

    def create_job(self, foods: List[Dict[str, str]]) -> str:
        """
        Create a new food analysis job and queue it for processing

        Args:
            foods: List of food items to analyze

        Returns:
            job_id: Unique identifier for the job
        """
        job_id = str(uuid.uuid4())

        # Create job record in DynamoDB
        job_record = {
            'job_id': job_id,
            'status': 'queued',
            'foods': foods,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }

        self.table.put_item(Item=job_record)

        # Send message to SQS queue
        if self.queue_url:
            message_body = {
                'job_id': job_id,
                'foods': foods
            }

            self.sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(message_body)
            )

        return job_id

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the status and result of a job

        Args:
            job_id: Job identifier

        Returns:
            Job status and result if available
        """
        try:
            response = self.table.get_item(Key={'job_id': job_id})
            if 'Item' in response:
                return response['Item']
            return None
        except Exception as e:
            print(f"Error getting job status: {e}")
            return None

    def list_jobs(self, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List jobs, optionally filtered by status

        Args:
            status: Filter by job status (optional)
            limit: Maximum number of jobs to return

        Returns:
            List of jobs
        """
        try:
            if status:
                # Use GSI to query by status
                response = self.table.query(
                    IndexName='status-created_at-index',
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('status').eq(status),
                    ScanIndexForward=False,  # Most recent first
                    Limit=limit
                )
                return response.get('Items', [])
            else:
                # Scan all jobs, ordered by creation time
                response = self.table.scan(
                    Limit=limit,
                    ScanIndexForward=False
                )
                # Sort by created_at in memory since we can't sort scan results
                items = response.get('Items', [])
                items.sort(key=lambda x: x.get('created_at', ''), reverse=True)
                return items[:limit]
        except Exception as e:
            print(f"Error listing jobs: {e}")
            return []
