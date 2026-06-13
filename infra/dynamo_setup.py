"""
DynamoDB Table Setup — Creates all required tables for SecondLife AI.
Run: python infra/dynamo_setup.py
"""
import os
import boto3
from dotenv import load_dotenv
from pathlib import Path

# Load env from backend
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

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


def create_tables():
    aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    aws_region = os.getenv("AWS_REGION", "ap-south-1")

    if not aws_key or aws_key == "your_aws_access_key":
        print("⚠️  AWS credentials not set. Skipping DynamoDB table creation.")
        print("   The app will use local in-memory storage as fallback.")
        return

    dynamodb = boto3.client(
        "dynamodb",
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret,
        region_name=aws_region
    )

    existing_tables = dynamodb.list_tables()["TableNames"]

    for table_config in TABLES:
        table_name = table_config["TableName"]

        if table_name in existing_tables:
            print(f"  ✓ Table '{table_name}' already exists")
            continue

        try:
            dynamodb.create_table(
                TableName=table_name,
                KeySchema=table_config["KeySchema"],
                AttributeDefinitions=table_config["AttributeDefinitions"],
                BillingMode="PAY_PER_REQUEST"
            )
            print(f"  ✅ Created table '{table_name}'")
        except Exception as e:
            print(f"  ❌ Failed to create '{table_name}': {e}")

    print("\n✅ DynamoDB setup complete!")


if __name__ == "__main__":
    print("🗄️  Setting up DynamoDB tables for SecondLife AI...\n")
    create_tables()
