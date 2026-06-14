"""
AI Selling Agent Router — ChatGPT-style conversational selling experience.
Steps: category → image → details → AI estimates → confirm → listed.
"""
import uuid
import base64
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service
from services.bedrock_service import BedrockService
from routers.auth import get_current_user
from utils.image_utils import encode_image_to_base64, resize_image, validate_image
from utils.scoring import calculate_green_impact

router = APIRouter()
db = DynamoDBService()
s3 = S3Service()
ai = BedrockService()


class AgentStepRequest(BaseModel):
    step: str  # "start" | "category" | "details" | "confirm"
    category: Optional[str] = None
    product_name: Optional[str] = None
    description: Optional[str] = None
    original_price: Optional[float] = None
    product_id: Optional[str] = None  # For confirm step


@router.post("/sell/agent/start")
async def agent_start(user: dict = Depends(get_current_user)):
    """Start the selling agent conversation."""
    return {
        "step": "category",
        "message": "👋 Hi! I'm your SecondLife AI selling assistant. I'll help you list your product in under 60 seconds.\n\nLet's start — **what category** does your product belong to?",
        "options": [
            "Electronics", "Monitors", "Laptops", "Smartphones", "Headphones",
            "Baby Gear", "Furniture", "Fitness", "Kitchen", "Books", "Fashion", "Sports"
        ]
    }


@router.post("/sell/agent/image")
async def agent_image_upload(
    images: List[UploadFile] = File(...),
    category: str = Form("Electronics"),
    product_name: str = Form(""),
    user: dict = Depends(get_current_user)
):
    """Upload product image — AI analyzes condition and estimates price."""
    product_id = str(uuid.uuid4())
    images_base64 = []
    image_urls = []

    for image_file in images[:5]:
        image_bytes = await image_file.read()
        is_valid, _ = validate_image(image_bytes)
        if not is_valid:
            continue
        resized = resize_image(image_bytes)
        url = await s3.upload_image(resized, product_id)
        image_urls.append(url)
        images_base64.append(encode_image_to_base64(resized))

    if not images_base64:
        return {"step": "image", "message": "⚠️ Please upload a valid image (JPEG/PNG, max 10MB).", "error": True}

    # AI condition assessment
    condition_result = await ai.analyze_images(images_base64, category, product_name)
    score = condition_result.get("overall", 70)
    grade = condition_result.get("grade", "Good")

    # AI demand forecast
    demand_result = await ai.get_demand_forecast(category)
    city_demand = demand_result.get("city_demand", [])
    top_city = city_demand[0] if city_demand else {"city": "Bengaluru", "demand": "High", "score": 75}

    # Calculate estimates
    original_price_est = 10000  # Will be refined when user provides
    green_impact = calculate_green_impact(category, "direct_resale")

    return {
        "step": "details",
        "product_id": product_id,
        "message": f"📸 Great photo! Here's what I found:\n\n"
                   f"**Condition:** {grade} ({score}/100)\n"
                   f"**Top defects:** {', '.join(condition_result.get('defects_found', ['None detected']))}\n"
                   f"**Demand hotspot:** {top_city['city']} ({top_city['demand']})\n"
                   f"**Green Impact:** {green_impact}kg CO₂ saved\n\n"
                   f"Now I need a few more details to list it.",
        "ai_assessment": {
            "condition_score": score,
            "condition_grade": grade,
            "defects": condition_result.get("defects_found", []),
            "demand_city": top_city["city"],
            "demand_level": top_city["demand"],
            "green_impact_kg": green_impact,
        },
        "image_urls": image_urls,
    }


@router.post("/sell/agent/estimate")
async def agent_estimate(request: AgentStepRequest, user: dict = Depends(get_current_user)):
    """After user provides details, AI estimates final price."""
    if not request.product_name or not request.original_price:
        return {"step": "details", "message": "Please provide the product name and original price.", "error": True}

    category = request.category or "Electronics"
    original_price = request.original_price or 5000

    # Get AI routing decision
    routing = await ai.get_routing_decision(
        condition_score=75,  # Will use actual from session
        category=category,
        demand_level="High",
        original_price=original_price
    )

    estimated_value = routing.get("estimated_value", int(original_price * 0.5))
    buyback_offer = routing.get("buyback_offer", int(estimated_value * 0.65))
    time_to_sell = routing.get("time_to_sell_days", 7)
    green_impact = calculate_green_impact(category, routing.get("action", "direct_resale"))
    green_credits = int(green_impact * 2) + 50  # 50 for listing

    return {
        "step": "confirm",
        "message": f"🤖 Here's my estimate for your **{request.product_name}**:\n\n"
                   f"💰 **Recommended Price:** ₹{int(estimated_value):,}\n"
                   f"⚡ **Instant Buyback:** ₹{int(buyback_offer):,}\n"
                   f"📅 **Estimated Sale Time:** {time_to_sell} days\n"
                   f"🌱 **Green Credits Earned:** +{green_credits}\n"
                   f"🌍 **CO₂ Saved:** {green_impact}kg\n\n"
                   f"Ready to list? Click **Confirm** and your product goes live instantly!",
        "estimate": {
            "estimated_value": estimated_value,
            "buyback_offer": buyback_offer,
            "time_to_sell_days": time_to_sell,
            "green_credits": green_credits,
            "green_impact_kg": green_impact,
            "routing_action": routing.get("action", "direct_resale"),
        }
    }


