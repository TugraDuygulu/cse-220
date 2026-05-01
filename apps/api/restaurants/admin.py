from django.contrib import admin

from restaurants.models import (
    Category,
    Favorite,
    MenuItem,
    OpeningHour,
    Restaurant,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin settings for restaurant categories."""

    list_display = ("name", "slug", "sort_order")
    search_fields = ("name", "slug")
    ordering = ("sort_order", "name")


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    """Admin settings for restaurants."""

    list_display = (
        "id",
        "name",
        "city",
        "price_range",
        "average_rating",
        "review_count",
        "created_at",
    )
    list_filter = ("categories", "city", "price_range", "created_at")
    filter_horizontal = ("categories",)
    search_fields = ("name", "slug", "city", "district")
    ordering = ("-created_at",)


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    """Admin settings for menu items."""

    list_display = ("name", "restaurant", "category", "price", "currency", "is_available")
    list_filter = ("category", "currency", "is_available")
    search_fields = ("name", "restaurant__name")
    ordering = ("restaurant", "sort_order", "name")


@admin.register(OpeningHour)
class OpeningHourAdmin(admin.ModelAdmin):
    """Admin settings for opening hours."""

    list_display = ("restaurant", "day_of_week", "open_time", "close_time", "is_closed")
    list_filter = ("day_of_week", "is_closed")
    search_fields = ("restaurant__name",)
    ordering = ("restaurant", "day_of_week")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    """Admin settings for favorites."""

    list_display = ("user", "restaurant", "created_at")
    search_fields = ("user__email", "restaurant__name")
    ordering = ("-created_at",)
