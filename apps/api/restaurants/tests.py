"""Tests for restaurant endpoints with guards and authentication."""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from restaurants.models import Category, Restaurant
from users.models import UserRole

pytestmark = pytest.mark.django_db


def _create_user(*, role: str = UserRole.USER):
    suffix = uuid.uuid4().hex[:8]
    user_model = get_user_model()
    return user_model.objects.create_user(
        email=f"restaurant-{role}-{suffix}@example.com",
        username=f"restaurant-{role}-{suffix}",
        password="test-password-123",
        display_name=f"{role.title()} {suffix}",
        role=role,
    )


def _create_category():
    suffix = uuid.uuid4().hex[:8]
    return Category.objects.create(
        name=f"Test Category {suffix}",
        description="Category for tests",
    )


def _create_restaurant(owner=None, slug=None):
    if owner is None:
        owner = _create_user(role=UserRole.OWNER)
    category = _create_category()
    suffix = uuid.uuid4().hex[:8]
    return Restaurant.objects.create(
        name=f"Test Restaurant {suffix}",
        slug=slug or f"test-restaurant-{suffix}",
        description="A test restaurant",
        category=category,
        owner=owner,
        address_line1="Test Street 123",
        city="Istanbul",
        district="Besiktas",
        price_range="2",
    )


def test_restaurant_list_no_auth_required():
    """GET /restaurants/ should not require authentication."""
    client = Client()

    response = client.get("/api/v1/restaurants/")

    assert response.status_code == 200
    assert "data" in response.json()


def test_restaurant_detail_no_auth_required():
    """GET /restaurants/{slug}/ should not require authentication."""
    client = Client()
    restaurant = _create_restaurant()

    try:
        response = client.get(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 200
        assert "data" in response.json()
    finally:
        restaurant.delete()
        restaurant.category.delete()
        restaurant.owner.delete()


def test_restaurant_delete_requires_authentication():
    """DELETE /restaurants/{slug}/ requires authentication."""
    client = Client()
    restaurant = _create_restaurant()

    try:
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "auth_required"
    finally:
        restaurant.delete()
        restaurant.category.delete()
        restaurant.owner.delete()


def test_restaurant_delete_requires_admin_role():
    """DELETE /restaurants/{slug}/ requires admin role."""
    client = Client()
    regular_user = _create_user(role=UserRole.USER)
    restaurant = _create_restaurant()

    try:
        client.force_login(regular_user)
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
    finally:
        restaurant.delete()
        restaurant.category.delete()
        restaurant.owner.delete()
        regular_user.delete()


def test_restaurant_delete_success_by_admin():
    """DELETE /restaurants/{slug}/ succeeds for admin user."""
    client = Client()
    admin = _create_user(role=UserRole.ADMIN)
    restaurant = _create_restaurant()

    try:
        client.force_login(admin)
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 204
        assert not Restaurant.objects.filter(slug=restaurant.slug).exists()
    finally:
        admin.delete()


def test_restaurant_delete_not_found():
    """DELETE /restaurants/{slug}/ returns 404 for non-existent slug."""
    client = Client()
    admin = _create_user(role=UserRole.ADMIN)
    client.force_login(admin)

    response = client.delete("/api/v1/restaurants/nonexistent-slug/")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"

    admin.delete()


def test_restaurant_delete_owner_cannot_delete():
    """DELETE /restaurants/{slug}/ fails for owner role."""
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    restaurant = _create_restaurant()

    try:
        client.force_login(owner)
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
    finally:
        restaurant.delete()
        restaurant.category.delete()
        owner.delete()