@router.post("/sell/agent/confirm")
async def agent_confirm(
    product_id: str = Form(...),
    product_name: str = Form(...),
    category: str = Form("Electronics"),
    original_price: float = Form(5000),
    estimated_value: float = Form(3000),
    condition_score: int = Form(75),
    condition_grade: str = Form("Good"),
    green_impact_kg: float = Form(15),
    image_urls: str = Form("[]"),  # JSON string of URLs
    listing_scope: str = Form("regional"),  # "local" or "regional"
    listing_city: str = Form("Mumbai"),
    user: dict = Depends(get_current_user)
):
    """Confirm listing — product goes live in marketplace."""
    import json
    urls = json.loads(image_urls) if image_urls.startswith("[") else []

    now = datetime.utcnow().isoformat()
    green_credits = int(green_impact_kg * 2) + 50

    # Save product
    product_data = {
        "product_id": product_id,
        "product_name": product_name,
        "category": category,
        "original_price": str(original_price),
        "estimated_value": str(estimated_value),
        "condition_score": condition_score,
        "condition_grade": condition_grade,
        "image_urls": urls,
        "routing_action": "direct_resale",
        "status": "active",
        "created_at": now,
        "seller_id": user["user_id"],
        "city": listing_city,
        "listing_scope": listing_scope,
        "listing_city": listing_city,
        "listing_state": user.get("state", ""),
        "green_impact_kg": str(green_impact_kg),
        "green_credits": green_credits,
        "demand_score": 75,
        "amazon_verified": False,
        "search_keywords": f"{product_name.lower()} {category.lower()}",
    }
    await db.put_item("sl_products", product_data)

    # Save passport
    passport_data = {
        "product_id": product_id,
        "product_name": product_name,
        "category": category,
        "image_urls": urls,
        "condition_score": condition_score,
        "condition_grade": condition_grade,
        "scores": {"surface": condition_score, "parts": condition_score + 5, "accessories": condition_score - 5, "packaging": condition_score - 10},
        "defects_found": [],
        "missing_accessories": [],
        "ai_reasoning": "Listed via AI Selling Agent",
        "routing_action": "direct_resale",
        "estimated_value": str(estimated_value),
        "ownership_history": [
            {"event_type": "listed", "date": now, "description": "Listed via AI Agent", "actor": user["user_id"]}
        ],
        "ai_verified": True,
        "created_at": now,
        "green_impact_kg": str(green_impact_kg),
    }
    await db.put_item("sl_passports", passport_data)

    # Award green credits to seller
    user_data = await db.get_item("sl_users", {"user_id": user["user_id"]})
    if user_data:
        user_data["green_credits"] = int(user_data.get("green_credits", 0)) + green_credits
        sold = user_data.get("products_sold", [])
        sold.append(product_id)
        user_data["products_sold"] = sold
        await db.put_item("sl_users", user_data)

    # Auto-create delivery order for pickup
    import random as _random
    delivery_order_id = f"PICKUP-{uuid.uuid4().hex[:8].upper()}"
    delivery_order = {
        "order_id": delivery_order_id,
        "product_id": product_id,
        "product_name": product_name,
        "product_category": category,
        "product_image": urls[0] if urls else "",
        "seller_id": user["user_id"],
        "seller_name": user.get("name", ""),
        "seller_phone": user.get("phone", ""),
        "seller_address": f"{user.get('name', 'User')}'s location",
        "seller_city": listing_city,
        "partner_id": "",
        "partner_name": "",
        "warehouse_destination": "WH-MUM-01",
        "status": "pending",
        "green_credits": int(green_impact_kg * 2),
        "earning": str(_random.randint(15, 20)),
        "estimated_time_minutes": 0,
        "distance_km": 0,
        "timeline": [{"status": "pending", "timestamp": now, "note": "Awaiting delivery partner"}],
        "created_at": now,
    }
    await db.put_item("delivery_orders", delivery_order)

    return {
        "step": "done",
        "message": f"🎉 **Listed!** Your {product_name} is now live on SecondLife Marketplace.\n\n"
                   f"✅ Price: ₹{int(estimated_value):,}\n"
                   f"🌱 +{green_credits} Green Credits earned!\n"
                   f"🚴 Delivery partner will pick up from your location.\n\n"
                   f"Track your listing in **My Listings** tab.",
        "product_id": product_id,
        "green_credits_earned": green_credits,
        "delivery_order_id": delivery_order_id,
    }
