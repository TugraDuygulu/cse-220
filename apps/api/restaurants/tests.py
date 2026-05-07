"""Tests for restaurant endpoints with guards and authentication."""

import pytest
from django.test import Client
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from django.test.utils import override_settings

from restaurants.models import MenuItem, Restaurant
from users.models import UserRole
from tests.factories import (
    create_category as _create_category,
    create_image_upload as _image_upload,
    create_restaurant as _create_restaurant,
    create_user as _create_user,
)

pytestmark = pytest.mark.django_db


def test_restaurant_create_accepts_primary_photo_upload(tmp_path):
    """POST /restaurants/ supports multipart restaurant photo uploads."""
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    category = _create_category()

    with override_settings(
        FILE_STORAGE_LOCAL_ROOT=str(tmp_path),
        FILE_STORAGE_LOCAL_URL="/media/",
    ):
        try:
            client.force_login(owner)
            response = client.generic(
                "POST",
                "/api/v1/restaurants/",
                data=encode_multipart(
                    BOUNDARY,
                    {
                        "name": "Ada Bistro",
                        "category_ids": [str(category.id)],
                        "description": "Seasonal plates",
                        "address_line1": "Main Street 1",
                        "city": "Istanbul",
                        "district": "Kadikoy",
                        "phone": "+90 555 0101",
                        "website": "https://ada.example.com",
                        "price_range": "2",
                        "primary_photo": _image_upload(),
                    },
                ),
                content_type=MULTIPART_CONTENT,
            )

            assert response.status_code == 201
            created = response.json()["data"]
            assert created["primary_photo_url"].startswith("/api/v1/files/")

            restaurant = Restaurant.objects.get(slug=created["slug"])
            assert restaurant.primary_photo_id is not None
        finally:
            owner.delete()
            category.delete()


def test_restaurant_update_replaces_primary_photo(tmp_path):
    """PATCH /restaurants/{slug}/ replaces the primary photo via multipart upload."""
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    restaurant = _create_restaurant(owner=owner)
    category = restaurant.categories.first()

    with override_settings(
        FILE_STORAGE_LOCAL_ROOT=str(tmp_path),
        FILE_STORAGE_LOCAL_URL="/media/",
    ):
        try:
            client.force_login(owner)
            create_response = client.generic(
                "PATCH",
                f"/api/v1/restaurants/{restaurant.slug}/",
                data=encode_multipart(
                    BOUNDARY,
                    {
                        "category_ids": [str(category.id)],
                        "primary_photo": _image_upload("restaurant-photo-1.png"),
                    },
                ),
                content_type=MULTIPART_CONTENT,
            )

            assert create_response.status_code == 200
            first_photo_url = create_response.json()["data"]["primary_photo_url"]
            assert first_photo_url.startswith("/api/v1/files/")

            update_response = client.generic(
                "PATCH",
                f"/api/v1/restaurants/{restaurant.slug}/",
                data=encode_multipart(
                    BOUNDARY,
                    {
                        "category_ids": [str(category.id)],
                        "primary_photo": _image_upload("restaurant-photo-2.png"),
                    },
                ),
                content_type=MULTIPART_CONTENT,
            )

            assert update_response.status_code == 200
            updated = update_response.json()["data"]
            assert updated["primary_photo_url"].startswith("/api/v1/files/")
            assert updated["primary_photo_url"] != first_photo_url
        finally:
            restaurant.delete()
            category.delete()
            owner.delete()

def test_restaurant_list_no_auth_required():
    """GET /restaurants/ should not require authentication."""
    client = Client()

    response = client.get("/api/v1/restaurants/")

    assert response.status_code == 200
    assert "data" in response.json()


def test_category_list_no_auth_required():
    """GET /categories/ returns categories for restaurant creation forms."""
    client = Client()
    first = _create_category()
    second = _create_category()

    try:
        response = client.get("/api/v1/categories/")

        assert response.status_code == 200
        names = [item["name"] for item in response.json()["data"]]
        assert first.name in names
        assert second.name in names
    finally:
        first.delete()
        second.delete()


def test_restaurant_mine_requires_owner_role():
    """GET /restaurants/mine/ is only for restaurant owners."""
    client = Client()
    user = _create_user(role=UserRole.USER)

    try:
        client.force_login(user)
        response = client.get("/api/v1/restaurants/mine/")

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
    finally:
        user.delete()


def test_restaurant_mine_returns_only_owned_restaurants():
    """Owners can fetch only their own restaurants for the dashboard."""
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    other_owner = _create_user(role=UserRole.OWNER)
    owned = _create_restaurant(owner=owner)
    other = _create_restaurant(owner=other_owner)

    try:
        client.force_login(owner)
        response = client.get("/api/v1/restaurants/mine/")

        assert response.status_code == 200
        payload = response.json()
        slugs = [item["slug"] for item in payload["data"]]
        assert owned.slug in slugs
        assert other.slug not in slugs
    finally:
        owned_category = owned.categories.first()
        other_category = other.categories.first()
        owned.delete()
        other.delete()
        owned_category.delete()
        other_category.delete()
        owner.delete()
        other_owner.delete()


