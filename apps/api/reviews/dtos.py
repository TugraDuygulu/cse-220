"""DTO mappings for review endpoints."""

from api_http import BaseDto, dto_relation
from restaurants.dtos import RestaurantDto
from users.dtos import UserDto


class ReviewDto(BaseDto):
    """Review response DTO."""

    field_map = {
        "id": "id",
        "restaurant": "restaurant_id",
        "user": "user_id",
        "parent": "parent_id",
        "rating": "rating",
        "content": "content",
        "like_count": "like_count",
        "dislike_count": "dislike_count",
        "created_at": "created_at",
        "updated_at": "updated_at",
    }

    relation_map = {
        "restaurant": dto_relation("restaurant", RestaurantDto),
        "user": dto_relation("user", UserDto),
    }
