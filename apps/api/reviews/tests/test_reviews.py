"""Tests for review CRUD endpoints."""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from restaurants.models import Category, Restaurant
from reviews.models import Review, ReviewLike
from users.models import UserRole

pytestmark = pytest.mark.django_db


def _create_user(*, role: str = UserRole.USER):
    suffix = uuid.uuid4().hex[:8]
    user_model = get_user_model()
    return user_model.objects.create_user(
        email=f"{role}-{suffix}@example.com",
        username=f"{role}-{suffix}",
        password="test-password-123",
        display_name=f"{role.title()} {suffix}",
        role=role,
    )


def _create_category(name_prefix: str = "Category"):
    suffix = uuid.uuid4().hex[:8]
    return Category.objects.create(
        name=f"{name_prefix} {suffix}",
        description="Category for tests",
    )


def _create_restaurant(owner=None):
    category = _create_category("Review Test")
    if owner is None:
        owner = _create_user(role=UserRole.OWNER)
    restaurant = Restaurant.objects.create(
        name=f"Review Test Place {uuid.uuid4().hex[:8]}",
        description="A place for review testing",
        owner=owner,
        address_line1="Street 1",
        city="Istanbul",
        district="Besiktas",
        price_range="2",
    )
    restaurant.categories.set([category])
    return restaurant


def _create_review(
    restaurant=None, user=None, rating=4, content="Good food", parent=None
):
    if restaurant is None:
        restaurant = _create_restaurant()
    if user is None:
        user = _create_user()
    return Review.objects.create(
        restaurant=restaurant,
        user=user,
        rating=rating,
        content=content,
        parent=parent,
    )


def _valid_review_payload():
    return {
        "rating": 4,
        "content": "This is a great restaurant with good food and service.",
    }


# ---- review_detail ----


def test_review_detail_returns_review():
    client = Client()
    review = _create_review()

    response = client.get(f"/api/v1/reviews/{review.id}/")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == str(review.id)
    assert data["rating"] == review.rating
    assert data["content"] == review.content


def test_review_detail_not_found():
    client = Client()
    fake_id = uuid.uuid4()

    response = client.get(f"/api/v1/reviews/{fake_id}/")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


# ---- restaurant_reviews (list) ----


def test_restaurant_reviews_returns_paginated_list():
    client = Client()
    restaurant = _create_restaurant()
    for i in range(3):
        user = _create_user()
        _create_review(restaurant=restaurant, user=user, content=f"Review {i}")

    response = client.get(f"/api/v1/reviews/restaurants/{restaurant.slug}/")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["data"]) == 3
    assert payload["pagination"]["total"] == 3


