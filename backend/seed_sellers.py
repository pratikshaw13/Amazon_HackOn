"""
Seed Certified Sellers — Creates DynamoDB table + 5 pre-approved demo seller accounts.
Run: python seed_sellers.py
Password for all demo accounts: Seller@123
"""
import asyncio
import os
import boto3
from datetime import datetime, timezone
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo password for all sellers
DEMO_PASSWORD = "Seller@123"

DEMO_SELLERS = [
    {
        "seller_id": "AMZ-SELLER-1001",
        "seller_name": "Rajesh Kumar",
        "company_name": "TechVista Electronics",
        "email": "rajesh@techvista.in",
        "warehouse_city": "Mumbai",
        "seller_rating": "4.6",
        "total_products": 48,
        "total_products_sold": 312,
        "total_products_returned": 67,
        "dead_inventory_count": 12,
        "recovered_inventory_value": "245000",
        "green_score": 82,
    },
    {
        "seller_id": "AMZ-SELLER-1002",
        "seller_name": "Priya Sharma",
        "company_name": "BabyWorld India",
        "email": "priya@babyworld.in",
        "warehouse_city": "Delhi",
        "seller_rating": "4.8",
        "total_products": 63,
        "total_products_sold": 489,
        "total_products_returned": 94,
        "dead_inventory_count": 18,
        "recovered_inventory_value": "178000",
        "green_score": 91,
    },
    {
        "seller_id": "AMZ-SELLER-1003",
        "seller_name": "Arjun Reddy",
        "company_name": "FitLife Sports & Outdoors",
        "email": "arjun@fitlife.co.in",
        "warehouse_city": "Bengaluru",
        "seller_rating": "4.4",
        "total_products": 35,
        "total_products_sold": 198,
        "total_products_returned": 41,
        "dead_inventory_count": 8,
        "recovered_inventory_value": "132000",
        "green_score": 74,
    },
    {
        "seller_id": "AMZ-SELLER-1004",
        "seller_name": "Anita Patel",
        "company_name": "HomeEssentials Pvt Ltd",
        "email": "anita@homeessentials.in",
        "warehouse_city": "Ahmedabad",
        "seller_rating": "4.5",
        "total_products": 55,
        "total_products_sold": 267,
        "total_products_returned": 52,
        "dead_inventory_count": 15,
        "recovered_inventory_value": "198000",
        "green_score": 78,
    },
    {
        "seller_id": "AMZ-SELLER-1005",
        "seller_name": "Vikram Singh",
        "company_name": "BookHaven Publishers",
        "email": "vikram@bookhaven.in",
        "warehouse_city": "Jaipur",
        "seller_rating": "4.7",
        "total_products": 72,
        "total_products_sold": 534,
        "total_products_returned": 28,
        "dead_inventory_count": 22,
        "recovered_inventory_value": "89000",
        "green_score": 88,
    },
]


def create_table():
    """Create certified_sellers DynamoDB table."""
    client = boto3.client(
        "dynamodb",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "ap-south-1"),
    )

    existing = client.list_tables()["TableNames"]

    if "certified_sellers" not in existing:
        client.create_table(
            TableName="certified_sellers",
            KeySchema=[{"AttributeName": "seller_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "seller_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        print("  ✅ Created table: certified_sellers")
    else:
        print("  ✓ Table certified_sellers already exists")

    if "seller_inventory" not in existing:
        client.create_table(
            TableName="seller_inventory",
            KeySchema=[{"AttributeName": "product_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "product_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        print("  ✅ Created table: seller_inventory")
    else:
        print("  ✓ Table seller_inventory already exists")

    if "seller_routing_history" not in existing:
        client.create_table(
            TableName="seller_routing_history",
            KeySchema=[
                {"AttributeName": "product_id", "KeyType": "HASH"},
                {"AttributeName": "timestamp", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "product_id", "AttributeType": "S"},
                {"AttributeName": "timestamp", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        print("  ✅ Created table: seller_routing_history")
    else:
        print("  ✓ Table seller_routing_history already exists")

    if "rescue_strategies" not in existing:
        client.create_table(
            TableName="rescue_strategies",
            KeySchema=[
                {"AttributeName": "product_id", "KeyType": "HASH"},
                {"AttributeName": "strategy_id", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "product_id", "AttributeType": "S"},
                {"AttributeName": "strategy_id", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        print("  ✅ Created table: rescue_strategies")
    else:
        print("  ✓ Table rescue_strategies already exists")


async def seed_sellers():
    """Seed 5 demo certified seller accounts."""
    from services.dynamodb_service import DynamoDBService
    db = DynamoDBService()

    now = datetime.now(timezone.utc).isoformat()
    password_hash = pwd_context.hash(DEMO_PASSWORD)

    for seller in DEMO_SELLERS:
        record = {
            **seller,
            "password_hash": password_hash,
            "created_at": now,
            "last_login": "",
        }
        await db.put_item("certified_sellers", record)
        print(f"  ✅ {seller['seller_id']} — {seller['seller_name']} ({seller['company_name']})")

    print(f"\n  🔑 Demo password for all sellers: {DEMO_PASSWORD}")


if __name__ == "__main__":
    print("🏪 Setting up Amazon Certified Seller Portal...\n")
    print("📋 Creating DynamoDB tables...")
    create_table()
    print("\n👤 Seeding demo seller accounts...")
    asyncio.run(seed_sellers())
    print("\n✅ Phase 1 complete! Sellers can now login at /seller-portal/login")
    print("\n📝 Demo Credentials:")
    print("   Seller ID: AMZ-SELLER-1001")
    print("   Email: rajesh@techvista.in")
    print("   Password: Seller@123")
