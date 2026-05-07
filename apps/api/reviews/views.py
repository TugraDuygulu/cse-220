"""Views for review endpoints."""

from rest_framework.response import Response
from rest_framework.views import APIView

from api.rest import api_data, api_paginated, paginate_queryset, require_authenticated_user
from reviews.serializers import ReviewCreateSerializer, ReviewSerializer, ReviewUpdateSerializer
from reviews.services import ReviewService


class ReviewController(APIView):
    """Return, update, or delete a single review by ID."""

    service_class = ReviewService

    def get_service(self) -> ReviewService:
        return self.service_class()

    def get(self, request, review_id):
        review = self.get_service().get_review(review_id)
        return api_data(ReviewSerializer(review).data)

    def patch(self, request, review_id):
        service = self.get_service()
        review = service.get_review(review_id)
        user = require_authenticated_user(request)
        serializer = ReviewUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = service.update_review(user=user, review=review, data=serializer.validated_data)
        return api_data(ReviewSerializer(review).data)

    def delete(self, request, review_id):
        service = self.get_service()
        review = service.get_review(review_id)
        user = require_authenticated_user(request)
        service.delete_review(user=user, review=review)
        return Response(status=204)


class RestaurantReviewsController(APIView):
    """List or create reviews for a restaurant."""

    service_class = ReviewService

    def get_service(self) -> ReviewService:
        return self.service_class()

    def get(self, request, restaurant_slug):
        service = self.get_service()
        restaurant = service.get_restaurant(restaurant_slug)
        queryset = service.list_restaurant_reviews(restaurant)
        page_obj, pagination = paginate_queryset(queryset, request)
        return api_paginated(ReviewSerializer(page_obj.object_list, many=True).data, pagination)

    def post(self, request, restaurant_slug):
        service = self.get_service()
        restaurant = service.get_restaurant(restaurant_slug)
        user = require_authenticated_user(request)
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = service.create_review(
            restaurant=restaurant,
            user=user,
            data=serializer.validated_data,
        )
        return api_data(ReviewSerializer(review).data, status_code=201)


class ReviewLikeController(APIView):
    """Like or unlike a review."""

    service_class = ReviewService

    def get_service(self) -> ReviewService:
        return self.service_class()

    def post(self, request, review_id):
        service = self.get_service()
        user = require_authenticated_user(request)
        review = service.get_review(review_id)
        return api_data(service.set_reaction(user=user, review=review, is_like=True))

    def delete(self, request, review_id):
        service = self.get_service()
        user = require_authenticated_user(request)
        review = service.get_review(review_id)
        return api_data(service.delete_reaction(user=user, review=review, is_like=True))


class ReviewDislikeController(APIView):
    """Dislike or remove dislike from a review."""

    service_class = ReviewService

    def get_service(self) -> ReviewService:
        return self.service_class()

    def post(self, request, review_id):
        service = self.get_service()
        user = require_authenticated_user(request)
        review = service.get_review(review_id)
        return api_data(service.set_reaction(user=user, review=review, is_like=False))

    def delete(self, request, review_id):
        service = self.get_service()
        user = require_authenticated_user(request)
        review = service.get_review(review_id)
        return api_data(service.delete_reaction(user=user, review=review, is_like=False))
    

class ReviewRepliesController(APIView):
    """Create a reply to a review."""

    service_class = ReviewService

    def get_service(self) -> ReviewService:
        return self.service_class()

    def post(self, request, review_id):
        service = self.get_service()
        review = service.get_review(review_id)
        user = require_authenticated_user(request)
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply = service.create_review(
            restaurant=review.restaurant,
            user=user,
            data={**serializer.validated_data, "parent_id": review.id},
        )
        return api_data(ReviewSerializer(reply).data, status_code=201)