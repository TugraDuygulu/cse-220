"""Restaurant data access layer."""

from restaurants.models import Category, MenuItem, Restaurant


class RestaurantRepository:
    """Repository for restaurant persistence and queries."""

    def list_restaurants(self):
        return Restaurant.objects.prefetch_related("categories").all()

    def list_categories(self):
        return Category.objects.all()

    def list_by_owner(self, owner):
        return Restaurant.objects.prefetch_related("categories").filter(owner=owner)

    def get_by_slug(self, slug: str):
        return Restaurant.objects.select_related("owner").prefetch_related("categories").filter(slug=slug).first()

    def create(self, *, owner, data: dict) -> Restaurant:
        return Restaurant.objects.create(owner=owner, **data)

    def save(self, restaurant: Restaurant, data: dict) -> Restaurant:
        for field, value in data.items():
            setattr(restaurant, field, value)
        restaurant.save()
        return restaurant

    def delete(self, restaurant: Restaurant) -> None:
        restaurant.delete()

    def list_menu_items(self, restaurant):
        return MenuItem.objects.filter(restaurant=restaurant).select_related("restaurant", "category", "image")

    def get_menu_item(self, *, restaurant, menu_item_id):
        return (
            MenuItem.objects.filter(id=menu_item_id, restaurant=restaurant)
            .select_related("restaurant", "category", "image")
            .first()
        )

    def create_menu_item(self, *, restaurant, data: dict) -> MenuItem:
        return MenuItem.objects.create(restaurant=restaurant, **data)

    def save_menu_item(self, menu_item: MenuItem, data: dict) -> MenuItem:
        for field, value in data.items():
            setattr(menu_item, field, value)
        menu_item.save()
        return menu_item

    def delete_menu_item(self, menu_item: MenuItem) -> None:
        menu_item.delete()
