"""Restaurant serializers."""

from rest_framework import serializers

from api.serializers import DynamicFieldsModelSerializer
from files.services import create_file_service
from restaurants.models import Category, MenuItem, OpeningHour, Restaurant


class CategorySerializer(serializers.ModelSerializer):
    """Nested category serializer."""

    icon_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "icon_url", "sort_order"]

    def get_icon_url(self, obj) -> str | None:
        if not obj.icon_id:
            return None
        return create_file_service().get_obfuscated_url(obj.icon_id)


class OpeningHourSerializer(serializers.ModelSerializer):
    """Restaurant opening hours serializer."""

    day_display = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = OpeningHour
        fields = ["id", "day_of_week", "day_display", "open_time", "close_time", "is_closed"]


class MenuItemSerializer(serializers.ModelSerializer):
    """Restaurant menu item read serializer."""

    restaurant_id = serializers.UUIDField(read_only=True)
    category = CategorySerializer(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = [
            "id",
            "restaurant_id",
            "name",
            "description",
            "category",
            "price",
            "currency",
            "image",
            "image_url",
            "is_available",
            "sort_order",
        ]

    def get_image_url(self, obj) -> str | None:
        if not obj.image_id:
            return None
        return create_file_service().get_obfuscated_url(obj.image_id)


class MenuItemWriteSerializer(serializers.ModelSerializer):
    """Request serializer for menu item create/update."""

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        required=True,
    )
    currency = serializers.CharField(max_length=3, required=True)
    is_available = serializers.BooleanField(required=True)

    class Meta:
        model = MenuItem
        fields = [
            "name",
            "description",
            "category_id",
            "price",
            "currency",
            "image",
            "is_available",
            "sort_order",
        ]
        extra_kwargs = {
            "description": {"required": False},
            "image": {"required": False},
            "sort_order": {"required": False},
        }


class RestaurantSerializer(DynamicFieldsModelSerializer):
    """Restaurant read serializer."""

    categories = CategorySerializer(many=True, read_only=True)
    opening_hours = OpeningHourSerializer(many=True, read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "phone",
            "website",
            "categories",
            "opening_hours",
            "logo",
            "logo_url",
            "address_line1",
            "address_line2",
            "city",
            "district",
            "postal_code",
            "latitude",
            "longitude",
            "price_range",
            "average_rating",
            "review_count",
            "created_at",
            "updated_at",
        ]

    def get_logo_url(self, obj) -> str | None:
        if not obj.logo_id:
            return None
        return create_file_service().get_obfuscated_url(obj.logo_id)


class RestaurantWriteSerializer(serializers.ModelSerializer):
    """Restaurant create serializer."""

    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="categories",
        many=True,
        required=True,
    )
    opening_hours = OpeningHourSerializer(many=True, required=False)

    class Meta:
        model = Restaurant
        fields = [
            "name",
            "description",
            "phone",
            "website",
            "category_ids",
            "opening_hours",
            "logo",
            "address_line1",
            "address_line2",
            "city",
            "district",
            "postal_code",
            "latitude",
            "longitude",
            "price_range",
        ]

    def create(self, validated_data):
        categories = validated_data.pop("categories", [])
        opening_hours_data = validated_data.pop("opening_hours", [])
        restaurant = Restaurant.objects.create(**validated_data)

        if categories:
            restaurant.categories.set(categories)

        if opening_hours_data:
            OpeningHour.objects.bulk_create([
                OpeningHour(restaurant=restaurant, **hour_data)
                for hour_data in opening_hours_data
            ])

        return restaurant


class RestaurantUpdateSerializer(RestaurantWriteSerializer):
    """Partial update serializer for restaurant edits."""

    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="categories",
        many=True,
        required=False,
    )

    class Meta(RestaurantWriteSerializer.Meta):
        extra_kwargs = {
            "name": {"required": False},
            "description": {"required": False},
            "phone": {"required": False},
            "website": {"required": False},
            "address_line1": {"required": False},
            "address_line2": {"required": False},
            "city": {"required": False},
            "district": {"required": False},
            "postal_code": {"required": False},
            "latitude": {"required": False},
            "longitude": {"required": False},
            "price_range": {"required": False},
            "logo": {"required": False},
        }

    def update(self, instance, validated_data):
        categories = validated_data.pop("categories", None)
        opening_hours_data = validated_data.pop("opening_hours", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)

        if opening_hours_data is not None:
            instance.opening_hours.all().delete()
            OpeningHour.objects.bulk_create([
                OpeningHour(restaurant=instance, **hour_data)
                for hour_data in opening_hours_data
            ])

        return instance