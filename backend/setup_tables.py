"""
Quick setup script — Creates DynamoDB tables needed for SecondLife AI.
Run this once: python setup_tables.py
"""
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

aws_key = os.getenv("AWS_ACCESS_KEY_ID")
aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
aws_region = os.getenv("AWS_REGION", "ap-south-1")

if not aws_key:
    print("❌ AWS_ACCESS_KEY_ID not set in .env")
    exit(1)

dynamodb = boto3.client(
    "dynamodb",
    aws_access_key_id=aws_key,
    aws_secret_access_key=aws_secret,
    region_name=aws_region
)

# Get existing tables
existing = dynamodb.list_tables()["TableNames"]
print(f"📋 Existing tables: {existing}\n")

TABLES = [
    {
        "TableName": "sl_products",
        "KeySchema": [{"AttributeName": "product_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "product_id", "AttributeType": "S"}]
    },
    {
        "TableName": "sl_passports",
        "KeySchema": [{"AttributeName": "product_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "product_id", "AttributeType": "S"}]
    },
    {
        "TableName": "sl_users",
        "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "user_id", "AttributeType": "S"}]
    },
    {
        "TableName": "sl_transactions",
        "KeySchema": [
            {"AttributeName": "transaction_id", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "transaction_id", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"}
        ]
    },
    {
        "TableName": "sl_demand",
        "KeySchema": [
            {"AttributeName": "category", "KeyType": "HASH"},
            {"AttributeName": "city", "KeyType": "RANGE"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "category", "AttributeType": "S"},
            {"AttributeName": "city", "AttributeType": "S"}
        ]
    }
]

for table_config in TABLES:
    name = table_config["TableName"]
    if name in existing:
        print(f"  ✓ '{name}' already exists")
        continue

    try:
        dynamodb.create_table(
            TableName=name,
            KeySchema=table_config["KeySchema"],
            AttributeDefinitions=table_config["AttributeDefinitions"],
            BillingMode="PAY_PER_REQUEST"
        )
        print(f"  ✅ Created '{name}'")
    except Exception as e:
        print(f"  ❌ Failed to create '{name}': {e}")

print("\n✅ Done! Tables are ready.")
print("   Note: New tables may take 10-20 seconds to become active.")
