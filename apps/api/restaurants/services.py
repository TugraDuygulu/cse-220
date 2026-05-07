"""Restaurant application services."""

from decimal import Decimal, InvalidOperation
from django.db import transaction
from api.exceptions import ApiError
from files.services import create_file_service
from restaurants.repositories import RestaurantRepository
from users.models import UserRole


class RestaurantService:
    """Coordinates restaurant endpoint behavior."""

    repository_class = RestaurantRepository

    def __init__(self, repository: RestaurantRepository | None = None) -> None:
        self.repository = repository or self.repository_class()
        self.file_service = create_file_service()


    def list_restaurants(self, filters: dict | None = None, sort: str | None = None):
        normalized_filters = self._normalize_restaurant_filters(filters or {})
        return self.repository.list_restaurants(filters=normalized_filters, sort=sort)

    def _normalize_restaurant_filters(self, filters: dict) -> dict:
        normalized: dict = {}

        category = filters.get("category")
        if category:
            normalized["category"] = str(category).strip().lower()

        city = filters.get("city")
        if city:
            normalized["city"] = str(city).strip()

        price_range = filters.get("price_range") or filters.get("price")
        if price_range:
            price_range = str(price_range).strip()
            if price_range not in {"1", "2", "3"}:
                raise ApiError(
                    status_code=400,
                    code="invalid_filter",
                    detail="price must be one of: 1, 2, 3.",
                )
            normalized["price_range"] = price_range

        min_rating = filters.get("min_rating")
        if min_rating not in (None, ""):
            try:
                min_rating_value = Decimal(str(min_rating))
            except (InvalidOperation, ValueError):
                raise ApiError(
                    status_code=400,
                    code="invalid_filter",
                    detail="min_rating must be a number between 0 and 5.",
                ) from None

            if min_rating_value < 0 or min_rating_value > 5:
                raise ApiError(
                    status_code=400,
                    code="invalid_filter",
                    detail="min_rating must be a number between 0 and 5.",
                )

            normalized["min_rating"] = min_rating_value

        return normalized

    def list_categories(self):
        return self.repository.list_categories()

    def list_owned_restaurants(self, user):
        if user.role != UserRole.OWNER:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You do not have permission to manage restaurants.",
            )
        return self.repository.list_by_owner(user)

    def get_restaurant(self, slug: str):
        restaurant = self.repository.get_by_slug(slug)
        if restaurant is None:
            raise ApiError(status_code=404, code="not_found", detail="Restaurant not found.")
        return restaurant

    def create_restaurant(self, *, user, data: dict):
        if user.role != UserRole.OWNER:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You do not have permission to create a restaurant.",
            )

        categories = data.pop("categories", [])
        opening_hours = data.pop("opening_hours", [])
        primary_photo = data.pop("primary_photo", None)

        with transaction.atomic():
            restaurant = self.repository.create(owner=user, data=data)

            if categories:
                restaurant.categories.set(categories)

            if opening_hours:
                self.repository.set_opening_hours(restaurant, opening_hours)

            if primary_photo is not None:
                self._set_primary_photo(restaurant=restaurant, uploaded_file=primary_photo)

        return restaurant

    def update_restaurant(self, *, user, restaurant, data: dict):
        if user.role != UserRole.OWNER or restaurant.owner_id != user.id:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You do not have permission to update this restaurant.",
            )

        categories = data.pop("categories", None)
        opening_hours = data.pop("opening_hours", None)
        primary_photo = data.pop("primary_photo", None)

        with transaction.atomic():
            updated_restaurant = self.repository.save(restaurant, data)

            if categories is not None:
                updated_restaurant.categories.set(categories)

            if opening_hours is not None:
                self.repository.set_opening_hours(updated_restaurant, opening_hours)

            if primary_photo is not None:
                self._set_primary_photo(
                    restaurant=updated_restaurant,
                    uploaded_file=primary_photo,
                )

        return updated_restaurant

    def delete_restaurant(self, *, user, restaurant) -> None:
        if user.role != UserRole.ADMIN:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You do not have permission to delete this restaurant.",
            )
        self._delete_primary_photo(restaurant)
        self.repository.delete(restaurant)

    def list_menu_items(self, restaurant):
        return self.repository.list_menu_items(restaurant)

    def get_menu_item(self, *, restaurant, menu_item_id):
        menu_item = self.repository.get_menu_item(
            restaurant=restaurant,
            menu_item_id=menu_item_id,
        )
        if menu_item is None:
            raise ApiError(status_code=404, code="not_found", detail="Menu item not found.")
        return menu_item

    def create_menu_item(self, *, user, restaurant, data: dict):
        self._require_menu_manager(user=user, restaurant=restaurant)
        return self.repository.create_menu_item(restaurant=restaurant, data=data)

    def update_menu_item(self, *, user, restaurant, menu_item, data: dict):
        self._require_menu_manager(user=user, restaurant=restaurant)
        return self.repository.save_menu_item(menu_item, data)

    def delete_menu_item(self, *, user, restaurant, menu_item) -> None:
        self._require_menu_manager(user=user, restaurant=restaurant)
        self.repository.delete_menu_item(menu_item)

    def _require_menu_manager(self, *, user, restaurant) -> None:
        if user.role == UserRole.ADMIN:
            return
        if user.role == UserRole.OWNER and restaurant.owner_id == user.id:
            return
        raise ApiError(
            status_code=403,
            code="forbidden",
            detail="You do not have permission to manage this restaurant menu.",
        )

    def _set_primary_photo(self, *, restaurant, uploaded_file) -> None:
        previous_photo_id = restaurant.primary_photo_id
        stored_file_id = None

        try:
            stored_file_id, _ = self.file_service.save(
                uploaded_file,
                category="restaurants",
                entity_id=str(restaurant.id),
                content_type=getattr(uploaded_file, "content_type", "application/octet-stream"),
            )
            restaurant.primary_photo_id = stored_file_id
            restaurant.save(update_fields=["primary_photo", "updated_at"])
        except Exception:
            if stored_file_id is not None:
                self.file_service.delete_by_id(stored_file_id)
            raise

        if previous_photo_id and previous_photo_id != stored_file_id:
            self.file_service.delete_by_id(previous_photo_id)

    def _delete_primary_photo(self, restaurant) -> None:
        if restaurant.primary_photo_id:
            self.file_service.delete_by_id(restaurant.primary_photo_id)
