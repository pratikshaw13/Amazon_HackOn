"""
Demand Agent — Forecasts city-level demand for product categories.
"""
from agents.base_agent import BaseAgent
from services.dynamodb_service import DynamoDBService
from datetime import datetime, timedelta


class DemandAgent(BaseAgent):
    """
    Input: product category, optional city filter
    Output: city demand array with scores
    """

    def __init__(self):
        super().__init__()
        self.db = DynamoDBService()

    async def run(self, input_data: dict) -> dict:
        category = input_data.get("category", "Electronics")
        city_filter = input_data.get("city", None)

        # Check cache first
        cached = await self._get_cached_demand(category)
        if cached:
            demand_data = cached
        else:
            # Call Gemini for fresh forecast
            result = await self.gemini.get_demand_forecast(category)
            demand_data = result.get("city_demand", [])
            # Cache the result
            await self._cache_demand(category, demand_data)

        # Filter by city if specified
        if city_filter:
            demand_data = [d for d in demand_data if d.get("city", "").lower() == city_filter.lower()]

        return {
            "category": category,
            "city_demand": demand_data,
            "generated_at": datetime.utcnow().isoformat()
        }

    async def _get_cached_demand(self, category: str) -> list | None:
        """Check DynamoDB for cached demand data (6-hour TTL)."""
        item = await self.db.get_item("sl_demand", {"category": category, "city": "ALL"})
        if not item:
            return None

        # Check TTL
        cached_at = item.get("cached_at", "")
        if cached_at:
            try:
                cached_time = datetime.fromisoformat(cached_at)
                if datetime.utcnow() - cached_time < timedelta(hours=6):
                    return item.get("demand_data", [])
            except ValueError:
                pass

        return None

    async def _cache_demand(self, category: str, demand_data: list):
        """Cache demand data to DynamoDB."""
        await self.db.put_item("sl_demand", {
            "category": category,
            "city": "ALL",
            "demand_data": demand_data,
            "cached_at": datetime.utcnow().isoformat()
        })
