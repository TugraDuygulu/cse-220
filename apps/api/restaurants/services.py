"""Restaurant application services."""

from api.exceptions import ApiError
from restaurants.repositories import RestaurantRepository
from users.models import UserRole


class RestaurantService:
    """Coordinates restaurant endpoint behavior."""

    repository_class = RestaurantRepository

    def __init__(self, repository: RestaurantRepository | None = None) -> None:
        self.repository = repository or self.repository_class()

    def list_restaurants(self, sort: str | None = None):
        return self.repository.list_restaurants(sort=sort)

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

        opening_hours = data.pop("opening_hours", [])
        restaurant = self.repository.create(owner=user, data=data)

        if opening_hours:
            self.repository.set_opening_hours(restaurant, opening_hours)

        return restaurant

    def update_restaurant(self, *, user, restaurant, data: dict):
        if user.role != UserRole.OWNER or restaurant.owner_id != user.id:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You do not have permission to update this restaurant.",
            )

        opening_hours = data.pop("opening_hours", None)
        updated_restaurant = self.repository.save(restaurant, data)

        if opening_hours is not None:
            self.repository.set_opening_hours(updated_restaurant, opening_hours)

        return updated_restaurant

    def delete_restaurant(self, *, user, restaurant) -> None:
        if user.role != UserRole.ADMIN:
            raise ApiError(
                status_code=403,
                code="forbidden",
                detail="You do not have permission to delete this restaurant.",
            )
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
