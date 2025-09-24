#!/usr/bin/env python3
"""
Main application entry point for Food Impact API
"""
import os
import logging
from app import create_app
from config.config import get_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)

def main():
    """Main application runner"""
    try:
        # Get configuration
        config_name = os.getenv('FLASK_ENV', 'development')
        config_class = get_config(config_name)

        # Create Flask app
        app = create_app()

        # Apply configuration
        app.config.from_object(config_class)

        # Log startup information
        logger.info(f"Starting Food Impact API in {config_name} mode")
        logger.info(f"Debug mode: {app.config['DEBUG']}")

        # Run the app
        port = int(os.getenv('PORT', 8000))
        host = os.getenv('HOST', '0.0.0.0')

        logger.info(f"Server starting on {host}:{port}")

        app.run(
            host=host,
            port=port,
            debug=app.config['DEBUG']
        )

    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}")
        raise

if __name__ == '__main__':
    main()
