"""Review application services."""

from django.db import IntegrityError, transaction

from api.exceptions import ApiError
from reviews.repositories import ReviewRepository
from users.models import UserRole


class ReviewService:
    """Coordinates review endpoint behavior."""

    repository_class = ReviewRepository

    def __init__(self, repository: ReviewRepository | None = None) -> None:
        self.repository = repository or self.repository_class()

    def get_review(self, review_id):
        review = self.repository.get_review(review_id)
        if review is None:
            raise ApiError(status_code=404, code="not_found", detail="Review not found.")
        return review

    def get_restaurant(self, restaurant_slug: str):
        restaurant = self.repository.get_restaurant(restaurant_slug)
        if restaurant is None:
            raise ApiError(status_code=404, code="not_found", detail="Restaurant not found.")
        return restaurant

    def list_restaurant_reviews(self, restaurant):
        return self.repository.list_restaurant_reviews(restaurant)

    def create_review(self, *, restaurant, user, data: dict):
        parent = None
        parent_id = data.get("parent_id")
        if parent_id is not None:
            parent = self.repository.get_parent_review(parent_id)
            if parent is None:
                raise ApiError(status_code=404, code="not_found", detail="Parent review not found.")
            if parent.restaurant_id != restaurant.id:
                raise ApiError(
                    status_code=400,
                    code="validation_error",
                    detail="Parent review belongs to a different restaurant.",
                )
            if parent.parent_id is not None :
                raise ApiError(
                    status_code=400,
                    code="validation_error",
                    detail="Replies to replies are not allowed.",
                )   

        try:
            with transaction.atomic():
                review = self.repository.create_review(
                    restaurant=restaurant,
                    user=user,
                    rating=data["rating"],
                    content=data["content"],
                    parent=parent,
                )
                if parent is None:
                    self.repository.update_restaurant_aggregates(restaurant)
        except IntegrityError as exc:
            raise ApiError(
                status_code=409,
                code="conflict",
                detail="You have already reviewed this restaurant.",
            ) from exc
        return review

    def update_review(self, *, user, review, data: dict):
        if review.user_id != user.id and user.role != UserRole.ADMIN:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You can only edit your own reviews.",
            )
        review = self.repository.save_review(review, data)
        if review.parent is None:
            self.repository.update_restaurant_aggregates(review.restaurant)
        return review

    def delete_review(self, *, user, review) -> None:
        if review.user_id != user.id and user.role != UserRole.ADMIN:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You can only delete your own reviews.",
            )
        restaurant = review.restaurant
        with transaction.atomic():
            self.repository.delete_review(review)
            self.repository.update_restaurant_aggregates(restaurant)

    def set_reaction(self, *, user, review, is_like: bool) -> dict[str, object]:
        self.repository.set_reaction(review=review, user=user, is_like=is_like)
        self.repository.update_reaction_counts(review)
        return self._reaction_payload(review, "like" if is_like else "dislike")

    def delete_reaction(self, *, user, review, is_like: bool) -> dict[str, object]:
        self.repository.delete_reaction(review=review, user=user, is_like=is_like)
        self.repository.update_reaction_counts(review)
        return self._reaction_payload(review, None)

    def _reaction_payload(self, review, user_reaction: str | None) -> dict[str, object]:
        return {
            "like_count": review.like_count,
            "dislike_count": review.dislike_count,
            "user_reaction": user_reaction,
        }
