"""
DynamoDB Service — Table operations for SecondLife AI.
Uses real AWS DynamoDB with the sl_products, sl_passports, sl_users tables.
"""
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from decimal import Decimal
import json

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

        try:
            self.dynamodb = boto3.resource(
                "dynamodb",
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
                region_name=aws_region
            )
            # Test connection by listing tables
            client = boto3.client(
                "dynamodb",
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
                region_name=aws_region
            )
            client.list_tables()
            self.available = True
            print("✅ DynamoDB connected successfully")
        except Exception as e:
            print(f"⚠️  DynamoDB connection failed: {e}. Using local fallback.")
            self.available = False
            self._local_store = {
                "sl_products": {},
                "sl_passports": {},
                "sl_users": {},
                "sl_transactions": {},
                "sl_demand": {}
            }

    def _sanitize_item(self, item: dict) -> dict:
        """Convert floats to Decimal and remove None values for DynamoDB compatibility."""
        sanitized = {}
        for key, value in item.items():
            if value is None:
                continue
            elif isinstance(value, float):
                sanitized[key] = Decimal(str(value))
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_item(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_item(v) if isinstance(v, dict)
                    else Decimal(str(v)) if isinstance(v, float)
                    else v
                    for v in value
                ]
            else:
                sanitized[key] = value
        return sanitized

    def _deserialize_item(self, item: dict) -> dict:
        """Convert Decimal back to int/float for JSON serialization."""
        if item is None:
            return None
        deserialized = {}
        for key, value in item.items():
            if isinstance(value, Decimal):
                # Convert to int if no decimal part, else float
                if value % 1 == 0:
                    deserialized[key] = int(value)
                else:
                    deserialized[key] = float(value)
            elif isinstance(value, dict):
                deserialized[key] = self._deserialize_item(value)
            elif isinstance(value, list):
                deserialized[key] = [
                    self._deserialize_item(v) if isinstance(v, dict)
                    else int(v) if isinstance(v, Decimal) and v % 1 == 0
                    else float(v) if isinstance(v, Decimal)
                    else v
                    for v in value
                ]
            else:
                deserialized[key] = value
        return deserialized

    async def put_item(self, table_name: str, item: dict) -> bool:
        """Store an item in DynamoDB or local fallback."""
        if not self.available:
            key = item.get("product_id") or item.get("user_id") or item.get("transaction_id") or "unknown"
            self._local_store.setdefault(table_name, {})[key] = item
            return True

        try:
            table = self.dynamodb.Table(table_name)
            sanitized = self._sanitize_item(item)
            table.put_item(Item=sanitized)
            print(f"✅ Saved to {table_name}: {item.get('product_id', 'unknown')}")
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ResourceNotFoundException':
                print(f"⚠️  Table '{table_name}' does not exist. Falling back to local storage.")
                # Fallback to local store for this item
                key = item.get("product_id") or item.get("user_id") or "unknown"
                self._local_store.setdefault(table_name, {})[key] = item
                return True
            print(f"DynamoDB put_item error: {e}")
            return False
        except Exception as e:
            print(f"DynamoDB put_item unexpected error: {e}")
            # Fallback to local
            key = item.get("product_id") or item.get("user_id") or "unknown"
            self._local_store.setdefault(table_name, {})[key] = item
            return True

    async def get_item(self, table_name: str, key: dict) -> dict | None:
        """Get an item from DynamoDB or local fallback."""
        if not self.available:
            store = self._local_store.get(table_name, {})
            key_val = list(key.values())[0]
            return store.get(key_val)

        try:
            table = self.dynamodb.Table(table_name)
            response = table.get_item(Key=key)
            item = response.get("Item")
            return self._deserialize_item(item) if item else None
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ResourceNotFoundException':
                print(f"⚠️  Table '{table_name}' not found. Checking local store.")
                store = self._local_store.get(table_name, {})
                key_val = list(key.values())[0]
                return store.get(key_val)
            print(f"DynamoDB get_item error: {e}")
            return None
        except Exception as e:
            print(f"DynamoDB get_item unexpected error: {e}")
            return None

    async def scan_table(self, table_name: str, filter_expression=None,
                         expression_values=None, limit: int = 50) -> list:
        """Scan a table with optional filters."""
        if not self.available:
            store = self._local_store.get(table_name, {})
            items = list(store.values())
            return items[:limit]

        try:
            table = self.dynamodb.Table(table_name)
            scan_kwargs = {}

            if filter_expression:
                scan_kwargs["FilterExpression"] = filter_expression
            if expression_values:
                scan_kwargs["ExpressionAttributeValues"] = expression_values

            response = table.scan(**scan_kwargs)
            items = response.get("Items", [])

            # Handle pagination for full scan
            while 'LastEvaluatedKey' in response and len(items) < limit:
                scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
                response = table.scan(**scan_kwargs)
                items.extend(response.get("Items", []))

            # Deserialize and limit
            return [self._deserialize_item(item) for item in items[:limit]]
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ResourceNotFoundException':
                print(f"⚠️  Table '{table_name}' not found. Returning local store data.")
                store = self._local_store.get(table_name, {})
                return list(store.values())[:limit]
            print(f"DynamoDB scan error: {e}")
            return []
        except Exception as e:
            print(f"DynamoDB scan unexpected error: {e}")
            store = self._local_store.get(table_name, {})
            return list(store.values())[:limit]

    async def update_item(self, table_name: str, key: dict,
                          update_expression: str, expression_values: dict) -> bool:
        """Update an item in DynamoDB."""
        if not self.available:
            store = self._local_store.get(table_name, {})
            key_val = list(key.values())[0]
            if key_val in store:
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
