#!/usr/bin/env python3
"""
Test script to verify the Flask app works locally
This helps identify issues before deploying to Lambda
"""

import os
import sys
import json
from unittest.mock import Mock

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_app_creation():
    """Test if the Flask app can be created successfully"""
    try:
        from app import create_app
        print("✅ Successfully imported create_app")

        app = create_app()
        print("✅ Successfully created Flask app")

        # Test app configuration
        print(f"📋 App config DEBUG: {app.config.get('DEBUG', 'Not set')}")
        print(f"📋 App config SECRET_KEY: {'Set' if app.config.get('SECRET_KEY') else 'Not set'}")

        # Test health endpoint
        with app.test_client() as client:
            response = client.get('/health')
            print(f"🏥 Health check status: {response.status_code}")
            if response.status_code == 200:
                data = json.loads(response.data)
                print(f"🏥 Health check response: {data}")
            else:
                print(f"❌ Health check failed: {response.data}")

        # Test API endpoints
        with app.test_client() as client:
            # Test analyze-food endpoint with invalid data (should return 400)
            response = client.post('/api/analyze-food',
                                 json=[],
                                 content_type='application/json')
            print(f"🍎 Analyze food (empty array) status: {response.status_code}")

        print("🎉 All tests passed!")
        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_lambda_handler():
    """Test the Lambda handler locally"""
    try:
        # Set required environment variables for testing
        os.environ['SECRET_KEY'] = 'test-secret-key'
        os.environ['OPENAI_API_KEY'] = 'test-key'

        # Import and test handler creation
        from handler import handler, get_app
        print("✅ Successfully imported handler functions")

        # Test that the handler was created
        if callable(handler):
            print("✅ Lambda handler is callable")
        else:
            print("❌ Lambda handler is not callable")
            return False

        # Test that Flask app can be created
        try:
            app = get_app()
            print("✅ Flask app created successfully in handler")
        except Exception as e:
            print(f"❌ Flask app creation failed: {e}")
            return False

        print("✅ Lambda handler setup test passed!")
        return True

    except Exception as e:
        print(f"❌ Lambda handler test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing Rejuvenai Backend Locally")
    print("=" * 50)

    print("\n1. Testing Flask app creation...")
    app_test = test_app_creation()

    print("\n2. Testing Lambda handler...")
    lambda_test = test_lambda_handler()

    print("\n" + "=" * 50)
    if app_test and lambda_test:
        print("🎉 All tests passed! Ready for deployment.")
    else:
        print("❌ Some tests failed. Fix the issues before deploying.")
        print("\nCommon fixes:")
        print("• Install missing dependencies: pip install -r requirements.txt")
        print("• Check environment variables are set")
        print("• Verify all imports work correctly")
        print("• Check Flask app configuration")
