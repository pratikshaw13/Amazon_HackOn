"""
Seed Delivery Partners — Creates DynamoDB tables + 5 pre-approved Amazon Flex partners.
Run: python seed_delivery_partners.py
Login: Partner ID + Phone + Aadhaar last 4 digits
"""
import asyncio
import os
import boto3
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

DEMO_PARTNERS = [
    {
        "partner_id": "FLEX-DEL-1001",
        "partner_name": "Ravi Shankar",
        "phone": "9876543210",
        "email": "ravi.shankar@email.com",
        "city": "Mumbai",
        "vehicle_type": "Bike",
        "aadhaar_last4": "4532",
        "total_deliveries": 47,
        "total_earnings": "9870",
        "green_credits_earned": 235,
        "orders_accepted": 52,
        "orders_rejected": 5,
        "rating": "4.8",
        "current_lat": "19.076",
        "current_lng": "72.877",
    },
    {
        "partner_id": "FLEX-DEL-1002",
        "partner_name": "Suresh Kumar",
        "phone": "9123456789",
        "email": "suresh.kumar@email.com",
        "city": "Delhi",
        "vehicle_type": "Scooter",
        "aadhaar_last4": "7891",
        "total_deliveries": 63,
        "total_earnings": "12540",
        "green_credits_earned": 315,
        "orders_accepted": 68,
        "orders_rejected": 3,
        "rating": "4.9",
        "current_lat": "28.613",
        "current_lng": "77.209",
    },
    {
        "partner_id": "FLEX-DEL-1003",
        "partner_name": "Priya Devi",
        "phone": "8765432109",
        "email": "priya.devi@email.com",
        "city": "Bengaluru",
        "vehicle_type": "Bike",
        "aadhaar_last4": "2345",
        "total_deliveries": 31,
        "total_earnings": "6510",
        "green_credits_earned": 155,
        "orders_accepted": 34,
        "orders_rejected": 2,
        "rating": "4.7",
        "current_lat": "12.971",
        "current_lng": "77.594",
    },
    {
        "partner_id": "FLEX-DEL-1004",
        "partner_name": "Amit Verma",
        "phone": "7654321098",
        "email": "amit.verma@email.com",
        "city": "Hyderabad",
        "vehicle_type": "EV Bike",
        "aadhaar_last4": "6789",
        "total_deliveries": 55,
        "total_earnings": "11550",
        "green_credits_earned": 275,
        "orders_accepted": 58,
        "orders_rejected": 4,
        "rating": "4.6",
        "current_lat": "17.385",
        "current_lng": "78.486",
    },
    {
        "partner_id": "FLEX-DEL-1005",
        "partner_name": "Deepa Nair",
        "phone": "6543210987",
        "email": "deepa.nair@email.com",
        "city": "Pune",
        "vehicle_type": "Scooter",
        "aadhaar_last4": "1234",
        "total_deliveries": 22,
        "total_earnings": "4620",
        "green_credits_earned": 110,
        "orders_accepted": 24,
        "orders_rejected": 1,
        "rating": "4.9",
        "current_lat": "18.520",
        "current_lng": "73.856",
    },
]


def create_tables():
    client = boto3.client(
        "dynamodb",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "ap-south-1"),
    )
    existing = client.list_tables()["TableNames"]

    if "delivery_partners" not in existing:
        client.create_table(
            TableName="delivery_partners",
            KeySchema=[{"AttributeName": "partner_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "partner_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        print("  ✅ Created table: delivery_partners")
    else:
        print("  ✓ Table delivery_partners already exists")

    if "delivery_orders" not in existing:
        client.create_table(
            TableName="delivery_orders",
            KeySchema=[{"AttributeName": "order_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "order_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        print("  ✅ Created table: delivery_orders")
    else:
        print("  ✓ Table delivery_orders already exists")


async def seed_partners():
    from services.dynamodb_service import DynamoDBService
    db = DynamoDBService()

    now = datetime.now(timezone.utc).isoformat()

    for partner in DEMO_PARTNERS:
        record = {
            **partner,
            "current_status": "available",
            "created_at": now,
            "last_login": "",
        }
        await db.put_item("delivery_partners", record)
        print(f"  ✅ {partner['partner_id']} — {partner['partner_name']} ({partner['city']}, {partner['vehicle_type']})")

    print(f"\n  🔑 Login: Partner ID + Phone + Aadhaar Last 4")
    print(f"  Example: FLEX-DEL-1001 / 9876543210 / 4532")


if __name__ == "__main__":
    print("🚴 Setting up Amazon Flex Delivery Partner Portal...\n")
    print("📋 Creating DynamoDB tables...")
    create_tables()
    print("\n👤 Seeding demo delivery partners...")
    asyncio.run(seed_partners())
    print("\n✅ Done! Partners can login at /delivery-portal/login")
    print("\n📝 Demo Credentials:")
    print("   Partner ID: FLEX-DEL-1001")
    print("   Phone: 9876543210")
    print("   Aadhaar Last 4: 4532")
