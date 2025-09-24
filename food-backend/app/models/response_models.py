from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class TipCategory(Enum):
    """Enumeration of tip categories for health recommendations"""
    EXERCISE = 'exercise'
    FOOD = 'food'
    DRINK = 'drink'
    LIFESTYLE = 'lifestyle'
    NUTRITION = 'nutrition'
    WELLNESS = 'wellness'
    MINDSET = 'mindset'


@dataclass
class CategorizedTip:
    """Represents a health tip with categorization information"""
    id: str
    category: TipCategory
    title: str
    content: str
    priority: str = 'medium'  # 'high', 'medium', 'low'
    relevance_score: float = 1.0
    tags: List[str] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        result = asdict(self)
        result['category'] = self.category.value
        return result


@dataclass
class IngredientQuantity:
    """Represents an ingredient with quantity information"""
    name: str
    original_amount: Optional[str] = None  # e.g., "2 cups", "1 tbsp"
    gram_amount: Optional[float] = None    # converted to grams
    unit: str = "grams"                    # measurement unit
    per_person: bool = True               # indicates this is for one person

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return asdict(self)


@dataclass
class SubstanceContribution:
    """Represents a substance contribution from an ingredient"""
    ingredient_name: str
    quantity_grams: Optional[float] = None
    contribution_percentage: Optional[float] = None
    relationship_type: str = "secondary"  # 'primary', 'secondary', 'trace', 'processed'

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return asdict(self)


@dataclass
class SubstanceRelationship:
    """Represents a substance and its relationships to ingredients"""
    name: str
    category: str = "general"  # 'vitamin', 'mineral', 'antioxidant', 'protein', etc.
    health_impact: str = "neutral"  # 'positive', 'negative', 'neutral'
    total_quantity: Optional[float] = None
    unit: str = "mg"
    contributions: List[SubstanceContribution] = None

    def __post_init__(self):
        if self.contributions is None:
            self.contributions = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        result = asdict(self)
        result['contributions'] = [contrib.to_dict() for contrib in self.contributions]
        return result


@dataclass
class FoodAnalysisResponse:
    """Structured response for food analysis with quantity information and relationships"""
    ingredients: List[str]  # Original ingredient list for backward compatibility
    ingredient_quantities: List[IngredientQuantity]  # New quantity-aware ingredients
    substances: List[str]  # Original substances list for backward compatibility
    substance_relationships: List[SubstanceRelationship]  # Detailed substance relationships
    mitigation_tips: List[str]  # Original tips list for backward compatibility
    categorized_tips: List[CategorizedTip]  # New categorized tips
    disclaimer: str
    portion_for_one: bool = True  # Indicates all quantities are per person
    personalized_recommendations: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        result = asdict(self)
        # Convert complex objects to dict format
        result['ingredient_quantities'] = [iq.to_dict() for iq in self.ingredient_quantities]
        result['substance_relationships'] = [sr.to_dict() for sr in self.substance_relationships]
        result['categorized_tips'] = [ct.to_dict() for ct in self.categorized_tips]
        return result


@dataclass
class ErrorResponse:
    """Structured error response"""
    error: str
    code: str
    details: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return asdict(self)


@dataclass
class MealIngredient:
    """Represents an ingredient in a meal with quantity"""
    name: str
    quantity: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return asdict(self)


@dataclass
class MealSubstance:
    """Represents a substance in a meal with quantity and health info"""
    name: str
    quantity: float
    unit: str
    category: str
    standard_consumption: float  # AI-provided standard for 18-29 adults
    health_impact: str  # 'positive', 'neutral', 'negative'

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return asdict(self)


@dataclass
class MealAnalysisResponse:
    """Response for single-prompt meal analysis"""
    food_name: str
    meal_type: str
    ingredients: List[MealIngredient]
    substances: List[MealSubstance]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        result = asdict(self)
        result['ingredients'] = [ing.to_dict() for ing in self.ingredients]
        result['substances'] = [sub.to_dict() for sub in self.substances]
        return result


@dataclass
class HealthResponse:
    """Health check response"""
    status: str
    service: str
    version: str
    uptime: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return asdict(self)
