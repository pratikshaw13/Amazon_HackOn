"""
Seed Demand Scores — Populates sl_demand_scores with initial demand data.
Each city × category has a demand score that changes over time.
Run: python seed_demand_scores.py
"""
import asyncio
import random
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

import boto3, os

CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Lucknow", "Chandigarh"]
CATEGORIES = ["Electronics", "Baby Products", "Fashion", "Home", "Kitchen", "Books", "Sports", "Personal Care"]

# Base demand profiles (some cities are stronger in certain categories)
CITY_PROFILES = {
    "Bengaluru": {"Electronics": 92, "Books": 70},
    "Mumbai": {"Fashion": 88, "Home": 80, "Electronics": 79},
    "Delhi": {"Electronics": 76, "Fashion": 82},
    "Hyderabad": {"Electronics": 74, "Books": 65},
    "Chennai": {"Electronics": 63, "Books": 72},
    "Pune": {"Electronics": 67, "Sports": 72},
    "Kolkata": {"Books": 78, "Home": 60, "Fashion": 65},
    "Ahmedabad": {"Home": 62, "Kitchen": 68},
    "Jaipur": {"Fashion": 70, "Home": 55},
    "Kochi": {"Electronics": 58, "Books": 65},
    "Lucknow": {"Kitchen": 55, "Home": 50},
    "Chandigarh": {"Electronics": 52, "Sports": 58},
}


def create_table():
    client = boto3.client(
        "dynamodb",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "ap-south-1"),
    )
    existing = client.list_tables()["TableNames"]
    if "sl_demand_scores" not in existing:
        client.create_table(
            TableName="sl_demand_scores",
            KeySchema=[
                {"AttributeName": "city", "KeyType": "HASH"},
                {"AttributeName": "category", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "city", "AttributeType": "S"},
                {"AttributeName": "category", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        print("  ✅ Created table: sl_demand_scores")
    else:
        print("  ✓ Table sl_demand_scores already exists")


async def seed():
    from services.dynamodb_service import DynamoDBService
    db = DynamoDBService()
    now = datetime.now(timezone.utc).isoformat()
    count = 0

    for city in CITIES:
        for category in CATEGORIES:
            # Get profiled score or random
            profile = CITY_PROFILES.get(city, {})
            base_score = profile.get(category, random.randint(30, 70))
            # Add some variance
            score = max(15, min(98, base_score + random.randint(-8, 8)))

            record = {
                "city": city,
                "category": category,
                "demand_score": score,
                "buyer_count": int(score * random.uniform(3, 8)),
                "avg_days_to_sell": max(2, 25 - int(score * 0.22)),
                "last_updated": now,
            }
            await db.put_item("sl_demand_scores", record)
            count += 1

    print(f"  ✅ Seeded {count} demand records ({len(CITIES)} cities × {len(CATEGORIES)} categories)")


if __name__ == "__main__":
    print("📊 Seeding demand scores...\n")
    create_table()
    print()
    asyncio.run(seed())
    print("\n✅ Done!")
