"""Restaurant domain models."""

import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class PriceRange(models.TextChoices):
    """Supported restaurant price ranges."""

    LOW = "1", "Low"
    MEDIUM = "2", "Medium"
    HIGH = "3", "High"


class Weekday(models.IntegerChoices):
    """Weekday values used for opening hours."""

    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"


class Category(models.Model):
    """Restaurant category."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    icon = models.ForeignKey(
        "files.StoredFile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="categories",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Restaurant(models.Model):
    """Restaurant model with location, ownership, and aggregate rating data."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField()
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)

    categories = models.ManyToManyField(
        Category,
        related_name="restaurants",
        blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_restaurants",
    )
    logo = models.ForeignKey(
        "files.StoredFile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="restaurant_logos",
    )

    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, db_index=True)
    district = models.CharField(max_length=100, blank=True, db_index=True)
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=8, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=11, decimal_places=8, null=True, blank=True
    )

    price_range = models.CharField(
        max_length=1,
        choices=PriceRange.choices,
        default=PriceRange.MEDIUM,
    )
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["city", "district"]),
            models.Index(fields=["-average_rating"]),
            models.Index(fields=["-created_at"]),
        ]
        ordering = ["-average_rating", "-review_count", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)[:220] or str(self.id)
            candidate = base_slug
            suffix = 1
            while (
                Restaurant.objects.filter(slug=candidate).exclude(pk=self.pk).exists()
            ):
                suffix_text = f"-{suffix}"
                candidate = f"{base_slug[: 220 - len(suffix_text)]}{suffix_text}"
                suffix += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class MenuItem(models.Model):
    """Restaurant menu item."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="menu_items",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="menu_items",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="EUR")
    image = models.ForeignKey(
        "files.StoredFile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="menu_item_images",
    )
    is_available = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return f"{self.restaurant.name} - {self.name}"


class OpeningHour(models.Model):
    """Opening hour for a restaurant by weekday."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="opening_hours",
    )
    day_of_week = models.PositiveSmallIntegerField(choices=Weekday.choices)
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ["day_of_week"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "day_of_week"],
                name="unique_opening_hour_per_day",
            )
        ]

    def __str__(self) -> str:
        return f"{self.restaurant.name} - {self.get_day_of_week_display()}"


class Favorite(models.Model):
    """User favorite relation with restaurants."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "restaurant"],
                name="unique_favorite_per_user_restaurant",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} -> {self.restaurant}"
