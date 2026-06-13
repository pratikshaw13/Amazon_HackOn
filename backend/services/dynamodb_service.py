"""
DynamoDB Service — Table operations for SecondLife AI.
"""
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()


class DynamoDBService:
    def __init__(self):
        aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")
        aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        aws_region = os.getenv("AWS_REGION", "ap-south-1")

        if not aws_key or aws_key == "your_aws_access_key":
            print("⚠️  AWS credentials not configured. Using local fallback storage.")
            self.available = False
            self._local_store = {
                "sl_products": {},
                "sl_passports": {},
                "sl_users": {},
                "sl_transactions": {},
                "sl_demand": {}
            }
            return

        self.dynamodb = boto3.resource(
            "dynamodb",
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            region_name=aws_region
        )
        self.available = True

    async def put_item(self, table_name: str, item: dict) -> bool:
        """Store an item in DynamoDB or local fallback."""
        if not self.available:
            key = item.get("product_id") or item.get("user_id") or item.get("transaction_id") or "unknown"
            self._local_store.setdefault(table_name, {})[key] = item
            return True

        try:
            table = self.dynamodb.Table(table_name)
            table.put_item(Item=item)
            return True
        except ClientError as e:
            print(f"DynamoDB put_item error: {e}")
            return False

    async def get_item(self, table_name: str, key: dict) -> dict | None:
        """Get an item from DynamoDB or local fallback."""
        if not self.available:
            store = self._local_store.get(table_name, {})
            key_val = list(key.values())[0]
            return store.get(key_val)

        try:
            table = self.dynamodb.Table(table_name)
            response = table.get_item(Key=key)
            return response.get("Item")
        except ClientError as e:
            print(f"DynamoDB get_item error: {e}")
            return None

    async def scan_table(self, table_name: str, filter_expression=None,
                         expression_values=None, limit: int = 20) -> list:
        """Scan a table with optional filters."""
        if not self.available:
            store = self._local_store.get(table_name, {})
            items = list(store.values())
            return items[:limit]

        try:
            table = self.dynamodb.Table(table_name)
            scan_kwargs = {"Limit": limit}

            if filter_expression:
                scan_kwargs["FilterExpression"] = filter_expression
            if expression_values:
                scan_kwargs["ExpressionAttributeValues"] = expression_values

            response = table.scan(**scan_kwargs)
            return response.get("Items", [])
        except ClientError as e:
            print(f"DynamoDB scan error: {e}")
            return []

    async def update_item(self, table_name: str, key: dict,
                          update_expression: str, expression_values: dict) -> bool:
        """Update an item in DynamoDB."""
        if not self.available:
            store = self._local_store.get(table_name, {})
            key_val = list(key.values())[0]
            if key_val in store:
                # Simple local update — just merge
                for k, v in expression_values.items():
                    clean_key = k.lstrip(":")
                    store[key_val][clean_key] = v
            return True

        try:
            table = self.dynamodb.Table(table_name)
            table.update_item(
                Key=key,
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values
            )
            return True
        except ClientError as e:
            print(f"DynamoDB update error: {e}")
            return False

    async def delete_item(self, table_name: str, key: dict) -> bool:
        """Delete an item from DynamoDB."""
        if not self.available:
            store = self._local_store.get(table_name, {})
            key_val = list(key.values())[0]
            store.pop(key_val, None)
            return True

        try:
            table = self.dynamodb.Table(table_name)
            table.delete_item(Key=key)
            return True
        except ClientError as e:
            print(f"DynamoDB delete error: {e}")
            return False
