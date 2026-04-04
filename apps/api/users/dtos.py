"""DTO mappings for user endpoints."""

from api_http import BaseDto


class UserDto(BaseDto):
    """Public user response DTO."""

    field_map = {
        "id": "id",
        "email": "email",
        "username": "username",
        "display_name": "display_name",
        "bio": "bio",
        "avatar_url": "avatar_url",
        "role": "role",
        "created_at": "created_at",
        "updated_at": "updated_at",
    }

    default_include = (
        "id",
        "email",
        "username",
        "display_name",
        "bio",
        "avatar_url",
        "role",
        "created_at",
        "updated_at",
    )