def test_restaurant_scoped_review_route_returns_thread_contract():
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    restaurant = _create_restaurant(owner=owner)
    reviewer = _create_user()
    commenter = _create_user()
    review = _create_review(
        restaurant=restaurant,
        user=reviewer,
        rating=5,
        content="The lamb was excellent and the staff were attentive.",
    )
    comment = _create_review(
        restaurant=restaurant,
        user=commenter,
        rating=4,
        content="I had a similar experience with the staff.",
        parent=review,
    )
    owner_answer = _create_review(
        restaurant=restaurant,
        user=owner,
        rating=5,
        content="Thank you for visiting. We hope to host you again soon.",
        parent=review,
    )
    ReviewLike.objects.create(review=review, user=commenter, is_like=True)
    ReviewLike.objects.create(review=review, user=owner, is_like=False)

    response = client.get(
        f"/api/v1/restaurants/{restaurant.slug}/reviews/?page=1&page_size=1"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["pagination"] == {
        "page": 1,
        "page_size": 1,
        "total": 1,
        "total_pages": 1,
        "has_next": False,
        "has_previous": False,
    }

    thread = payload["data"][0]
    assert thread["id"] == str(review.id)
    assert thread["parent_id"] is None
    assert thread["is_business_answer"] is False
    assert thread["like_count"] == 1
    assert thread["dislike_count"] == 1
    assert [reply["id"] for reply in thread["replies"]] == [
        str(comment.id),
        str(owner_answer.id),
    ]
    assert thread["replies"][0]["parent_id"] == str(review.id)
    assert thread["replies"][0]["is_business_answer"] is False
    assert thread["replies"][1]["parent_id"] == str(review.id)
    assert thread["replies"][1]["is_business_answer"] is True


def test_restaurant_scoped_review_route_limits_threads_to_one_reply_level():
    client = Client()
    restaurant = _create_restaurant()
    review = _create_review(restaurant=restaurant)
    reply = _create_review(
        restaurant=restaurant,
        content="This is a first-level comment for the review.",
        parent=review,
    )
    _create_review(
        restaurant=restaurant,
        content="This nested reply should not be serialized in the thread.",
        parent=reply,
    )

    response = client.get(f"/api/v1/restaurants/{restaurant.slug}/reviews/")

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert len(data[0]["replies"]) == 1
    assert data[0]["replies"][0]["id"] == str(reply.id)
    assert "replies" not in data[0]["replies"][0]


def test_restaurant_reviews_excludes_replies():
    client = Client()
    restaurant = _create_restaurant()
    user = _create_user()
    parent = _create_review(restaurant=restaurant, user=user)
    _create_review(restaurant=restaurant, user=user, content="Reply", parent=parent)

    response = client.get(f"/api/v1/reviews/restaurants/{restaurant.slug}/")

    assert response.status_code == 200
    assert len(response.json()["data"]) == 1


def test_restaurant_reviews_not_found():
    client = Client()

    response = client.get("/api/v1/reviews/restaurants/nonexistent-slug/")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


# ---- review_create ----


def test_review_create_requires_authentication():
    client = Client()
    restaurant = _create_restaurant()

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data=_valid_review_payload(),
        content_type="application/json",
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth_required"


def test_review_create_validates_rating_required():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={"content": "Some content here for testing"},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_review_create_validates_rating_range():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    for bad_rating in [0, 6, -1, 10]:
        response = client.post(
            f"/api/v1/reviews/restaurants/{restaurant.slug}/",
            data={"rating": bad_rating, "content": "Some content here for testing"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"


def test_review_create_validates_rating_is_integer():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={"rating": "abc", "content": "Some content here for testing"},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_review_create_validates_content_required():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={"rating": 4},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_review_create_validates_content_min_length():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={"rating": 4, "content": "Short"},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_review_create_validates_content_max_length():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={"rating": 4, "content": "x" * 5001},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_review_create_not_found_for_missing_restaurant():
    client = Client()
    user = _create_user()
    client.force_login(user)

    response = client.post(
        "/api/v1/reviews/restaurants/nonexistent-slug/",
        data=_valid_review_payload(),
        content_type="application/json",
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_review_create_success():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data=_valid_review_payload(),
        content_type="application/json",
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["rating"] == 4
    assert "user" in data
    assert data["user"]["display_name"] == user.display_name

    assert Review.objects.count() == 1
    review = Review.objects.first()
    assert review.restaurant_id == restaurant.id
    assert review.user_id == user.id


def test_review_create_updates_restaurant_aggregates():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={"rating": 5, "content": "Excellent food and great service overall."},
        content_type="application/json",
    )

    restaurant.refresh_from_db()
    assert restaurant.review_count == 1
    assert float(restaurant.average_rating) == 5.0


def test_review_create_prevents_duplicate_review():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data=_valid_review_payload(),
        content_type="application/json",
    )

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data=_valid_review_payload(),
        content_type="application/json",
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


def test_review_create_as_reply():
    client = Client()
    owner = _create_user(role=UserRole.OWNER)
    restaurant = _create_restaurant(owner=owner)
    user = _create_user()
    parent = _create_review(restaurant=restaurant, user=user)
    client.force_login(owner)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={
            "rating": 5,
            "content": "Thank you for your feedback. We appreciate your visit.",
            "parent_id": str(parent.id),
        },
        content_type="application/json",
    )

    assert response.status_code == 201
    reply = Review.objects.get(id=response.json()["data"]["id"])
    assert reply.parent_id == parent.id
    assert reply.restaurant_id == restaurant.id


def test_review_create_reply_parent_not_found():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)
    fake_parent_id = uuid.uuid4()

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={
            "rating": 4,
            "content": "Reply to a non-existent review for testing purposes.",
            "parent_id": str(fake_parent_id),
        },
        content_type="application/json",
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_review_create_reply_wrong_restaurant():
    client = Client()
    user = _create_user()
    restaurant1 = _create_restaurant()
    restaurant2 = _create_restaurant()
    parent = _create_review(restaurant=restaurant1, user=user)
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant2.slug}/",
        data={
            "rating": 4,
            "content": "This reply belongs to a different restaurant entirely.",
            "parent_id": str(parent.id),
        },
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_review_create_replies_allowed_for_same_user():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    parent = _create_review(restaurant=restaurant, user=user)
    client.force_login(user)

    response = client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={
            "rating": 5,
            "content": "Replying to my own review for additional details.",
            "parent_id": str(parent.id),
        },
        content_type="application/json",
    )

    assert response.status_code == 201


# ---- review_update ----


def test_review_update_requires_authentication():
    client = Client()
    review = _create_review()

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"rating": 3},
        content_type="application/json",
    )

    assert response.status_code == 401


