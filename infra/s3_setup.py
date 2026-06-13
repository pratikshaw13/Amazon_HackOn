"""
S3 Bucket Setup — Creates bucket with CORS policy for SecondLife AI.
Run: python infra/s3_setup.py
"""
import os
import json
import boto3
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")


def setup_s3():
    aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    aws_region = os.getenv("AWS_REGION", "ap-south-1")
    bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "secondlife-ai-products")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if not aws_key or aws_key == "your_aws_access_key":
        print("⚠️  AWS credentials not set. Skipping S3 setup.")
        print("   The app will use local fallback for image storage.")
        return

    s3 = boto3.client(
        "s3",
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret,
        region_name=aws_region
    )

    # Create bucket
    try:
        if aws_region == "us-east-1":
            s3.create_bucket(Bucket=bucket_name)
        else:
            s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": aws_region}
            )
        print(f"  ✅ Created bucket: {bucket_name}")
    except s3.exceptions.BucketAlreadyOwnedByYou:
        print(f"  ✓ Bucket '{bucket_name}' already exists")
    except Exception as e:
        print(f"  ❌ Bucket creation failed: {e}")
        return

    # Set CORS
    cors_config = {
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST"],
                "AllowedOrigins": [frontend_url, "http://localhost:3000"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3600
            }
        ]
    }

    try:
        s3.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_config)
        print("  ✅ CORS policy configured")
    except Exception as e:
        print(f"  ❌ CORS setup failed: {e}")

    # Create folder structure
    folders = ["products/", "passports/", "inspections/"]
    for folder in folders:
        try:
            s3.put_object(Bucket=bucket_name, Key=folder)
            print(f"  ✅ Created folder: {folder}")
        except Exception as e:
            print(f"  ❌ Failed to create {folder}: {e}")

    print("\n✅ S3 setup complete!")


if __name__ == "__main__":
    print("📦 Setting up S3 bucket for SecondLife AI...\n")
    setup_s3()
