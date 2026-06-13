# from services.dynamodb_service import get_all_listings

# print(get_all_listings())

from services.dynamodb_service import create_listing, get_all_listings

create_listing({
    "listingId": "TEST001",
    "productName": "Dell Monitor",
    "category": "Electronics",
    "price": 12000,
    "grade": "Excellent"
})

print(get_all_listings())