"""
S3 Service — Image upload and presigned URL generation.
"""
import os
import uuid
import base64
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()


class S3Service:
    def __init__(self):
        aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")
        aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        aws_region = os.getenv("AWS_REGION", "ap-south-1")
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "secondlife-ai-products")

        if not aws_key or aws_key == "your_aws_access_key":
            print("⚠️  AWS S3 credentials not configured. Using local fallback for image URLs.")
            self.available = False
            self._local_files = {}
            return

        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            region_name=aws_region
        )
        self.available = True

    async def upload_image(self, image_bytes: bytes, product_id: str,
                           content_type: str = "image/jpeg") -> str:
        """Upload an image to S3 and return the URL."""
        file_id = str(uuid.uuid4())[:8]
        key = f"products/{product_id}/{file_id}.jpg"

        if not self.available:
            # Return a placeholder URL for local development
            local_url = f"/api/v1/images/{product_id}/{file_id}.jpg"
            self._local_files[key] = image_bytes
            return local_url

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=image_bytes,
                ContentType=content_type
            )
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{key}"
            return url
        except ClientError as e:
            print(f"S3 upload error: {e}")
            return f"/api/v1/images/{product_id}/{file_id}.jpg"

    async def upload_base64_image(self, base64_data: str, product_id: str) -> str:
        """Upload a base64-encoded image to S3."""
        # Remove data URL prefix if present
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]

        image_bytes = base64.b64decode(base64_data)
        return await self.upload_image(image_bytes, product_id)

    async def get_presigned_url(self, key: str, expiration: int = 3600) -> str:
        """Generate a presigned URL for downloading."""
        if not self.available:
            return f"/api/v1/images/{key}"

        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            print(f"S3 presigned URL error: {e}")
            return ""

    async def delete_image(self, key: str) -> bool:
        """Delete an image from S3."""
        if not self.available:
            self._local_files.pop(key, None)
            return True

        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            print(f"S3 delete error: {e}")
            return False
