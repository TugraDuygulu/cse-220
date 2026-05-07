"""Shared test factories for the API app."""

from __future__ import annotations

import io
import uuid

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from restaurants.models import Category, Restaurant
from reviews.models import Review
from users.models import UserRole

DEFAULT_PASSWORD = "test-password-123"


def create_user(*, role: str = UserRole.USER, prefix: str = "user", display_name: str | None = None):
    """Create a user with a unique email, username, and password."""

    suffix = uuid.uuid4().hex[:8]
    user_model = get_user_model()
    return user_model.objects.create_user(
        email=f"{prefix}-{role}-{suffix}@example.com",
        username=f"{prefix}-{role}-{suffix}",
        password=DEFAULT_PASSWORD,
        display_name=display_name or f"{role.title()} {suffix}",
        role=role,
    )


def create_category(*, name_prefix: str = "Category", description: str = "Category for tests"):
    """Create a category with a unique name."""

    suffix = uuid.uuid4().hex[:8]
    return Category.objects.create(
        name=f"{name_prefix} {suffix}",
        description=description,
    )


def create_restaurant(
    *,
    owner=None,
    slug: str | None = None,
    name_prefix: str = "Restaurant",
    description: str = "A test restaurant",
    city: str = "Istanbul",
    district: str = "Besiktas",
    price_range: str = "2",
    average_rating: str | int | float | None = None,
    review_count: int | None = None,
    categories: list[Category] | tuple[Category, ...] | None = None,
):
    """Create a restaurant and optionally attach categories."""

    if owner is None:
        owner = create_user(role=UserRole.OWNER, prefix="owner")

    restaurant_data = {
        "name": f"{name_prefix} {uuid.uuid4().hex[:8]}",
        "description": description,
        "owner": owner,
        "address_line1": "Test Street 123",
        "city": city,
        "district": district,
        "price_range": price_range,
        "average_rating": average_rating if average_rating is not None else 0,
        "review_count": review_count if review_count is not None else 0,
    }
    if slug is not None:
        restaurant_data["slug"] = slug

    restaurant = Restaurant.objects.create(**restaurant_data)
    if categories is None:
        categories = [create_category()]
    restaurant.categories.set(categories)
    return restaurant


def create_review(
    *,
    restaurant: Restaurant | None = None,
    user=None,
    rating: int = 4,
    content: str = "Good food",
    parent: Review | None = None,
):
    """Create a review attached to a restaurant."""

    if restaurant is None:
        restaurant = create_restaurant()
    if user is None:
        user = create_user()
    return Review.objects.create(
        restaurant=restaurant,
        user=user,
        rating=rating,
        content=content,
        parent=parent,
    )


def create_image_upload(
    name: str = "restaurant-photo.png",
    format_name: str = "PNG",
):
    """Build an in-memory image upload for multipart tests."""

    buffer = io.BytesIO()
    Image.new("RGB", (320, 240), color=(24, 48, 72)).save(buffer, format=format_name)
    buffer.seek(0)
    content_type = "image/png" if format_name == "PNG" else "image/jpeg"
    return SimpleUploadedFile(name, buffer.read(), content_type=content_type)
