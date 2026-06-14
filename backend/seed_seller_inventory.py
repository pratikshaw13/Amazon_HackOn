"""
Seed Seller Inventory — Populates seller_inventory with 55 realistic products.
Distributed across 5 sellers, 8 categories, various statuses.
Run: python seed_seller_inventory.py
"""
import asyncio
import uuid
import random
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

from services.dynamodb_service import DynamoDBService

db = DynamoDBService()

SELLERS = ["AMZ-SELLER-1001", "AMZ-SELLER-1002", "AMZ-SELLER-1003", "AMZ-SELLER-1004", "AMZ-SELLER-1005"]
CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi"]
STATUSES = ["active", "active", "active", "returned", "returned", "dead", "dead", "rescued", "sold", "donated"]
GRADES = ["Like New", "Excellent", "Good", "Good", "Fair"]

PRODUCTS = [
    # Electronics (AMZ-SELLER-1001)
    {"name": "Sony WH-1000XM4 Headphones", "cat": "Electronics", "orig": 29990, "seller": 0},
    {"name": "Samsung Galaxy Buds2 Pro", "cat": "Electronics", "orig": 17999, "seller": 0},
    {"name": "JBL Flip 6 Speaker", "cat": "Electronics", "orig": 11999, "seller": 0},
    {"name": "Apple AirPods 3rd Gen", "cat": "Electronics", "orig": 18900, "seller": 0},
    {"name": "Bose QC45 Headphones", "cat": "Electronics", "orig": 32900, "seller": 0},
    {"name": "OnePlus Nord Buds 2", "cat": "Electronics", "orig": 2999, "seller": 0},
    {"name": "Sony SRS-XB13 Speaker", "cat": "Electronics", "orig": 4990, "seller": 0},
    {"name": "Realme Buds Air 5 Pro", "cat": "Electronics", "orig": 3999, "seller": 0},
    {"name": "Marshall Emberton II", "cat": "Electronics", "orig": 14999, "seller": 0},
    {"name": "Sennheiser HD 450BT", "cat": "Electronics", "orig": 12490, "seller": 0},
    # Baby Products (AMZ-SELLER-1002)
    {"name": "Chicco Bravo Stroller", "cat": "Baby Products", "orig": 28999, "seller": 1},
    {"name": "Philips Avent Baby Monitor", "cat": "Baby Products", "orig": 8499, "seller": 1},
    {"name": "Fisher-Price Bouncer", "cat": "Baby Products", "orig": 4599, "seller": 1},
    {"name": "Graco Pack n Play", "cat": "Baby Products", "orig": 9999, "seller": 1},
    {"name": "LuvLap Baby Car Seat", "cat": "Baby Products", "orig": 6499, "seller": 1},
    {"name": "Mee Mee Baby Walker", "cat": "Baby Products", "orig": 3299, "seller": 1},
    {"name": "Himalaya Baby Gift Pack", "cat": "Baby Products", "orig": 999, "seller": 1},
    {"name": "Johnson's Baby Bath Tub", "cat": "Baby Products", "orig": 1499, "seller": 1},
    {"name": "Pampers All-Round Diapers (L)", "cat": "Baby Products", "orig": 1299, "seller": 1},
    {"name": "Babyhug Wooden Crib", "cat": "Baby Products", "orig": 12999, "seller": 1},
    {"name": "R for Rabbit Stroller", "cat": "Baby Products", "orig": 7999, "seller": 1},
    # Sports & Fitness (AMZ-SELLER-1003)
    {"name": "Fitbit Charge 5", "cat": "Sports", "orig": 14999, "seller": 2},
    {"name": "Decathlon Yoga Mat", "cat": "Sports", "orig": 999, "seller": 2},
    {"name": "PowerMax Treadmill TDM-98", "cat": "Sports", "orig": 24990, "seller": 2},
    {"name": "Nivia Football Storm", "cat": "Sports", "orig": 899, "seller": 2},
    {"name": "Boldfit Resistance Bands", "cat": "Sports", "orig": 599, "seller": 2},
    {"name": "Cultsport Smartwatch", "cat": "Sports", "orig": 4999, "seller": 2},
    {"name": "Adidas Dumbbell Set 10kg", "cat": "Sports", "orig": 3499, "seller": 2},
    {"name": "Strauss Gym Gloves", "cat": "Sports", "orig": 499, "seller": 2},
    # Home & Kitchen (AMZ-SELLER-1004)
    {"name": "Instant Pot Duo 7-in-1", "cat": "Kitchen", "orig": 8999, "seller": 3},
    {"name": "Philips Air Fryer HD9252", "cat": "Kitchen", "orig": 9995, "seller": 3},
    {"name": "Prestige Mixer Grinder", "cat": "Kitchen", "orig": 3499, "seller": 3},
    {"name": "Milton Thermosteel Flask", "cat": "Kitchen", "orig": 899, "seller": 3},
    {"name": "Pigeon Non-Stick Cookware Set", "cat": "Kitchen", "orig": 2499, "seller": 3},
    {"name": "Kent RO Water Purifier", "cat": "Home", "orig": 18500, "seller": 3},
    {"name": "Dyson V8 Vacuum Cleaner", "cat": "Home", "orig": 35900, "seller": 3},
    {"name": "Havells Tower Fan", "cat": "Home", "orig": 5490, "seller": 3},
    {"name": "Amazon Echo Dot 5th Gen", "cat": "Home", "orig": 4499, "seller": 3},
    {"name": "Crompton Ceiling Fan", "cat": "Home", "orig": 2199, "seller": 3},
    {"name": "Wipro 9W LED Bulb (Pack 6)", "cat": "Home", "orig": 599, "seller": 3},
    {"name": "Solimo Bedsheets King Size", "cat": "Home", "orig": 799, "seller": 3},
    # Books & Personal Care (AMZ-SELLER-1005)
    {"name": "Atomic Habits", "cat": "Books", "orig": 499, "seller": 4},
    {"name": "Ikigai", "cat": "Books", "orig": 350, "seller": 4},
    {"name": "The Psychology of Money", "cat": "Books", "orig": 399, "seller": 4},
    {"name": "Deep Work by Cal Newport", "cat": "Books", "orig": 450, "seller": 4},
    {"name": "Think and Grow Rich", "cat": "Books", "orig": 199, "seller": 4},
    {"name": "NCERT Physics Class 12", "cat": "Books", "orig": 350, "seller": 4},
    {"name": "HC Verma Vol 1 & 2", "cat": "Books", "orig": 650, "seller": 4},
    {"name": "Biotique Face Wash", "cat": "Personal Care", "orig": 299, "seller": 4},
    {"name": "Nivea Body Lotion 400ml", "cat": "Personal Care", "orig": 399, "seller": 4},
    {"name": "Philips Trimmer BT3211", "cat": "Personal Care", "orig": 1599, "seller": 4},
    {"name": "Dove Shampoo 650ml", "cat": "Personal Care", "orig": 449, "seller": 4},
    {"name": "Colgate Electric Toothbrush", "cat": "Personal Care", "orig": 1899, "seller": 4},
    # Fashion (distributed)
    {"name": "Levi's 511 Slim Jeans", "cat": "Fashion", "orig": 3499, "seller": 0},
    {"name": "Nike Air Max 270", "cat": "Fashion", "orig": 12995, "seller": 2},
]


