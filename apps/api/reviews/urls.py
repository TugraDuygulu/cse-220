"""URL routes for reviews app."""

from django.urls import path

from reviews.views import (
    RestaurantReviewsController,
    ReviewController,
    ReviewDislikeController,
    ReviewLikeController,
    ReviewRepliesController
)

urlpatterns = [
    path("restaurants/<slug:restaurant_slug>/", RestaurantReviewsController.as_view(), name="reviews-restaurant-list"),
    path("<uuid:review_id>/", ReviewController.as_view(), name="reviews-detail"),
    path("<uuid:review_id>/like/", ReviewLikeController.as_view(), name="reviews-like"),
    path("<uuid:review_id>/dislike/", ReviewDislikeController.as_view(), name="reviews-dislike"),
    path("<uuid:review_id>/replies/", ReviewRepliesController.as_view(), name="reviews-replies"),
]
