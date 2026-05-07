"""Architecture tests for the DRF controller/service/repository layers."""

from api.services import HealthService
from api.urls import urlpatterns as api_urlpatterns
from django.conf import settings
from restaurants.repositories import RestaurantRepository
from restaurants.services import RestaurantService
from restaurants.urls import urlpatterns as restaurant_urlpatterns
from reviews.repositories import ReviewRepository
from reviews.services import ReviewService
from reviews.urls import urlpatterns as review_urlpatterns
from users.repositories import UserRepository
from users.services import UserService
from users.urls import urlpatterns as user_urlpatterns


def _view_class(urlpatterns, route: str):
    for pattern in urlpatterns:
        if str(pattern.pattern) == route:
            return pattern.callback.view_class
    raise AssertionError(f"Route {route!r} not found")


def test_urls_are_backed_by_drf_controller_classes():
    assert _view_class(api_urlpatterns, "").__name__ == "HealthController"
    assert _view_class(user_urlpatterns, "me/").__name__ == "UsersController"
    assert _view_class(restaurant_urlpatterns, "").__name__ == "RestaurantsController"
    assert _view_class(restaurant_urlpatterns, "<slug:slug>/").__name__ == "RestaurantDetailController"
    assert _view_class(restaurant_urlpatterns, "<slug:restaurant_slug>/menu-items/").__name__ == "RestaurantMenuItemsController"
    assert _view_class(restaurant_urlpatterns, "<slug:restaurant_slug>/menu-items/<uuid:menu_item_id>/").__name__ == "RestaurantMenuItemDetailController"
    assert _view_class(review_urlpatterns, "restaurants/<slug:restaurant_slug>/").__name__ == "RestaurantReviewsController"
    assert _view_class(review_urlpatterns, "<uuid:review_id>/").__name__ == "ReviewController"
    assert _view_class(review_urlpatterns, "<uuid:review_id>/like/").__name__ == "ReviewLikeController"
    assert _view_class(review_urlpatterns, "<uuid:review_id>/dislike/").__name__ == "ReviewDislikeController"
    assert _view_class(review_urlpatterns, "<uuid:review_id>/replies/").__name__ == "ReviewRepliesController"

def test_services_depend_on_repositories():
    assert UserService.repository_class is UserRepository
    assert RestaurantService.repository_class is RestaurantRepository
    assert ReviewService.repository_class is ReviewRepository


def test_controllers_depend_on_services():
    assert _view_class(api_urlpatterns, "").service_class is HealthService
    assert _view_class(user_urlpatterns, "me/").service_class is UserService
    assert _view_class(restaurant_urlpatterns, "").service_class is RestaurantService
    assert _view_class(restaurant_urlpatterns, "<slug:slug>/").service_class is RestaurantService
    assert _view_class(restaurant_urlpatterns, "<slug:restaurant_slug>/menu-items/").service_class is RestaurantService
    assert _view_class(restaurant_urlpatterns, "<slug:restaurant_slug>/menu-items/<uuid:menu_item_id>/").service_class is RestaurantService
    assert _view_class(review_urlpatterns, "restaurants/<slug:restaurant_slug>/").service_class is ReviewService
    assert _view_class(review_urlpatterns, "<uuid:review_id>/").service_class is ReviewService
    assert _view_class(review_urlpatterns, "<uuid:review_id>/like/").service_class is ReviewService
    assert _view_class(review_urlpatterns, "<uuid:review_id>/dislike/").service_class is ReviewService
    assert _view_class(review_urlpatterns, "<uuid:review_id>/replies/").service_class is ReviewService

def test_drf_uses_session_authentication_only():
    assert settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] == [
        "rest_framework.authentication.SessionAuthentication"
    ]
