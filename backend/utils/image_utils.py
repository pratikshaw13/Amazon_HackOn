"""
Image utility functions for processing uploaded images.
"""
import base64
from io import BytesIO
from PIL import Image


def encode_image_to_base64(image_bytes: bytes) -> str:
    """Convert raw image bytes to base64 string."""
    return base64.b64encode(image_bytes).decode("utf-8")


def decode_base64_to_image(base64_string: str) -> bytes:
    """Convert base64 string back to image bytes."""
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    return base64.b64decode(base64_string)


def resize_image(image_bytes: bytes, max_size: tuple = (1024, 1024)) -> bytes:
    """Resize image to max dimensions while preserving aspect ratio."""
    img = Image.open(BytesIO(image_bytes))
    img.thumbnail(max_size, Image.Resampling.LANCZOS)

    output = BytesIO()
    img.save(output, format="JPEG", quality=85)
    return output.getvalue()


def validate_image(image_bytes: bytes, max_size_mb: int = 10) -> tuple:
    """
    Validate image file. Returns (is_valid, error_message).
    """
    # Check file size
    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > max_size_mb:
        return False, f"Image size ({size_mb:.1f}MB) exceeds {max_size_mb}MB limit"

    # Check if it's a valid image
    try:
        img = Image.open(BytesIO(image_bytes))
        img.verify()
        return True, ""
    except Exception:
        return False, "Invalid image file"
