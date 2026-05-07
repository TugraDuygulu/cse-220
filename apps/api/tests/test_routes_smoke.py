"""Smoke tests for controller-routed API endpoints."""

import uuid

import pytest
from django.test import Client

from tests.factories import (
    create_category as _create_category,
    create_restaurant as _create_restaurant,
    create_user as _create_user,
)

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
    not_found_response = client.get("/api/v1/restaurants/nonexistent-slug/")

    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert isinstance(list_payload["data"], list)
    assert list_payload["pagination"]["page"] == 1
    assert list_payload["pagination"]["page_size"] == 20
    assert list_payload["pagination"]["total"] >= len(list_payload["data"])
    assert list_payload["pagination"]["total_pages"] >= 1

    assert not_found_response.status_code == 404
    assert not_found_response.json()["error"]["code"] == "not_found"


def test_restaurants_list_supports_pagination_and_include_fields():
    client = Client()
    owner = _create_user(role="owner", prefix="owner", display_name="Owner")
    category = _create_category(name_prefix="Turkish", description="Turkish cuisine")
    restaurant = _create_restaurant(
        owner=owner,
        categories=[category],
        name_prefix="Bosphorus",
        description="Desc",
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
        assert "has_next" in payload["pagination"]
        assert payload["pagination"]["has_previous"] is False
        assert len(payload["data"]) == 1

        item = payload["data"][0]
        assert set(item.keys()) == {"name", "city"}
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_restaurants_list_supports_explicit_relation_expansion():
    client = Client()
    owner = _create_user(role="owner", prefix="owner-relation", display_name="Owner Relation")
    category = _create_category(
        name_prefix="Relation Category",
        description="Relation expansion category",
    )
    restaurant = _create_restaurant(
        owner=owner,
        categories=[category],
        name_prefix="Relation Test",
        description="Desc",
        city="Istanbul",
        district="Kadikoy",
    )
    restaurant_name = restaurant.name

    try:
        response = client.get(
            "/api/v1/restaurants/?include=name&with=categories&page_size=10"
        )

        assert response.status_code == 200
        matching = [item for item in response.json()["data"] if item.get("name") == restaurant_name]
        assert matching
        assert len(matching[0]["categories"]) == 1
        assert matching[0]["categories"][0]["name"] == category.name
    finally:
        restaurant.delete()
        category.delete()
        owner.delete()


def test_restaurants_list_does_not_expose_owner_fields():
    client = Client()
    owner = _create_user(role="owner", prefix="owner-hidden", display_name="Owner Hidden")
    category = _create_category(name_prefix="Seafood", description="Seafood")
    restaurant = _create_restaurant(
        owner=owner,
        categories=[category],
        name_prefix="Blue Fish",
        description="Desc",
        city="Istanbul",
        district="Kadikoy",
        average_rating="5.00",
        review_count=999999,
    )
    restaurant_name = restaurant.name

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

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_users_route_requires_authentication():
    client = Client()

    me_response = client.get("/api/v1/users/me/")

    assert me_response.status_code == 401
    assert me_response.json()["error"]["code"] == "auth_required"


def test_users_authenticated_smoke():
    client = Client()
    user = _create_user(prefix="route-smoke", display_name="Route Smoke")
    client.force_login(user)

    me_response = client.get("/api/v1/users/me/")

    assert me_response.status_code == 200
    assert me_response.json()["data"]["email"] == user.email
