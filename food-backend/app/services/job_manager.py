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

        # Check if AWS services are available
        self.aws_available = self._check_aws_availability()

        # Always initialize local_jobs for fallback purposes
        self.local_jobs = {}  # In-memory job store for fallbacks

        if self.aws_available:
            # Initialize table and queue
            self.table = self.dynamodb.Table(self.table_name)

            # Get queue URL (this will work for deployed resources)
            try:
                account_id = boto3.client('sts').get_caller_identity()['Account']
                region = os.environ.get('AWS_REGION', 'us-east-1')
                self.queue_url = f"https://sqs.{region}.amazonaws.com/{account_id}/{self.queue_name}"
            except Exception:
                self.queue_url = None
        else:
            # Local development mode - no AWS services
            self.table = None
            self.queue_url = None

    def _check_aws_availability(self):
        """Check if AWS services are available"""
        try:
            # Try to get caller identity to check if credentials are available
            boto3.client('sts').get_caller_identity()
            return True
        except Exception:
            return False

    def create_job(self, job_data: Dict[str, Any]) -> str:
        """
        Create a new asynchronous job and queue it for processing

        Args:
            job_data: Dictionary containing job type and parameters

        Returns:
            job_id: Unique identifier for the job
        """
        job_id = str(uuid.uuid4())

        # Create job record
        job_record = {
            'job_id': job_id,
            'status': 'queued',
            'job_data': job_data,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }

        if self.aws_available:
            try:
                self.table.put_item(Item=job_record)
            except Exception as e:
                print(f"Warning: Could not save job to DynamoDB: {e}")
                print("Falling back to local storage")
                self.local_jobs[job_id] = job_record

            # Send message to SQS queue
            if self.queue_url:
                try:
                    message_body = {
                        'job_id': job_id,
                        'job_data': job_data
                    }

                    self.sqs.send_message(
                        QueueUrl=self.queue_url,
                        MessageBody=json.dumps(message_body)
                    )
                except Exception as e:
                    print(f"Warning: Could not send message to SQS: {e}")
                    print("Job will be processed in-memory only (for local development)")
        else:
            # Local development - store in memory
            self.local_jobs[job_id] = job_record
            print(f"Job {job_id} stored locally (AWS not available)")

        return job_id

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the status and result of a job

        Args:
            job_id: Job identifier

        Returns:
            Job status and result if available
        """
        if self.aws_available:
            try:
                response = self.table.get_item(Key={'job_id': job_id})
                if 'Item' in response:
                    return response['Item']
                return None
            except Exception as e:
                print(f"Warning: Could not get job status from DynamoDB: {e}")
                # Fall back to local storage
                return self.local_jobs.get(job_id)
        else:
            # Local development - check in-memory storage
            return self.local_jobs.get(job_id)

    def update_job_status(self, job_id: str, status: str, result: Any = None, error: str = None) -> bool:
        """
        Update job status (used by async handler)

        Args:
            job_id: Job identifier
            status: New status ('processing', 'completed', 'failed')
            result: Job result (for completed jobs)
            error: Error message (for failed jobs)

        Returns:
            True if update successful, False otherwise
        """
        update_data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat()
        }

        if result is not None:
            update_data['result'] = result
        if error is not None:
            update_data['error'] = error

        if self.aws_available:
            try:
                # Build update expression dynamically
                update_expr = 'SET #status = :status, updated_at = :updated_at'
                attr_names = {'#status': 'status'}
                attr_values = {
                    ':status': status,
                    ':updated_at': datetime.utcnow().isoformat()
                }

                if result is not None:
                    update_expr += ', #result = :result'
                    attr_names['#result'] = 'result'
                    attr_values[':result'] = result

                if error is not None:
                    update_expr += ', #error = :error'
                    attr_names['#error'] = 'error'
                    attr_values[':error'] = error

                self.table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression=update_expr,
                    ExpressionAttributeNames=attr_names,
                    ExpressionAttributeValues=attr_values
                )
                return True
            except Exception as e:
                print(f"Warning: Could not update job status in DynamoDB: {e}")
                # Fall back to local update
                if job_id in self.local_jobs:
                    self.local_jobs[job_id].update(update_data)
                    return True
                return False
        else:
            # Local development - update in-memory storage
            if job_id in self.local_jobs:
                self.local_jobs[job_id].update(update_data)
                print(f"Job {job_id} status updated locally to {status}")
                return True
            return False

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