def test_review_update_requires_authorship():
    client = Client()
    author = _create_user()
    other_user = _create_user()
    review = _create_review(user=author)
    client.force_login(other_user)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"rating": 3},
        content_type="application/json",
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_review_update_not_found():
    client = Client()
    user = _create_user()
    client.force_login(user)
    fake_id = uuid.uuid4()

    response = client.patch(
        f"/api/v1/reviews/{fake_id}/",
        data={"rating": 3},
        content_type="application/json",
    )

    assert response.status_code == 404


def test_review_update_success():
    client = Client()
    user = _create_user()
    review = _create_review(user=user)
    client.force_login(user)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"rating": 2, "content": "Updated review with new experience details."},
        content_type="application/json",
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["rating"] == 2
    assert data["content"] == "Updated review with new experience details."

    review.refresh_from_db()
    assert review.rating == 2


def test_review_update_partial():
    client = Client()
    user = _create_user()
    review = _create_review(
        user=user, rating=4, content="Original content for review testing."
    )
    client.force_login(user)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"rating": 5},
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json()["data"]["rating"] == 5

    review.refresh_from_db()
    assert review.rating == 5
    assert review.content == "Original content for review testing."


def test_review_update_validates_rating_range():
    client = Client()
    user = _create_user()
    review = _create_review(user=user)
    client.force_login(user)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"rating": 0},
        content_type="application/json",
    )

    assert response.status_code == 400


def test_review_update_validates_content_min_length():
    client = Client()
    user = _create_user()
    review = _create_review(user=user)
    client.force_login(user)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"content": "Short"},
        content_type="application/json",
    )

    assert response.status_code == 400


def review_update_validates_empty_content():
    client = Client()
    user = _create_user()
    review = _create_review(user=user)
    client.force_login(user)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"content": "   "},
        content_type="application/json",
    )

    assert response.status_code == 400


def test_review_update_requires_at_least_one_field():
    client = Client()
    user = _create_user()
    review = _create_review(user=user)
    client.force_login(user)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={},
        content_type="application/json",
    )

    assert response.status_code == 400


def test_review_update_by_admin():
    client = Client()
    author = _create_user()
    admin = _create_user(role=UserRole.ADMIN)
    review = _create_review(user=author)
    client.force_login(admin)

    response = client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"content": "Admin edited this review for moderation purposes."},
        content_type="application/json",
    )

    assert response.status_code == 200
    review.refresh_from_db()
    assert review.content == "Admin edited this review for moderation purposes."


def test_review_update_updates_aggregates():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    client.force_login(user)

    client.post(
        f"/api/v1/reviews/restaurants/{restaurant.slug}/",
        data={"rating": 4, "content": "Initial review for aggregate testing purposes."},
        content_type="application/json",
    )

    restaurant.refresh_from_db()
    assert restaurant.review_count == 1
    assert float(restaurant.average_rating) == 4.0

    review = Review.objects.first()
    client.patch(
        f"/api/v1/reviews/{review.id}/",
        data={"rating": 2},
        content_type="application/json",
    )

    restaurant.refresh_from_db()
    assert restaurant.review_count == 1
    assert float(restaurant.average_rating) == 2.0


# ---- review_delete ----


def test_review_delete_requires_authentication():
    client = Client()
    review = _create_review()

    response = client.delete(f"/api/v1/reviews/{review.id}/")

    assert response.status_code == 401


def test_review_delete_requires_authorship():
    client = Client()
    author = _create_user()
    other_user = _create_user()
    review = _create_review(user=author)
    client.force_login(other_user)

    response = client.delete(f"/api/v1/reviews/{review.id}/")

    assert response.status_code == 403


def test_review_delete_not_found():
    client = Client()
    user = _create_user()
    client.force_login(user)
    fake_id = uuid.uuid4()

    response = client.delete(f"/api/v1/reviews/{fake_id}/")

    assert response.status_code == 404


def test_review_delete_by_author():
    client = Client()
    user = _create_user()
    review = _create_review(user=user)
    client.force_login(user)

    response = client.delete(f"/api/v1/reviews/{review.id}/")

    assert response.status_code == 204
    assert not Review.objects.filter(id=review.id).exists()


def test_review_delete_by_admin():
    client = Client()
    author = _create_user()
    admin = _create_user(role=UserRole.ADMIN)
    review = _create_review(user=author)
    client.force_login(admin)

    response = client.delete(f"/api/v1/reviews/{review.id}/")

    assert response.status_code == 204
    assert not Review.objects.filter(id=review.id).exists()


def test_review_delete_updates_aggregates():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    review = _create_review(restaurant=restaurant, user=user)
    client.force_login(user)

    client.delete(f"/api/v1/reviews/{review.id}/")

    restaurant.refresh_from_db()
    assert restaurant.review_count == 0
    assert float(restaurant.average_rating) == 0


