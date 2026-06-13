"""
S3 Service — Image upload, presigned URL generation, and bucket setup.
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
        self.aws_region = os.getenv("AWS_REGION", "ap-south-1")
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "secondlife-ai-products")

        if not aws_key or aws_key == "your_aws_access_key":
            print("⚠️  AWS S3 credentials not configured. Using local fallback for image URLs.")
            self.available = False
            self._local_files = {}
            return

        try:
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
                region_name=self.aws_region
            )
            # Verify bucket exists
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            self.available = True
            print(f"✅ S3 connected: bucket '{self.bucket_name}'")

            # Ensure CORS is configured
            self._setup_cors()
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404' or error_code == 'NoSuchBucket':
                print(f"⚠️  S3 bucket '{self.bucket_name}' not found. Creating it...")
                self._create_bucket()
            elif error_code == '403':
                print(f"⚠️  Access denied to bucket '{self.bucket_name}'. Check IAM permissions.")
                self.available = False
                self._local_files = {}
            else:
                print(f"⚠️  S3 connection error: {e}. Using local fallback.")
                self.available = False
                self._local_files = {}
        except Exception as e:
            print(f"⚠️  S3 init error: {e}. Using local fallback.")
            self.available = False
            self._local_files = {}

    def _create_bucket(self):
        """Create the S3 bucket if it doesn't exist."""
        try:
            if self.aws_region == "us-east-1":
                self.s3_client.create_bucket(Bucket=self.bucket_name)
            else:
                self.s3_client.create_bucket(
                    Bucket=self.bucket_name,
                    CreateBucketConfiguration={"LocationConstraint": self.aws_region}
                )
            self.available = True
            print(f"✅ Created S3 bucket: '{self.bucket_name}'")
            self._setup_cors()
        except Exception as e:
            print(f"❌ Failed to create bucket: {e}")
            self.available = False
            self._local_files = {}

    def _setup_cors(self):
        """Set CORS policy on the bucket for frontend access."""
        try:
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            self.s3_client.put_bucket_cors(
                Bucket=self.bucket_name,
                CORSConfiguration={
                    "CORSRules": [
                        {
                            "AllowedHeaders": ["*"],
                            "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
                            "AllowedOrigins": [frontend_url, "http://localhost:3000", "*"],
                            "ExposeHeaders": ["ETag"],
                            "MaxAgeSeconds": 3600
                        }
                    ]
                }
            )
        except Exception as e:
            # Non-fatal — CORS might already be set
            pass

    async def upload_image(self, image_bytes: bytes, product_id: str,
                           content_type: str = "image/jpeg") -> str:
        """Upload an image to S3 and return a publicly accessible URL."""
        file_id = str(uuid.uuid4())[:8]
        key = f"products/{product_id}/{file_id}.jpg"

        if not self.available:
            local_url = f"/api/v1/images/{product_id}/{file_id}.jpg"
            self._local_files = getattr(self, '_local_files', {})
            self._local_files[key] = image_bytes
            return local_url

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=image_bytes,
                ContentType=content_type,
            )

            # Generate a presigned URL (valid for 7 days)
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=604800  # 7 days
            )
            print(f"✅ Uploaded to S3: {key}")
            return url
        except ClientError as e:
            print(f"S3 upload error: {e}")
            return f"/api/v1/images/{product_id}/{file_id}.jpg"

    async def upload_base64_image(self, base64_data: str, product_id: str) -> str:
        """Upload a base64-encoded image to S3."""
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
            self._local_files = getattr(self, '_local_files', {})
            self._local_files.pop(key, None)
            return True

        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            print(f"S3 delete error: {e}")
            return False
