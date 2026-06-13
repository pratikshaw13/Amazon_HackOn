"""
Scoring utility functions for condition normalization.
"""


def normalize_score(score: int, min_val: int = 0, max_val: int = 100) -> int:
    """Clamp score to valid range."""
    return max(min_val, min(max_val, score))


def calculate_overall_score(surface: int, parts: int,
                            accessories: int, packaging: int) -> int:
    """
    Calculate weighted overall score.
    Weights: parts (40%) > surface (30%) > accessories (20%) > packaging (10%)
    """
    overall = int(
        surface * 0.30 +
        parts * 0.40 +
        accessories * 0.20 +
        packaging * 0.10
    )
    return normalize_score(overall)


def score_to_grade(score: int) -> str:
    """Convert numeric score to grade string."""
    if score >= 90:
        return "Like New"
    elif score >= 75:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Fair"
    else:
        return "Needs Refurbishment"


def calculate_green_impact(category: str, action: str) -> float:
    """
    Calculate CO2 saved in kg based on product category and action.
    Based on lifecycle analysis estimates.
    """
    # Approximate CO2 savings by keeping products in use (kg)
    category_impact = {
        "Electronics": 25.0,
        "Monitors": 35.0,
        "Laptops": 45.0,
        "Smartphones": 15.0,
        "Headphones": 8.0,
        "Baby Gear": 20.0,
        "Furniture": 50.0,
        "Fitness": 18.0,
        "Kitchen": 12.0,
        "Books": 3.0,
        "Fashion": 10.0,
        "Sports": 15.0,
        "Home Decor": 8.0,
        "Toys": 6.0,
    }

    base_impact = category_impact.get(category, 12.0)

    # Multiplier by action
    action_multiplier = {
        "direct_resale": 1.0,
        "refurbish_then_sell": 0.8,
        "peer_to_peer": 1.0,
        "donate": 1.2,  # Bonus for social impact
        "recycle": 0.3,
    }

    multiplier = action_multiplier.get(action, 0.5)
    return round(base_impact * multiplier, 1)


def calculate_estimated_value(original_price: float, condition_score: int,
                               demand_score: int = 70) -> float:
    """
    Calculate estimated resale value.
    Formula: original_price × condition_factor × demand_factor × depreciation
    """
    condition_factor = (condition_score / 100) * 0.8 + 0.2  # Floor at 20%
    demand_factor = (demand_score / 100) * 0.3 + 0.7  # Floor at 70%

    estimated = original_price * condition_factor * demand_factor
    return round(estimated, 0)