def test_review_delete_cascades_replies_and_reactions():
    client = Client()
    user = _create_user()
    restaurant = _create_restaurant()
    review = _create_review(restaurant=restaurant, user=user)
    reply = _create_review(restaurant=restaurant, user=user, parent=review)
    liker = _create_user()
    ReviewLike.objects.create(review=review, user=liker, is_like=True)

    client.force_login(user)
    response = client.delete(f"/api/v1/reviews/{review.id}/")

    assert response.status_code == 204
    assert not Review.objects.filter(id=review.id).exists()
    assert not Review.objects.filter(id=reply.id).exists()
    assert not ReviewLike.objects.filter(review=review).exists()


# ---- review like/unlike ----


def test_review_like_requires_authentication():
    client = Client()
    review = _create_review()

    response = client.post(f"/api/v1/reviews/{review.id}/like/")

    assert response.status_code == 401


def test_review_like_not_found():
    client = Client()
    user = _create_user()
    client.force_login(user)
    fake_id = uuid.uuid4()

    response = client.post(f"/api/v1/reviews/{fake_id}/like/")

    assert response.status_code == 404


def test_review_like_success():
    client = Client()
    user = _create_user()
    review = _create_review()
    client.force_login(user)

    response = client.post(f"/api/v1/reviews/{review.id}/like/")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["like_count"] == 1
    assert data["user_reaction"] == "like"

    assert ReviewLike.objects.filter(review=review, user=user, is_like=True).exists()


def test_review_like_toggles_existing():
    client = Client()
    user = _create_user()
    review = _create_review()
    ReviewLike.objects.create(review=review, user=user, is_like=True)
    client.force_login(user)

    response = client.post(f"/api/v1/reviews/{review.id}/like/")

    assert response.status_code == 200
    assert response.json()["data"]["like_count"] == 1


def test_review_unlike_requires_authentication():
    client = Client()
    review = _create_review()

    response = client.delete(f"/api/v1/reviews/{review.id}/like/")

    assert response.status_code == 401


def test_review_unlike_not_found():
    client = Client()
    user = _create_user()
    client.force_login(user)
    fake_id = uuid.uuid4()

    response = client.delete(f"/api/v1/reviews/{fake_id}/like/")

    assert response.status_code == 404


def test_review_unlike_success():
    client = Client()
    user = _create_user()
    review = _create_review()
    ReviewLike.objects.create(review=review, user=user, is_like=True)
    client.force_login(user)

    response = client.delete(f"/api/v1/reviews/{review.id}/like/")

    assert response.status_code == 200
    assert response.json()["data"]["like_count"] == 0
    assert response.json()["data"]["user_reaction"] is None


def test_review_dislike_requires_authentication():
    client = Client()
    review = _create_review()

    response = client.post(f"/api/v1/reviews/{review.id}/dislike/")

    assert response.status_code == 401


def test_review_dislike_success():
    client = Client()
    user = _create_user()
    review = _create_review()
    client.force_login(user)

    response = client.post(f"/api/v1/reviews/{review.id}/dislike/")

    assert response.status_code == 200
    assert response.json()["data"]["dislike_count"] == 1
    assert response.json()["data"]["user_reaction"] == "dislike"


def test_review_undislike_requires_authentication():
    client = Client()
    review = _create_review()

    response = client.delete(f"/api/v1/reviews/{review.id}/dislike/")

    assert response.status_code == 401


def test_review_undislike_success():
    client = Client()
    user = _create_user()
    review = _create_review()
    ReviewLike.objects.create(review=review, user=user, is_like=False)
    client.force_login(user)

    response = client.delete(f"/api/v1/reviews/{review.id}/dislike/")

    assert response.status_code == 200
    assert response.json()["data"]["dislike_count"] == 0
    assert response.json()["data"]["user_reaction"] is None


def test_review_like_replaces_dislike():
    client = Client()
    user = _create_user()
    review = _create_review()
    ReviewLike.objects.create(review=review, user=user, is_like=False)
    client.force_login(user)

    response = client.post(f"/api/v1/reviews/{review.id}/like/")

    assert response.status_code == 200
    assert response.json()["data"]["like_count"] == 1
    assert response.json()["data"]["dislike_count"] == 0
    assert response.json()["data"]["user_reaction"] == "like"


def test_review_dislike_replaces_like():
    client = Client()
    user = _create_user()
    review = _create_review()
    ReviewLike.objects.create(review=review, user=user, is_like=True)
    client.force_login(user)

    response = client.post(f"/api/v1/reviews/{review.id}/dislike/")

    assert response.status_code == 200
    assert response.json()["data"]["like_count"] == 0
    assert response.json()["data"]["dislike_count"] == 1
    assert response.json()["data"]["user_reaction"] == "dislike"