async def seed():
    print("📦 Seeding seller inventory with 55 products...\n")
    count = 0

    for i, prod in enumerate(PRODUCTS):
        product_id = str(uuid.uuid4())
        seller_id = SELLERS[prod["seller"]]
        status = random.choice(STATUSES)
        grade = random.choice(GRADES)
        demand_score = random.randint(15, 95)
        inventory_age = random.randint(3, 120)
        return_rate = random.randint(5, 35)
        total_sales = random.randint(10, 500)
        green_score = random.randint(30, 95)
        city = random.choice(CITIES)

        # Price degradation
        price_factor = random.uniform(0.55, 0.92)
        current_price = int(prod["orig"] * price_factor)

        # Routing history
        routing_history = []
        if status in ("returned", "dead", "rescued"):
            routing_history.append({
                "from_city": city,
                "to_city": random.choice([c for c in CITIES if c != city]),
                "date": (datetime.now(timezone.utc) - timedelta(days=random.randint(5, 30))).isoformat(),
                "reason": "Low demand in current warehouse"
            })

        created_at = (datetime.now(timezone.utc) - timedelta(days=inventory_age)).isoformat()

        item = {
            "product_id": product_id,
            "seller_id": seller_id,
            "product_name": prod["name"],
            "category": prod["cat"],
            "warehouse_city": city,
            "current_price": str(current_price),
            "original_price": str(prod["orig"]),
            "demand_score": demand_score,
            "green_score": green_score,
            "condition_grade": grade,
            "return_rate": str(return_rate),
            "total_sales": total_sales,
            "inventory_age": inventory_age,
            "status": status,
            "routing_history": routing_history,
            "image_url": f"https://picsum.photos/seed/seller{i + 200}/400/400",
            "created_at": created_at,
        }

        await db.put_item("seller_inventory", item)
        status_icon = {"active": "🟢", "returned": "🟡", "dead": "🔴", "rescued": "🔵", "sold": "✅", "donated": "💚"}.get(status, "⚪")
        count += 1
        print(f"  {status_icon} {prod['name']} — ₹{current_price} ({status}) [{seller_id}]")

    print(f"\n🎉 Seeded {count} products into seller_inventory!")


if __name__ == "__main__":
    asyncio.run(seed())
