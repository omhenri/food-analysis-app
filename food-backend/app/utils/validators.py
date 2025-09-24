import re
from typing import Dict, Any


def validate_food_name(food_name: str) -> Dict[str, Any]:
    """
    Validate food name input
    Returns: {"valid": bool, "error": str or None}
    """
    if not food_name or not food_name.strip():
        return {"valid": False, "error": "Food name cannot be empty"}

    food_name = food_name.strip()

    # Check length
    if len(food_name) < 2:
        return {"valid": False, "error": "Food name is too short"}

    if len(food_name) > 100:
        return {"valid": False, "error": "Food name is too long (max 100 characters)"}

    # Check for potentially harmful characters
    harmful_patterns = re.compile(r'[<>{}[\]\\]')
    if harmful_patterns.search(food_name):
        return {"valid": False, "error": "Food name contains invalid characters"}

    # Check for excessive special characters
    special_chars = re.findall(r'[^a-zA-Z0-9\s\-&\(\)\.]', food_name)
    if len(special_chars) > 5:
        return {"valid": False, "error": "Food name contains too many special characters"}

    # Check for common SQL injection patterns (basic protection)
    sql_patterns = re.compile(r'(union|select|insert|delete|update|drop|create)', re.IGNORECASE)
    if sql_patterns.search(food_name):
        return {"valid": False, "error": "Invalid food name"}

    return {"valid": True, "error": None}


def sanitize_input(text: str) -> str:
    """Basic input sanitization"""
    if not text:
        return ""

    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text.strip())

    # Remove potential script tags (basic XSS protection)
    text = re.sub(r'<[^>]*>', '', text)

    return text
