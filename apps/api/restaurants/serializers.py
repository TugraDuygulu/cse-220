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
    primary_photo_url = serializers.SerializerMethodField()

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
            "primary_photo_url",
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

    def get_primary_photo_url(self, obj) -> str | None:
        if not obj.primary_photo_id:
            return None
        return create_file_service().get_obfuscated_url(obj.primary_photo_id)


class RestaurantWriteSerializer(serializers.ModelSerializer):
    """Restaurant create serializer."""

    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="categories",
        many=True,
        required=True,
    )
    opening_hours = OpeningHourSerializer(many=True, required=False)
    primary_photo = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Restaurant
        fields = [
            "name",
            "description",
            "phone",
            "website",
            "category_ids",
            "opening_hours",
            "primary_photo",
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
        primary_photo = validated_data.pop("primary_photo", None)
        restaurant = Restaurant.objects.create(**validated_data)

        if categories:
            restaurant.categories.set(categories)

        if opening_hours_data:
            OpeningHour.objects.bulk_create([
                OpeningHour(restaurant=restaurant, **hour_data)
                for hour_data in opening_hours_data
            ])

        if primary_photo is not None:
            self._set_primary_photo(restaurant, primary_photo)

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
            "primary_photo": {"required": False},
        }

    def update(self, instance, validated_data):
        categories = validated_data.pop("categories", None)
        opening_hours_data = validated_data.pop("opening_hours", None)
        primary_photo = validated_data.pop("primary_photo", None)

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

        if primary_photo is not None:
            self._set_primary_photo(instance, primary_photo)

        return instance

    def _set_primary_photo(self, restaurant, uploaded_file) -> None:
        file_service = create_file_service()
        previous_photo_id = restaurant.primary_photo_id
        stored_file_id, _ = file_service.save(
            uploaded_file,
            category="restaurants",
            entity_id=str(restaurant.id),
            content_type=getattr(uploaded_file, "content_type", "application/octet-stream"),
        )
        restaurant.primary_photo_id = stored_file_id
        restaurant.save(update_fields=["primary_photo", "updated_at"])

        if previous_photo_id and previous_photo_id != stored_file_id:
            file_service.delete_by_id(previous_photo_id)
