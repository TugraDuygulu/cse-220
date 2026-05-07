"""Tests for review reply endpoints."""

import uuid

import pytest
from django.test import Client

from reviews.models import Review
from users.models import UserRole
from tests.factories import create_category, create_review, create_restaurant, create_user

pytestmark = pytest.mark.django_db


def test_reply_requires_authentication():
    """POST /reviews/<id>/replies/ must reject anonymous users."""
    client = Client()
    owner = create_user(role=UserRole.OWNER, prefix="reply-owner")
    category = create_category(name_prefix="Reply Cat")
    restaurant = create_restaurant(owner=owner, categories=[category], name_prefix="Restaurant")
    reviewer = create_user(prefix="reply-reviewer")
    review = create_review(restaurant=restaurant, user=reviewer, content="Great place to eat here")

    try:
        response = client.post(
            f"/api/v1/reviews/{review.id}/replies/",
            data={"rating": 5, "content": "Thank you for your kind words!"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "auth_required"
    finally:
        review.delete()
        restaurant.delete()
        category.delete()
        reviewer.delete()
        owner.delete()


def test_reply_created_successfully():
    """Authenticated user can reply to a top-level review."""
    client = Client()
    owner = create_user(role=UserRole.OWNER, prefix="reply-owner")
    category = create_category(name_prefix="Reply Cat")
    restaurant = create_restaurant(owner=owner, categories=[category], name_prefix="Restaurant")
    reviewer = create_user(prefix="reply-reviewer")
    review = create_review(restaurant=restaurant, user=reviewer, content="Great place to eat here")
    replier = create_user(prefix="reply-replier")

    try:
        client.force_login(replier)
        response = client.post(
            f"/api/v1/reviews/{review.id}/replies/",
            data={"rating": 5, "content": "Thank you for your kind words!"},
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["parent_id"] == str(review.id)
        assert data["content"] == "Thank you for your kind words!"
    finally:
        Review.objects.filter(restaurant=restaurant).delete()
        restaurant.delete()
        category.delete()
        reviewer.delete()
        replier.delete()
        owner.delete()


def test_reply_to_reply_is_rejected():
    """Replying to a reply must return 400 — only one level allowed."""
    client = Client()
    owner = create_user(role=UserRole.OWNER, prefix="reply-owner")
    category = create_category(name_prefix="Reply Cat")
    restaurant = create_restaurant(owner=owner, categories=[category], name_prefix="Restaurant")
    reviewer = create_user(prefix="reply-reviewer")
    review = create_review(restaurant=restaurant, user=reviewer, content="Great place to eat here")
    replier = create_user(prefix="reply-replier")
    # Create a first reply directly in DB
    first_reply = Review.objects.create(
        restaurant=restaurant,
        user=replier,
        rating=5,
        content="This is already a reply.",
        parent=review,
    )
    deep_replier = create_user(prefix="reply-deep")

    try:
        client.force_login(deep_replier)
        response = client.post(
            f"/api/v1/reviews/{first_reply.id}/replies/",
            data={"rating": 3, "content": "Trying to reply to a reply here."},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"
    finally:
        Review.objects.filter(restaurant=restaurant).delete()
        restaurant.delete()
        category.delete()
        reviewer.delete()
        replier.delete()
        deep_replier.delete()
        owner.delete()


def test_replies_appear_nested_in_review_list():
    """Replies show up inline under their parent when listing restaurant reviews."""
    client = Client()
    owner = create_user(role=UserRole.OWNER, prefix="reply-owner")
    category = create_category(name_prefix="Reply Cat")
    restaurant = create_restaurant(owner=owner, categories=[category], name_prefix="Restaurant")
    reviewer = create_user(prefix="reply-reviewer")
    review = create_review(restaurant=restaurant, user=reviewer, content="Great place to eat here")
    replier = create_user(prefix="reply-replier")
    Review.objects.create(
        restaurant=restaurant,
        user=replier,
        rating=5,
        content="Thanks for the great review!",
        parent=review,
    )

    try:
        response = client.get(f"/api/v1/reviews/restaurants/{restaurant.slug}/")
        assert response.status_code == 200
        reviews = response.json()["data"]
        parent = next(r for r in reviews if r["id"] == str(review.id))
        assert len(parent["replies"]) == 1
        assert parent["replies"][0]["parent_id"] == str(review.id)
    finally:
        Review.objects.filter(restaurant=restaurant).delete()
        restaurant.delete()
        category.delete()
        reviewer.delete()
        replier.delete()
        owner.delete()


def test_reply_to_nonexistent_review_returns_404():
    """POST /reviews/<random-id>/replies/ returns 404 for unknown review."""
    client = Client()
    user = create_user(prefix="reply-user")

    try:
        client.force_login(user)
        response = client.post(
            f"/api/v1/reviews/{uuid.uuid4()}/replies/",
            data={"rating": 4, "content": "This review does not exist."},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"
    finally:
        user.delete()
