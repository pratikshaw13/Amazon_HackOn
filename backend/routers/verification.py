"""
Verification Router — Amazon purchase verification via invoice/screenshot OCR.
Uses Bedrock AI to extract order details from uploaded documents.
"""
import uuid
import base64
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service
from services.bedrock_service import BedrockService
from routers.auth import get_current_user
from utils.image_utils import validate_image, resize_image, encode_image_to_base64

router = APIRouter()
db = DynamoDBService()
s3 = S3Service()
ai = BedrockService()


@router.post("/verification/verify")
async def verify_purchase(
    document: UploadFile = File(...),
    product_id: str = Form(""),
    product_name: str = Form(""),
    user: dict = Depends(get_current_user)
):
    """
    Verify an Amazon purchase using an invoice screenshot, order page, or PDF.
    Uses AI to extract order details and determine authenticity.
    """
    doc_bytes = await document.read()

    # Validate it's an image or PDF
    content_type = document.content_type or ""
    is_image = content_type.startswith("image/")
    is_pdf = content_type == "application/pdf"

    if not is_image and not is_pdf:
        return {"error": "Please upload an image (screenshot) or PDF invoice."}

    # Upload document to S3
    doc_id = str(uuid.uuid4())[:8]
    s3_key = f"verifications/{product_id or doc_id}/{doc_id}.{'pdf' if is_pdf else 'jpg'}"
    if s3.available:
        s3.s3_client.put_object(Bucket=s3.bucket_name, Key=s3_key, Body=doc_bytes, ContentType=content_type)

    # For images, use Bedrock Vision to extract text
    verification_result = {
        "amazon_verified": False,
        "confidence_score": 0.0,
        "verification_reason": "",
        "order_number": None,
        "purchase_date": None,
        "original_price": None,
        "extracted_product_name": None,
    }

    if is_image:
        resized = resize_image(doc_bytes, max_size=(1200, 1200))
        img_b64 = encode_image_to_base64(resized)

        prompt = f"""You are an Amazon purchase verification specialist.
Analyze this image which is either an Amazon order screenshot, invoice, or purchase confirmation.

Extract the following information if visible:
- Order number (e.g., 171-1234567-1234567)
- Product name
- Purchase date
- Price paid
- Whether this appears to be a genuine Amazon order/invoice

Also determine if this document looks authentic (not edited/fabricated).
{f'The seller claims this is for product: {product_name}' if product_name else ''}

Return ONLY valid JSON:
{{"amazon_verified": true/false, "confidence_score": 0.0-1.0, "verification_reason": "<reason>", "order_number": "<number or null>", "purchase_date": "<date or null>", "original_price": <number or null>, "extracted_product_name": "<name or null>"}}"""

        try:
            result_text = ai._converse_with_images(prompt, [img_b64])
            result = ai._parse_json_response(result_text)
            verification_result = {
                "amazon_verified": result.get("amazon_verified", False),
                "confidence_score": float(result.get("confidence_score", 0)),
                "verification_reason": result.get("verification_reason", ""),
                "order_number": result.get("order_number"),
                "purchase_date": result.get("purchase_date"),
                "original_price": result.get("original_price"),
                "extracted_product_name": result.get("extracted_product_name"),
            }
        except Exception as e:
            verification_result["verification_reason"] = f"AI analysis failed: {str(e)[:100]}"
    else:
        # PDF — mark as pending manual review
        verification_result["verification_reason"] = "PDF uploaded. Verification pending AI processing."
        verification_result["confidence_score"] = 0.5

    # Store verification in DynamoDB
    verification_record = {
        "product_id": product_id or doc_id,
        "verification_id": doc_id,
        "user_id": user["user_id"],
        "document_key": s3_key,
        "invoice_type": "pdf" if is_pdf else "screenshot",
        "verified_at": datetime.utcnow().isoformat(),
        **verification_result
    }

    # Update product with verification status if product_id provided
    if product_id:
        product = await db.get_item("sl_products", {"product_id": product_id})
        if product:
            product["amazon_verified"] = verification_result["amazon_verified"]
            product["verification_confidence"] = str(verification_result["confidence_score"])
            product["verification_reason"] = verification_result["verification_reason"]
            await db.put_item("sl_products", product)

        # Also update passport
        passport = await db.get_item("sl_passports", {"product_id": product_id})
        if passport:
            passport["amazon_verified"] = verification_result["amazon_verified"]
            passport["verification_confidence"] = str(verification_result["confidence_score"])
            passport["original_price_verified"] = str(verification_result.get("original_price") or "")
            await db.put_item("sl_passports", passport)

    return {
        "product_id": product_id or doc_id,
        "verification": verification_result,
        "badge": "✓ Amazon Verified Purchase" if verification_result["amazon_verified"] else "⚠ Verification Pending"
    }


@router.get("/verification/{product_id}")
async def get_verification_status(product_id: str):
    """Get verification status for a product."""
    product = await db.get_item("sl_products", {"product_id": product_id})
    if not product:
        return {"amazon_verified": False, "confidence_score": 0}

    return {
        "product_id": product_id,
        "amazon_verified": product.get("amazon_verified", False),
        "confidence_score": float(product.get("verification_confidence", 0)),
        "verification_reason": product.get("verification_reason", ""),
    }
