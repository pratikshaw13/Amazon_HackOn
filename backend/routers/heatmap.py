"""
Heatmap Router — Demand forecast by city for product categories.
"""
from fastapi import APIRouter
from agents.demand_agent import DemandAgent

router = APIRouter()
demand_agent = DemandAgent()

# City coordinates for map rendering
CITY_COORDS = {
    "Mumbai": {"lat": 19.076, "lng": 72.8777},
    "Delhi": {"lat": 28.6139, "lng": 77.209},
    "Bengaluru": {"lat": 12.9716, "lng": 77.5946},
    "Hyderabad": {"lat": 17.385, "lng": 78.4867},
    "Chennai": {"lat": 13.0827, "lng": 80.2707},
    "Pune": {"lat": 18.5204, "lng": 73.8567},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714},
    "Jaipur": {"lat": 26.9124, "lng": 75.7873},
    "Kochi": {"lat": 9.9312, "lng": 76.2673},
    "Lucknow": {"lat": 26.8467, "lng": 80.9462},
    "Chandigarh": {"lat": 30.7333, "lng": 76.7794}
}


@router.get("/heatmap/{category}")
async def get_demand_heatmap(category: str):
    """Get demand forecast for a category across Indian cities."""
    result = await demand_agent.run({"category": category})
    city_demand = result.get("city_demand", [])

    # Enrich with coordinates, buyer counts, and expected days
    enriched = []
    for city_data in city_demand:
        city_name = city_data.get("city", "")
        coords = CITY_COORDS.get(city_name, {"lat": 20.5937, "lng": 78.9629})
        score = city_data.get("score", 50)

        # Estimate buyer count and resale days from demand score
        buyer_count = int(score * 12)  # Rough estimate
        expected_resale_days = max(2, 30 - int(score * 0.28))

        enriched.append({
            **city_data,
            "lat": coords["lat"],
            "lng": coords["lng"],
            "buyer_count": buyer_count,
            "expected_resale_days": expected_resale_days,
        })

    return {
        "category": category,
        "city_demand": enriched,
        "generated_at": result.get("generated_at", "")
    }
