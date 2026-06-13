"""
Valuation Router — AI photo analysis and routing endpoint.
"""
import uuid
from fastapi import APIRouter, UploadFile, File, Form
from typing import List

from agents.condition_agent import ConditionAgent
from agents.routing_agent import RoutingAgent
from agents.demand_agent import DemandAgent
from agents.buyer_matching_agent import BuyerMatchingAgent
from services.s3_service import S3Service
from services.dynamodb_service import DynamoDBService
from utils.image_utils import encode_image_to_base64, resize_image, validate_image
from utils.scoring import calculate_green_impact
from datetime import datetime

router = APIRouter()

# Service instances
s3 = S3Service()
db = DynamoDBService()
condition_agent = ConditionAgent()
routing_agent = RoutingAgent()
demand_agent = DemandAgent()
buyer_agent = BuyerMatchingAgent()


@router.post("/valuation/analyse")
async def analyse_product(
    images: List[UploadFile] = File(...),
    category: str = Form(...),
    product_name: str = Form(""),
    original_price: float = Form(5000)
):
    """
    Upload product images and get AI condition assessment + routing recommendation.
    """
    product_id = str(uuid.uuid4())

    # Process uploaded images
    images_base64 = []
    image_urls = []

    for image_file in images[:5]:  # Max 5 images
        image_bytes = await image_file.read()

        # Validate
        is_valid, error_msg = validate_image(image_bytes)
        if not is_valid:
            continue

        # Resize for Gemini (save bandwidth)
        resized = resize_image(image_bytes)

        # Upload to S3
        url = await s3.upload_image(resized, product_id)
        image_urls.append(url)

        # Encode for Gemini Vision
        images_base64.append(encode_image_to_base64(resized))

    if not images_base64:
        return {"error": "No valid images uploaded. Please upload at least one image."}

    # Step 1: Condition Assessment
    condition_result = await condition_agent.run({
        "images": images_base64,
        "category": category,
        "product_name": product_name
    })

    # Step 2: Demand Forecast
    demand_result = await demand_agent.run({"category": category})
    city_demand = demand_result.get("city_demand", [])
    top_demand = city_demand[0] if city_demand else {"demand": "Medium", "score": 60}
    demand_level = top_demand.get("demand", "Medium")

    # Step 3: Routing Decision
    routing_result = await routing_agent.run({
        "condition_score": condition_result["overall"],
        "category": category,
        "demand_level": demand_level,
        "original_price": original_price
    })

    # Step 4: Buyer Matching
    buyer_result = await buyer_agent.run({
        "category": category,
        "condition_grade": condition_result["grade"],
        "price": routing_result.get("estimated_value", original_price * 0.5)
    })

    # Calculate green impact
    green_impact = calculate_green_impact(category, routing_result["action"])

    # Store product in DynamoDB
    product_data = {
        "product_id": product_id,
        "product_name": product_name or f"{category} Item",
        "category": category,
        "original_price": str(original_price),
        "image_urls": image_urls,
        "condition_score": condition_result["overall"],
        "condition_grade": condition_result["grade"],
        "routing_action": routing_result["action"],
        "estimated_value": str(routing_result["estimated_value"]),
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
        "seller_id": "demo_user",
        "buyer_match_score": buyer_result.get("overall_match_score", 70),
        "green_impact_kg": str(green_impact)
    }
    await db.put_item("sl_products", product_data)

    # Store passport
    passport_data = {
        "product_id": product_id,
        "product_name": product_name or f"{category} Item",
        "category": category,
        "image_urls": image_urls,
        "condition_score": condition_result["overall"],
        "condition_grade": condition_result["grade"],
        "scores": {
            "surface": condition_result["surface"],
            "parts": condition_result["parts"],
            "accessories": condition_result["accessories"],
            "packaging": condition_result["packaging"]
        },
        "defects_found": condition_result["defects_found"],
        "missing_accessories": condition_result["missing_accessories"],
        "ai_reasoning": condition_result["reasoning"],
        "routing_action": routing_result["action"],
        "routing_reasoning": routing_result["reasoning"],
        "estimated_value": str(routing_result["estimated_value"]),
        "ownership_history": [
            {
                "event_type": "listed",
                "date": datetime.utcnow().isoformat(),
                "description": "Product listed on SecondLife AI",
                "actor": "demo_user"
            }
        ],
        "ai_verified": True,
        "created_at": datetime.utcnow().isoformat(),
        "green_impact_kg": str(green_impact)
    }
    await db.put_item("sl_passports", passport_data)

    # Return full result
    return {
        "product_id": product_id,
        "product_name": product_name or f"{category} Item",
        "category": category,
        "image_urls": image_urls,
        "condition": {
            "scores": {
                "surface": condition_result["surface"],
                "parts": condition_result["parts"],
                "accessories": condition_result["accessories"],
                "packaging": condition_result["packaging"],
                "overall": condition_result["overall"]
            },
            "grade": condition_result["grade"],
            "defects_found": condition_result["defects_found"],
            "missing_accessories": condition_result["missing_accessories"],
            "reasoning": condition_result["reasoning"],
            "confidence": condition_result["confidence"]
        },
        "routing": {
            "action": routing_result["action"],
            "reasoning": routing_result["reasoning"],
            "estimated_value": routing_result["estimated_value"],
            "buyback_offer": routing_result["buyback_offer"],
            "confidence": routing_result["confidence"],
            "time_to_sell_days": routing_result["time_to_sell_days"]
        },
        "demand_level": demand_level,
        "buyer_match_score": buyer_result.get("overall_match_score", 70),
        "buyer_top_cities": buyer_result.get("top_cities", []),
        "green_impact_kg": green_impact
    }