def test_restaurant_detail_no_auth_required():
    """GET /restaurants/{slug}/ should not require authentication."""
    client = Client()
    restaurant = _create_restaurant()
    category = restaurant.categories.first()
    owner = restaurant.owner

    try:
        response = client.get(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 200
        assert "data" in response.json()
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_restaurant_delete_requires_authentication():
    """DELETE /restaurants/{slug}/ requires authentication."""
    client = Client()
    restaurant = _create_restaurant()
    category = restaurant.categories.first()
    owner = restaurant.owner

    try:
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "auth_required"
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_restaurant_delete_requires_admin_role():
    """DELETE /restaurants/{slug}/ requires admin role."""
    client = Client()
    regular_user = _create_user(role=UserRole.USER)
    restaurant = _create_restaurant()
    category = restaurant.categories.first()
    owner = restaurant.owner

    try:
        client.force_login(regular_user)
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()
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


def test_restaurant_delete_session_auth_requires_csrf_when_enforced():
    """Session-authenticated unsafe requests still enforce CSRF protection."""
    client = Client(enforce_csrf_checks=True)
    admin = _create_user(role=UserRole.ADMIN)
    restaurant = _create_restaurant()
    category = restaurant.categories.first()

    try:
        client.force_login(admin)
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
        assert "CSRF" in response.json()["error"]["message"]
        assert Restaurant.objects.filter(slug=restaurant.slug).exists()
    finally:
        restaurant.delete()
        category.delete()
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
    category = restaurant.categories.first()

    try:
        client.force_login(owner)
        response = client.delete(f"/api/v1/restaurants/{restaurant.slug}/")

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_menu_item_list_no_auth_required():
    """GET /restaurants/{slug}/menu-items/ exposes menu items for a restaurant."""
    client = Client()
    restaurant = _create_restaurant()
    category = restaurant.categories.first()
    owner = restaurant.owner
    menu_item = MenuItem.objects.create(
        restaurant=restaurant,
        name="Test Burger",
        description="A test menu item",
        category=category,
        price="12.50",
        currency="EUR",
        is_available=True,
    )

    try:
        response = client.get(f"/api/v1/restaurants/{restaurant.slug}/menu-items/")

        assert response.status_code == 200
        payload = response.json()
        assert payload["data"][0]["id"] == str(menu_item.id)
        assert payload["data"][0]["name"] == "Test Burger"
        assert payload["data"][0]["category"]["id"] == str(category.id)
        assert payload["data"][0]["price"] == "12.50"
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_menu_item_create_requires_authentication():
    """POST /restaurants/{slug}/menu-items/ requires a logged-in user."""
    client = Client()
    restaurant = _create_restaurant()
    category = restaurant.categories.first()
    owner = restaurant.owner

    try:
        response = client.post(
            f"/api/v1/restaurants/{restaurant.slug}/menu-items/",
            data={
                "name": "Soup",
                "category_id": str(category.id),
                "price": "7.00",
                "currency": "EUR",
                "is_available": True,
            },
            content_type="application/json",
        )

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "auth_required"
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_menu_item_create_update_delete_by_restaurant_owner():
    """Restaurant owners can create, update, and delete their own menu items."""
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    restaurant = _create_restaurant(owner=owner)
    category = restaurant.categories.first()

    try:
        client.force_login(owner)
        create_response = client.post(
            f"/api/v1/restaurants/{restaurant.slug}/menu-items/",
            data={
                "name": "Lentil Soup",
                "description": "Warm starter",
                "category_id": str(category.id),
                "price": "6.50",
                "currency": "EUR",
                "is_available": True,
            },
            content_type="application/json",
        )

        assert create_response.status_code == 201
        created = create_response.json()["data"]
        assert created["name"] == "Lentil Soup"
        assert created["category"]["id"] == str(category.id)

        menu_item_id = created["id"]
        patch_response = client.patch(
            f"/api/v1/restaurants/{restaurant.slug}/menu-items/{menu_item_id}/",
            data={"price": "7.25", "is_available": False},
            content_type="application/json",
        )

        assert patch_response.status_code == 200
        patched = patch_response.json()["data"]
        assert patched["price"] == "7.25"
        assert patched["is_available"] is False

        delete_response = client.delete(
            f"/api/v1/restaurants/{restaurant.slug}/menu-items/{menu_item_id}/"
        )

        assert delete_response.status_code == 204
        assert not MenuItem.objects.filter(id=menu_item_id).exists()
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_menu_item_create_for_other_owner_forbidden():
    """Owners cannot manage another owner's restaurant menu."""
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    other_owner = _create_user(role=UserRole.OWNER)
    restaurant = _create_restaurant(owner=owner)
    category = restaurant.categories.first()

    try:
        client.force_login(other_owner)
        response = client.post(
            f"/api/v1/restaurants/{restaurant.slug}/menu-items/",
            data={
                "name": "Soup",
                "category_id": str(category.id),
                "price": "7.00",
                "currency": "EUR",
                "is_available": True,
            },
            content_type="application/json",
        )

        assert response.status_code == 403
        assert response.json()["error"]["code"] == "forbidden"
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()
        other_owner.delete()


def test_menu_item_detail_is_scoped_to_restaurant():
    """Menu item detail routes should not leak items from a different restaurant."""
    client = Client()
    first_restaurant = _create_restaurant()
    second_restaurant = _create_restaurant()
    menu_item = MenuItem.objects.create(
        restaurant=first_restaurant,
        name="Only First Restaurant",
        category=first_restaurant.categories.first(),
        price="10.00",
        currency="EUR",
        is_available=True,
    )

    try:
        response = client.get(
            f"/api/v1/restaurants/{second_restaurant.slug}/menu-items/{menu_item.id}/"
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"
    finally:
        first_owner = first_restaurant.owner
        second_owner = second_restaurant.owner
        first_category = first_restaurant.categories.first()
        second_category = second_restaurant.categories.first()
        first_restaurant.delete()
        second_restaurant.delete()
        first_category.delete()
        second_category.delete()
        first_owner.delete()
        second_owner.delete()
