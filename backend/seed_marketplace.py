"""
Seed Marketplace — Populates DynamoDB with 35 sample products for demonstration.
Uses placeholder images from picsum.photos (free, no API key needed).
Run: python seed_marketplace.py
"""
import asyncio
import uuid
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

from services.dynamodb_service import DynamoDBService

db = DynamoDBService()

PRODUCTS = [
    # Electronics
    {"name": "Sony WH-1000XM5 Headphones", "category": "Electronics", "price": 29990, "grade": "Excellent", "score": 88},
    {"name": "Samsung Galaxy Buds Pro", "category": "Electronics", "price": 15999, "grade": "Like New", "score": 94},
    {"name": "JBL Charge 5 Bluetooth Speaker", "category": "Electronics", "price": 13999, "grade": "Good", "score": 72},
    {"name": "Apple AirPods Pro 2nd Gen", "category": "Electronics", "price": 24900, "grade": "Excellent", "score": 85},
    {"name": "Bose SoundLink Mini II", "category": "Electronics", "price": 9990, "grade": "Fair", "score": 55},
    # Monitors
    {"name": "Dell S2722QC 27-inch 4K Monitor", "category": "Monitors", "price": 32999, "grade": "Like New", "score": 92},
    {"name": "LG 27UL850 27-inch UHD", "category": "Monitors", "price": 38000, "grade": "Excellent", "score": 86},
    {"name": "BenQ GW2780 27-inch IPS", "category": "Monitors", "price": 15990, "grade": "Good", "score": 74},
    {"name": "Samsung 24-inch FHD Curved", "category": "Monitors", "price": 12499, "grade": "Good", "score": 68},
    # Laptops
    {"name": "MacBook Air M2 2022", "category": "Laptops", "price": 99900, "grade": "Excellent", "score": 89},
    {"name": "Lenovo ThinkPad X1 Carbon Gen 10", "category": "Laptops", "price": 125000, "grade": "Like New", "score": 93},
    {"name": "HP Pavilion 15 (2023)", "category": "Laptops", "price": 65990, "grade": "Good", "score": 71},
    {"name": "ASUS ROG Strix G15", "category": "Laptops", "price": 89990, "grade": "Excellent", "score": 84},
    # Baby Gear
    {"name": "Chicco Bravo Trio Travel System", "category": "Baby Gear", "price": 32000, "grade": "Good", "score": 70},
    {"name": "Fisher-Price Soothing Motions Bassinet", "category": "Baby Gear", "price": 12999, "grade": "Like New", "score": 91},
    {"name": "Graco Pack n Play Playard", "category": "Baby Gear", "price": 8999, "grade": "Excellent", "score": 82},
    {"name": "Philips Avent Baby Monitor", "category": "Baby Gear", "price": 7499, "grade": "Good", "score": 75},
    {"name": "LuvLap Galaxy Baby Stroller", "category": "Baby Gear", "price": 5499, "grade": "Fair", "score": 58},
    # Fitness
    {"name": "Fitbit Charge 5 Fitness Tracker", "category": "Fitness", "price": 14999, "grade": "Excellent", "score": 87},
    {"name": "Cultsport Smartwatch Ace", "category": "Fitness", "price": 3999, "grade": "Good", "score": 69},
    {"name": "PowerMax TD-M1 Treadmill", "category": "Fitness", "price": 28990, "grade": "Good", "score": 65},
    {"name": "Decathlon Resistance Band Set", "category": "Fitness", "price": 1499, "grade": "Like New", "score": 95},
    # Kitchen
    {"name": "Instant Pot Duo 7-in-1", "category": "Kitchen", "price": 8999, "grade": "Like New", "score": 90},
    {"name": "Prestige Iris 750W Mixer Grinder", "category": "Kitchen", "price": 3499, "grade": "Good", "score": 67},
    {"name": "Philips Air Fryer HD9252", "category": "Kitchen", "price": 9995, "grade": "Excellent", "score": 83},
    # Books
    {"name": "Atomic Habits by James Clear", "category": "Books", "price": 499, "grade": "Like New", "score": 96},
    {"name": "Sapiens by Yuval Noah Harari", "category": "Books", "price": 599, "grade": "Excellent", "score": 88},
    {"name": "The Psychology of Money", "category": "Books", "price": 350, "grade": "Good", "score": 78},
    {"name": "Rich Dad Poor Dad", "category": "Books", "price": 399, "grade": "Excellent", "score": 85},
    # Furniture
    {"name": "IKEA MARKUS Office Chair", "category": "Furniture", "price": 18990, "grade": "Good", "score": 72},
    {"name": "Wakefit Orthopaedic Mattress Queen", "category": "Furniture", "price": 12999, "grade": "Excellent", "score": 86},
    {"name": "Nilkamal Ergonomic Study Desk", "category": "Furniture", "price": 8499, "grade": "Good", "score": 69},
    # Fashion
    {"name": "Boat Rockerz 450 Headphones", "category": "Fashion", "price": 1499, "grade": "Like New", "score": 92},
    {"name": "Fossil Gen 6 Smartwatch", "category": "Fashion", "price": 22995, "grade": "Excellent", "score": 81},
    {"name": "Ray-Ban Aviator Classic", "category": "Fashion", "price": 8990, "grade": "Like New", "score": 94},
]

CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi"]


def get_placeholder_image(index):
    """Generate a unique placeholder image URL using picsum.photos."""
    # Use deterministic seeds for consistent images
    return f"https://picsum.photos/seed/product{index}/400/400"


def calculate_resale_value(original_price, score):
    """Calculate estimated resale value based on condition score."""
    factor = (score / 100) * 0.7 + 0.15  # 15% floor, up to 85%
    return round(original_price * factor, 0)


async def seed():
    print("🌱 Seeding marketplace with sample products...\n")

    count = 0
    for i, product in enumerate(PRODUCTS):
        product_id = str(uuid.uuid4())
        score = product["score"]
        original_price = product["price"]
        estimated_value = calculate_resale_value(original_price, score)
        city = random.choice(CITIES)
        green_impact = round(random.uniform(5, 35), 1)
        green_credits = int(green_impact * 2)
        days_ago = random.randint(1, 30)
        created_at = (datetime.utcnow() - timedelta(days=days_ago)).isoformat()

        product_data = {
            "product_id": product_id,
            "product_name": product["name"],
            "category": product["category"],
            "original_price": str(original_price),
            "estimated_value": str(estimated_value),
            "condition_score": score,
            "condition_grade": product["grade"],
            "image_urls": [get_placeholder_image(i + 100)],
            "routing_action": "direct_resale",
            "status": "active",
            "created_at": created_at,
            "seller_id": "seed_seller",
            "city": city,
            "buyer_match_score": random.randint(65, 98),
            "green_impact_kg": str(green_impact),
            "green_credits": green_credits,
            "demand_score": random.randint(40, 95),
            "amazon_verified": random.choice([True, True, True, False]),
            "search_keywords": f"{product['name'].lower()} {product['category'].lower()}",
        }

        await db.put_item("sl_products", product_data)

        # Also create passport
        passport_data = {
            "product_id": product_id,
            "product_name": product["name"],
            "category": product["category"],
            "image_urls": [get_placeholder_image(i + 100)],
            "condition_score": score,
            "condition_grade": product["grade"],
            "scores": {
                "surface": score + random.randint(-10, 5),
                "parts": min(100, score + random.randint(0, 10)),
                "accessories": max(30, score - random.randint(0, 15)),
                "packaging": max(20, score - random.randint(5, 25)),
            },
            "defects_found": [],
            "missing_accessories": [],
            "ai_reasoning": f"AI-graded {product['grade']} condition based on visual inspection.",
            "routing_action": "direct_resale",
            "routing_reasoning": f"High demand in {city}, condition supports direct resale.",
            "estimated_value": str(estimated_value),
            "ownership_history": [
                {"event_type": "purchased", "date": (datetime.utcnow() - timedelta(days=days_ago + 60)).isoformat(), "description": "Original purchase on Amazon", "actor": "original_owner"},
                {"event_type": "listed", "date": created_at, "description": "Listed on SecondLife AI marketplace", "actor": "seed_seller"},
            ],
            "ai_verified": True,
            "amazon_verified": product_data["amazon_verified"],
            "created_at": created_at,
            "green_impact_kg": str(green_impact),
        }
        await db.put_item("sl_passports", passport_data)

        count += 1
        print(f"  ✅ {product['name']} — ₹{int(estimated_value)} ({product['grade']})")

    print(f"\n🎉 Seeded {count} products into marketplace!")


if __name__ == "__main__":
    asyncio.run(seed())
