"""DTO mappings for restaurant endpoints."""

from api_http import BaseDto, dto_relation


class CategoryDto(BaseDto):
    """Category response DTO."""

    field_map = {
        "id": "id",
        "name": "name",
        "slug": "slug",
        "description": "description",
        "icon_url": "icon_url",
        "sort_order": "sort_order",
    }


class RestaurantDto(BaseDto):
    """Restaurant response DTO."""

    field_map = {
        "id": "id",
        "name": "name",
        "slug": "slug",
        "description": "description",
        "phone": "phone",
        "website": "website",
        "category": "category_id",
        "address_line1": "address_line1",
        "address_line2": "address_line2",
        "city": "city",
        "district": "district",
        "postal_code": "postal_code",
        "latitude": "latitude",
        "longitude": "longitude",
        "price_range": "price_range",
        "average_rating": "average_rating",
        "review_count": "review_count",
        "created_at": "created_at",
        "updated_at": "updated_at",
    }

    relation_map = {
        "category": dto_relation("category", CategoryDto),
    }

    default_with = ("category",)
