"""Smoke tests for controller-routed API endpoints."""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from restaurants.models import Category, Restaurant

pytestmark = pytest.mark.django_db


def test_health_route_smoke():
    client = Client()
    response = client.get("/api/v1/health/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"


def test_restaurants_routes_smoke():
    client = Client()

    list_response = client.get("/api/v1/restaurants/")
    detail_response = client.get("/api/v1/restaurants/test-place/")

    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert isinstance(list_payload["data"], list)
    assert list_payload["pagination"]["page"] == 1
    assert list_payload["pagination"]["page_size"] == 20
    assert list_payload["pagination"]["total"] >= len(list_payload["data"])
    assert list_payload["pagination"]["total_pages"] >= 1

    assert detail_response.status_code == 200
    assert detail_response.json()["data"]["slug"] == "test-place"


def test_restaurants_list_supports_pagination_and_include_fields():
    client = Client()
    suffix = uuid.uuid4().hex[:8]
    user_model = get_user_model()

    owner = user_model.objects.create_user(
        email=f"owner-{suffix}@example.com",
        username=f"owner-{suffix}",
        password="owner-password-123",
        display_name="Owner",
    )
    category = Category.objects.create(
        name=f"Turkish {suffix}",
        description="Turkish cuisine",
    )
    restaurant = Restaurant.objects.create(
        name=f"Bosphorus {suffix}",
        description="Desc",
        category=category,
        owner=owner,
        address_line1="A",
        city="Istanbul",
        district="Kadikoy",
        average_rating="5.00",
        review_count=999999,
    )

    try:
        response = client.get(
            "/api/v1/restaurants/?page=1&page_size=1&include=name,city"
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["pagination"]["page"] == 1
        assert payload["pagination"]["page_size"] == 1
        assert payload["pagination"]["total"] >= 1
        assert len(payload["data"]) == 1

        item = payload["data"][0]
        assert set(item.keys()) == {"name", "city"}
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_restaurants_list_does_not_expose_owner_fields():
    client = Client()
    suffix = uuid.uuid4().hex[:8]
    user_model = get_user_model()

    owner = user_model.objects.create_user(
        email=f"owner-hidden-{suffix}@example.com",
        username=f"owner-hidden-{suffix}",
        password="owner-password-123",
        display_name="Owner Hidden",
    )
    category = Category.objects.create(
        name=f"Seafood {suffix}",
        description="Seafood",
    )
    restaurant_name = f"Blue Fish {suffix}"
    restaurant = Restaurant.objects.create(
        name=restaurant_name,
        description="Desc",
        category=category,
        owner=owner,
        address_line1="A",
        city="Istanbul",
        district="Kadikoy",
        average_rating="5.00",
        review_count=999999,
    )

    try:
        default_response = client.get("/api/v1/restaurants/?page_size=5")
        assert default_response.status_code == 200
        assert all("owner" not in item for item in default_response.json()["data"])

        response = client.get("/api/v1/restaurants/?include=name,owner&page_size=5")

        assert response.status_code == 200
        items = response.json()["data"]
        matching = [item for item in items if item.get("name") == restaurant_name]
        assert matching
        assert matching[0] == {"name": restaurant_name}
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_reviews_route_smoke():
    client = Client()
    review_id = uuid.uuid4()
    response = client.get(f"/api/v1/reviews/{review_id}/")

    assert response.status_code == 200
    assert response.json()["data"]["id"] == str(review_id)


def test_users_route_requires_authentication():
    client = Client()

    me_response = client.get("/api/v1/users/me/")

    assert me_response.status_code == 302


def test_users_authenticated_smoke():
    client = Client()
    user_model = get_user_model()
    suffix = uuid.uuid4().hex[:8]
    user = user_model.objects.create_user(
        email=f"route-smoke-{suffix}@example.com",
        username=f"route-smoke-{suffix}",
        password="test-password-123",
        display_name="Route Smoke",
    )
    client.force_login(user)

    me_response = client.get("/api/v1/users/me/")

    assert me_response.status_code == 200
    assert me_response.json()["data"]["email"] == user.email
