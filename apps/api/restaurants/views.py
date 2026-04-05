"""Views for restaurant endpoints."""

from api_http import Controller, controller, delete, get, patch, post
from restaurants.dtos import RestaurantDto
from restaurants.models import Restaurant
from users.models import UserRole

@controller()
class RestaurantsController(Controller):
    """Controller for restaurant endpoints."""

    @get()
    def restaurants_list(self):
        """Return paginated restaurant results with DTO serialization."""
        include_fields, omit_fields, with_fields = self.list_query_fields()
        active_with_fields = self.resolve_list_with_fields(
            RestaurantDto,
            include_fields=include_fields,
            with_fields=with_fields,
        )

        queryset = self.apply_list_query_options(
            Restaurant.objects.all(),
            dto_class=RestaurantDto,
            active_with_fields=active_with_fields,
        )

        page_obj, pagination = self.paginate_queryset(queryset)

        data = RestaurantDto.from_models(
            page_obj.object_list,
            include=include_fields or None,
            omit=omit_fields or None,
            with_=active_with_fields,
        )

        return self.json(
            {
                "data": data,
                "pagination": pagination,
            }
        )

    @get("<slug:slug>/")
    def restaurant_detail(self, slug):
        """Return restaurant detail with full DTO serialization."""
        restaurant = Restaurant.objects.filter(slug=slug).first()
        if restaurant is None:
            return self.error(
                status=404,
                code="not_found",
                message="Restaurant not found.",
            )

        data = RestaurantDto.from_model(restaurant)
        return self.json({"data": data})

    @post()
    def restaurant_create(self):
        """Scaffold for owner-only restaurant creation."""
        # TODO(implementation guide):
        # 1) Auth check with request user + api_http error helper.
        #    - user = getattr(self.request, "user", None)
        #    - if user is None or not user.is_authenticated:
        #        return self.error(status=401, code="auth_required", message="Authentication is required.")
        #
        # 2) Role check for owners.
        #    - from users.models import UserRole
        #    - if user.role != UserRole.OWNER:
        #        return self.error(status=403, code="forbidden", message="Only restaurant owners can create restaurants.")
        #
        # 3) Parse request JSON body and validate required fields.
        #    - validate at least: name, description, category_id, address_line1, city
        #    - validate category exists (Category.objects.filter(id=...).first())
        #    - validate enums like price_range against model choices
        #
        # 4) Persist model using Django ORM.
        #    - restaurant = Restaurant.objects.create(..., owner=user, category=category)
        #
        # 5) Serialize and return using new DTO + api_http helper.
        #    - return self.created({"data": RestaurantDto.from_model(restaurant)})
        return self.error(
            status=501,
            code="not_implemented",
            message="restaurant_create is scaffolded but not implemented.",
        )

    @patch("<slug:slug>/")
    def restaurant_update(self, slug):
        """Scaffold for owner-only restaurant update."""
        # TODO(implementation guide):
        # 1) Repeat auth + owner role checks (same api_http `self.error(...)` pattern as create).
        # 2) Load restaurant by slug:
        #    - restaurant = Restaurant.objects.filter(slug=slug).first()
        #    - if restaurant is None: return self.error(status=404, code="not_found", message="Restaurant not found.")
        # 3) Ownership check:
        #    - if restaurant.owner_id != user.id: return self.error(status=403, code="forbidden", ...)
        # 4) Parse partial payload, validate allowed fields only, and reject empty patch payload.
        # 5) Apply validated fields, save model, and serialize with DTO:
        #    - return self.json({"data": RestaurantDto.from_model(restaurant)})
        return self.error(
            status=501,
            code="not_implemented",
            message=(
                f"restaurant_update for slug '{slug}' is scaffolded but not implemented."
            ),
        )

    @delete("<slug:slug>/")
    def restaurant_delete(self, slug):
        """Scaffold for admin-only restaurant deletion."""
        user = getattr(self.request, "user", None)
        if user is None or not user.is_authenticated:
            return self.error(
                status=401,
                code="auth_required",
                message="Authentication is required.",
            )

        if user.role != UserRole.ADMIN:
            return self.error(
                status=403,
                code="forbidden",
                message="Only admins can delete restaurants.",
            )

        restaurant = Restaurant.objects.filter(slug=slug).first()
        if restaurant is None:
            return self.error(
                status=404,
                code="not_found",
                message="Restaurant not found.",
            )

        restaurant.delete()
        return self.no_content()
