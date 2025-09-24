#!/usr/bin/env python3
"""
API Test Script for Food Impact Backend
Tests the /analyze-food endpoint and other API functionality
"""
import requests
import json
import sys
import time
from typing import Dict, Any

class APITester:
    """Test class for API functionality"""

    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()

    def test_health_check(self) -> bool:
        """Test health check endpoint"""
        print("🩺 Testing health check endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {str(e)}")
            return False

    def test_analyze_food_valid(self, food_name: str) -> bool:
        """Test analyze food endpoint with valid input"""
        print(f"🍎 Testing analyze food with: '{food_name}'")
        try:
            payload = {"food_name": food_name}
            response = self.session.post(
                f"{self.base_url}/api/analyze-food",
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                print("✅ Analyze food successful")
                self._validate_response_structure(data)
                return True
            else:
                print(f"❌ Analyze food failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Analyze food error: {str(e)}")
            return False

    def test_analyze_food_invalid(self) -> bool:
        """Test analyze food endpoint with invalid inputs"""
        print("🛡️ Testing input validation...")

        test_cases = [
            ({}, "Empty request body"),
            ({"food_name": ""}, "Empty food name"),
            ({"food_name": "a"}, "Too short food name"),
            ({"food_name": "a" * 101}, "Too long food name"),
            ({"food_name": "<script>alert('xss')</script>"}, "Potentially harmful input"),
        ]

        passed = 0
        for payload, description in test_cases:
            try:
                response = self.session.post(
                    f"{self.base_url}/api/analyze-food",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 400:
                    print(f"✅ {description}: Correctly rejected ({response.status_code})")
                    passed += 1
                else:
                    print(f"❌ {description}: Expected 400, got {response.status_code}")
            except Exception as e:
                print(f"❌ {description}: Error - {str(e)}")

        return passed == len(test_cases)

    def test_rate_limiting(self) -> bool:
        """Test rate limiting functionality"""
        print("⏱️ Testing rate limiting...")

        # Make multiple rapid requests
        for i in range(12):  # Exceed the default limit of 10
            try:
                payload = {"food_name": f"test_food_{i}"}
                response = self.session.post(
                    f"{self.base_url}/api/analyze-food",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 429:
                    print(f"✅ Rate limiting working: Request {i+1} correctly rejected")
                    return True
                elif i < 10 and response.status_code == 200:
                    continue  # Normal behavior for first 10 requests
                else:
                    print(f"⚠️ Unexpected response on request {i+1}: {response.status_code}")
            except Exception as e:
                print(f"❌ Rate limiting test error: {str(e)}")
                return False

        print("❌ Rate limiting may not be working properly")
        return False

    def _validate_response_structure(self, data: Dict[str, Any]) -> bool:
        """Validate the structure of analyze-food response"""
        required_fields = ["ingredients", "substances", "mitigation_tips", "disclaimer"]

        for field in required_fields:
            if field not in data:
                print(f"❌ Missing required field: {field}")
                return False

            if field != "disclaimer" and not isinstance(data[field], list):
                print(f"❌ Field {field} should be a list")
                return False

        print("✅ Response structure is valid")
        return True

    def run_all_tests(self) -> bool:
        """Run all API tests"""
        print("🚀 Starting API Tests for Food Impact Backend")
        print("=" * 50)

        tests = [
            self.test_health_check,
            lambda: self.test_analyze_food_valid("grilled chicken breast"),
            lambda: self.test_analyze_food_valid("organic broccoli"),
            lambda: self.test_analyze_food_valid("whole grain bread"),
            self.test_analyze_food_invalid,
            self.test_rate_limiting,
        ]

        passed = 0
        total = len(tests)

        for test in tests:
            if test():
                passed += 1
            print("-" * 30)

        print(f"📊 Test Results: {passed}/{total} tests passed")

        if passed == total:
            print("🎉 All tests passed! API is ready for production.")
            return True
        else:
            print("⚠️ Some tests failed. Please check the implementation.")
            return False


def main():
    """Main test runner"""
    import argparse

    parser = argparse.ArgumentParser(description="Test Food Impact API")
    parser.add_argument("--url", default="http://localhost:5000",
                       help="Base URL of the API (default: http://localhost:5000)")
    parser.add_argument("--single", help="Run a single test food")

    args = parser.parse_args()

    tester = APITester(args.url)

    if args.single:
        success = tester.test_analyze_food_valid(args.single)
    else:
        success = tester.run_all_tests()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
