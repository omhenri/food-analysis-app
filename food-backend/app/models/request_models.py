from typing import Optional
from dataclasses import dataclass


@dataclass
class UserProfile:
    """User profile data for personalized recommendations"""
    age_group: str  # '0-18', '19-40', '>40'
    weight: int     # in cm
    height: int     # in cm
    is_completed: bool
    created_at: str
    updated_at: str


@dataclass
class FoodAnalysisRequest:
    """Request model for food analysis with optional profile data and portion specification"""
    food_name: str
    portion_for_one: bool = True  # New field: specifies portions are for one person
    user_profile: Optional[UserProfile] = None

    def to_dict(self):
        """Convert to dictionary for processing"""
        result = {
            'food_name': self.food_name,
            'portion_for_one': self.portion_for_one,
        }
        if self.user_profile:
            result['user_profile'] = {
                'age_group': self.user_profile.age_group,
                'weight': self.user_profile.weight,
                'height': self.user_profile.height,
                'is_completed': self.user_profile.is_completed,
                'created_at': self.user_profile.created_at,
                'updated_at': self.user_profile.updated_at,
            }
        return result


@dataclass
class MealAnalysisRequest:
    """Request model for single-prompt meal analysis"""
    food_name: str
    meal_type: str  # 'breakfast', 'lunch', 'dinner', 'snack'

    def to_dict(self):
        """Convert to dictionary for processing"""
        return {
            'food_name': self.food_name,
            'meal_type': self.meal_type,
        }
