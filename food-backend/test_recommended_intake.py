#!/usr/bin/env python3
"""
Test script for the new recommended intake endpoint
"""

import json
import requests
import sys

def test_recommended_intake_endpoint():
    """Test the recommended intake endpoint"""

    # Test data - nutrients consumed on a day
    test_data = {
        "nutrients_consumed": [
            {"name": "protein", "total_amount": 75.2, "unit": "grams"},
            {"name": "fat", "total_amount": 45.8, "unit": "grams"},
            {"name": "carbohydrate", "total_amount": 280.5, "unit": "grams"},
            {"name": "fiber", "total_amount": 18.3, "unit": "grams"},
            {"name": "sugar", "total_amount": 65.7, "unit": "grams"},
            {"name": "sodium", "total_amount": 3.2, "unit": "grams"},
            {"name": "potassium", "total_amount": 2.8, "unit": "grams"},
            {"name": "calcium", "total_amount": 0.8, "unit": "grams"},
            {"name": "iron", "total_amount": 0.015, "unit": "grams"},
            {"name": "vitamin-c", "total_amount": 0.085, "unit": "grams"},
            {"name": "vitamin-d", "total_amount": 0.000015, "unit": "grams"},
            {"name": "magnesium", "total_amount": 0.35, "unit": "grams"}
        ],
        "age_group": "18-29",
        "gender": "general"
    }

    try:
        # Test the endpoint
        url = "http://localhost:8000/api/recommended-intake"
        headers = {'Content-Type': 'application/json'}

        print("Testing recommended intake endpoint...")
        print(f"URL: {url}")
        print(f"Request data: {json.dumps(test_data, indent=2)}")

        response = requests.post(url, json=test_data, headers=headers, timeout=60)

        print(f"\nResponse status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("✅ Success! Response:")
            print(json.dumps(result, indent=2))

            # Validate response structure
            required_keys = ["recommended_intakes", "age_group", "gender", "disclaimer"]
            if all(key in result for key in required_keys):
                print("✅ Response structure is valid")
                print(f"Found {len(result['recommended_intakes'])} recommended intakes")
            else:
                print("❌ Response structure is invalid")
                return False

        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Connection error - is the backend server running?")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

    return True

if __name__ == "__main__":
    success = test_recommended_intake_endpoint()
    sys.exit(0 if success else 1)
