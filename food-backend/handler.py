"""
Serverless handler for RejuvenAI Flask application
"""
import os
import logging
from serverless_wsgi import handle_request

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import Flask app - lazy loading to avoid import issues
app = None

def get_app():
    """Lazy load Flask application"""
    global app
    if app is None:
        logger.info("Creating Flask application...")
        from app import create_app
        app = create_app()
        logger.info("Flask application created successfully")
    return app

def handler(event, context):
    """
    AWS Lambda handler using serverless-wsgi
    """
    logger.info(f"Processing request: {event.get('requestContext', {}).get('httpMethod', 'UNKNOWN')} {event.get('requestContext', {}).get('path', 'UNKNOWN')}")
    return handle_request(get_app(), event, context)
