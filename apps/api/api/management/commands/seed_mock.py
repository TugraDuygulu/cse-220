"""Seed deterministic mock data for local development."""

from __future__ import annotations

import random
from datetime import time
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Avg, Count, Q

from restaurants.models import (
    Category,
    Favorite,
    MenuItem,
    OpeningHour,
    PriceRange,
    Restaurant,
)
from reviews.models import Review, ReviewLike
from users.models import UserRole

MOCK_EMAIL_PREFIX = "mock-"
MOCK_CATEGORY_SLUG_PREFIX = "mock-category-"
MOCK_RESTAURANT_SLUG_PREFIX = "mock-restaurant-"

CATEGORY_SEEDS = [
    (
        "Mock Turkish",
        "Traditional Turkish dishes and mezze selections.",
    ),
    (
        "Mock Italian",
        "Classic Italian comfort food and handmade pasta.",
    ),
    (
        "Mock Japanese",
        "Sushi, ramen, and izakaya-style sharing plates.",
    ),
    (
        "Mock Vegan",
        "Plant-based seasonal menu with global flavors.",
    ),
    (
        "Mock Cafe",
        "Coffee, brunch, and bakery-style all-day menu.",
    ),
]

CITY_DISTRICT_PAIRS = [
    ("Istanbul", "Besiktas"),
    ("Istanbul", "Kadikoy"),
    ("Ankara", "Cankaya"),
    ("Izmir", "Alsancak"),
    ("Bursa", "Nilufer"),
]

MENU_TEMPLATES = [
    (
        "Mock Signature Plate",
        "Chef-crafted signature dish with seasonal ingredients.",
        Decimal("14.00"),
    ),
    (
        "Mock Garden Salad",
        "Fresh greens, herbs, and house dressing.",
        Decimal("8.50"),
    ),
    (
        "Mock Main Course",
        "Popular guest favorite prepared to order.",
        Decimal("18.00"),
    ),
    (
        "Mock Dessert",
        "Daily dessert selection made in-house.",
        Decimal("6.50"),
    ),
]

REVIEW_SNIPPETS = [
    "Great atmosphere and consistent food quality.",
    "Friendly service and generous portions.",
    "Loved the flavor profile and plating.",
    "Good value and quick service during lunch.",
    "Would visit again, especially for the signature plate.",
]


class Command(BaseCommand):
    help = "Seed deterministic mock users, restaurants, and reviews."

    def add_arguments(self, parser):
        parser.add_argument(
            "--owners",
            type=int,
            default=6,
            help="Number of mock owner accounts to seed.",
        )
        parser.add_argument(
            "--users",
            type=int,
            default=24,
            help="Number of mock user accounts to seed.",
        )
        parser.add_argument(
            "--restaurants",
            type=int,
            default=18,
            help="Number of mock restaurants to seed.",
        )
        parser.add_argument(
            "--reviews-per-restaurant",
            type=int,
            default=6,
            help="Top-level reviews to create for each mock restaurant.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=220,
            help="Random seed for deterministic data generation.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing mock records before reseeding.",
        )

    def handle(self, *args, **options):
        rng = random.Random(options["seed"])

        with transaction.atomic():
            if options["reset"]:
                self._purge_mock_data()

            owners = self._seed_users(
                count=options["owners"],
                role=UserRole.OWNER,
                email_prefix="mock-owner",
                rng=rng,
            )
            users = self._seed_users(
                count=options["users"],
                role=UserRole.USER,
                email_prefix="mock-user",
                rng=rng,
            )
            categories = self._seed_categories()
            restaurants = self._seed_restaurants(
                count=options["restaurants"],
                owners=owners,
                categories=categories,
                rng=rng,
            )
            self._seed_menu_items(restaurants=restaurants, rng=rng)
            self._seed_opening_hours(restaurants=restaurants)
            self._seed_reviews(
                restaurants=restaurants,
                users=users,
                owners=owners,
                reviews_per_restaurant=options["reviews_per_restaurant"],
                rng=rng,
            )
            self._seed_favorites(users=users, restaurants=restaurants, rng=rng)
            self._sync_restaurant_aggregates(restaurants=restaurants)

        self.stdout.write(
            self.style.SUCCESS(
                "Mock seed complete. "
                f"owners={len(owners)} users={len(users)} restaurants={len(restaurants)}"
            )
        )

    def _seed_users(
        self, *, count: int, role: str, email_prefix: str, rng: random.Random
    ):
        user_model = get_user_model()
        created_count = 0
        updated_count = 0
        seeded_users = []

        for index in range(1, count + 1):
            email = f"{email_prefix}-{index}@flavormap.local"
            username = f"{email_prefix}-{index}"
            display_name = f"{email_prefix.replace('-', ' ').title()} {index}"

            user, created = user_model.objects.update_or_create(
                email=email,
                defaults={
                    "username": username,
                    "display_name": display_name,
                    "bio": f"Mock profile for {display_name}.",
                    "avatar_url": "",
                    "role": role,
                    "is_active": True,
                    "is_staff": role == UserRole.ADMIN,
                },
            )
            user.set_password("mock-password-123")
            user.save(update_fields=["password"])

            if created:
                created_count += 1
            else:
                updated_count += 1

            seeded_users.append(user)

        rng.shuffle(seeded_users)
        self.stdout.write(
            f"Seeded {role} users: created={created_count}, updated={updated_count}"
        )
        return seeded_users

    def _seed_categories(self):
        categories = []
        created_count = 0
        updated_count = 0

        for index, (name, description) in enumerate(CATEGORY_SEEDS, start=1):
            slug = f"{MOCK_CATEGORY_SLUG_PREFIX}{index}"
            category, created = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": description,
                    "sort_order": index
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
            categories.append(category)

        self.stdout.write(
            f"Seeded categories: created={created_count}, updated={updated_count}"
        )
        return categories

    def _seed_restaurants(self, *, count: int, owners, categories, rng: random.Random):
        created_count = 0
        updated_count = 0
        restaurants = []
        price_ranges = [PriceRange.LOW, PriceRange.MEDIUM, PriceRange.HIGH]

        for index in range(1, count + 1):
            slug = f"{MOCK_RESTAURANT_SLUG_PREFIX}{index}"
            city, district = CITY_DISTRICT_PAIRS[(index - 1) % len(CITY_DISTRICT_PAIRS)]
            owner = owners[(index - 1) % len(owners)] if owners else None
            category = categories[(index - 1) % len(categories)]

            latitude = Decimal("40.95") + Decimal(str(index)) / Decimal("100")
            longitude = Decimal("29.10") + Decimal(str(index)) / Decimal("100")

            restaurant, created = Restaurant.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": f"Mock Restaurant {index}",
                    "description": (
                        "Mock restaurant profile used for local development and demos."
                    ),
                    "phone": f"+90-555-010-{index:03d}",
                    "website": f"https://{slug}.flavormap.local",
                    "owner": owner,
                    "address_line1": f"{100 + index} Demo Avenue",
                    "address_line2": "",
                    "city": city,
                    "district": district,
                    "postal_code": f"34{index:03d}",
                    "latitude": latitude.quantize(Decimal("0.00000001")),
                    "longitude": longitude.quantize(Decimal("0.00000001")),
                    "price_range": price_ranges[(index - 1) % len(price_ranges)],
                },
            )
            restaurant.categories.set([category])
            if created:
                created_count += 1
            else:
                updated_count += 1

            restaurants.append(restaurant)

        rng.shuffle(restaurants)
        self.stdout.write(
            f"Seeded restaurants: created={created_count}, updated={updated_count}"
        )
        return restaurants

    def _seed_menu_items(self, *, restaurants, rng: random.Random):
        created_total = 0

        for restaurant in restaurants:
            restaurant_category = restaurant.categories.first()
            MenuItem.objects.filter(
                restaurant=restaurant,
                name__startswith="Mock ",
            ).delete()

            for sort_order, (name, description, base_price) in enumerate(
                MENU_TEMPLATES, start=1
            ):
                variance = Decimal(str(rng.randint(-25, 30))) / Decimal("10")
                price = (base_price + variance).quantize(
                    Decimal("0.01"),
                    rounding=ROUND_HALF_UP,
                )
                if price < Decimal("3.00"):
                    price = Decimal("3.00")

                MenuItem.objects.create(
                    restaurant=restaurant,
                    name=name,
                    description=description,
                    price=price,
                    currency="EUR",
                    is_available=True,
                    sort_order=sort_order,
                    category=restaurant_category,
                )
                created_total += 1

        self.stdout.write(f"Seeded menu items: created={created_total}")

    def _seed_opening_hours(self, *, restaurants):
        upserted_total = 0

        for restaurant in restaurants:
            for day in range(7):
                is_weekend = day in {5, 6}
                is_closed = day == 0
                open_time = (
                    None if is_closed else (time(10, 0) if is_weekend else time(9, 0))
                )
                close_time = (
                    None if is_closed else (time(23, 0) if is_weekend else time(22, 0))
                )

                OpeningHour.objects.update_or_create(
                    restaurant=restaurant,
                    day_of_week=day,
                    defaults={
                        "is_closed": is_closed,
                        "open_time": open_time,
                        "close_time": close_time,
                    },
                )
                upserted_total += 1

        self.stdout.write(f"Seeded opening hours: upserted={upserted_total}")

    def _seed_reviews(
        self,
        *,
        restaurants,
        users,
        owners,
        reviews_per_restaurant: int,
        rng: random.Random,
    ):
        top_level_total = 0
        reply_total = 0
        reaction_total = 0

        for restaurant in restaurants:
            Review.objects.filter(
                restaurant=restaurant,
                user__email__startswith=MOCK_EMAIL_PREFIX,
            ).delete()

            reviewers = rng.sample(users, k=min(reviews_per_restaurant, len(users)))
            created_reviews = []

            for review_index, reviewer in enumerate(reviewers, start=1):
                rating = rng.randint(2, 5)
                snippet = REVIEW_SNIPPETS[(review_index - 1) % len(REVIEW_SNIPPETS)]
                review = Review.objects.create(
                    restaurant=restaurant,
                    user=reviewer,
                    rating=rating,
                    content=f"{snippet} [seed:{restaurant.slug}:{review_index}]",
                )
                created_reviews.append(review)
                top_level_total += 1

            if owners:
                owner = restaurant.owner or owners[0]
                for parent_review in created_reviews[:2]:
                    if owner.pk == parent_review.user_id:
                        continue
                    Review.objects.create(
                        restaurant=restaurant,
                        user=owner,
                        parent=parent_review,
                        rating=parent_review.rating,
                        content="Thanks for the feedback. We appreciate your visit.",
                    )
                    reply_total += 1

            for review in created_reviews:
                reactor_pool = [user for user in users if user.pk != review.user_id]
                if not reactor_pool:
                    continue

                reactors = rng.sample(reactor_pool, k=min(3, len(reactor_pool)))
                like_count = 0
                dislike_count = 0

                for reactor in reactors:
                    is_like = rng.choice([True, True, False])
                    ReviewLike.objects.update_or_create(
                        review=review,
                        user=reactor,
                        defaults={"is_like": is_like},
                    )
                    reaction_total += 1
                    if is_like:
                        like_count += 1
                    else:
                        dislike_count += 1

                review.like_count = like_count
                review.dislike_count = dislike_count
                review.save(update_fields=["like_count", "dislike_count", "updated_at"])

        self.stdout.write(
            "Seeded reviews: "
            f"top-level={top_level_total}, replies={reply_total}, reactions={reaction_total}"
        )

    def _seed_favorites(self, *, users, restaurants, rng: random.Random):
        created_total = 0

        for user in users:
            Favorite.objects.filter(
                user=user,
                restaurant__slug__startswith=MOCK_RESTAURANT_SLUG_PREFIX,
            ).delete()

            favorites = rng.sample(restaurants, k=min(3, len(restaurants)))
            for restaurant in favorites:
                Favorite.objects.get_or_create(user=user, restaurant=restaurant)
                created_total += 1

        self.stdout.write(f"Seeded favorites: created={created_total}")

    def _sync_restaurant_aggregates(self, *, restaurants):
        for restaurant in restaurants:
            aggregate = Review.objects.filter(
                restaurant=restaurant,
                parent__isnull=True,
            ).aggregate(
                review_count=Count("id"),
                avg_rating=Avg("rating"),
            )

            average = aggregate["avg_rating"]
            if average is None:
                avg_rating = Decimal("0.00")
            else:
                avg_rating = Decimal(str(average)).quantize(
                    Decimal("0.01"),
                    rounding=ROUND_HALF_UP,
                )

            restaurant.review_count = aggregate["review_count"] or 0
            restaurant.average_rating = avg_rating
            restaurant.save(
                update_fields=["review_count", "average_rating", "updated_at"]
            )

        self.stdout.write("Synchronized restaurant rating aggregates.")

    def _purge_mock_data(self):
        user_model = get_user_model()

        ReviewLike.objects.filter(
            Q(user__email__startswith=MOCK_EMAIL_PREFIX)
            | Q(review__restaurant__slug__startswith=MOCK_RESTAURANT_SLUG_PREFIX)
        ).delete()

        Review.objects.filter(
            Q(user__email__startswith=MOCK_EMAIL_PREFIX)
            | Q(restaurant__slug__startswith=MOCK_RESTAURANT_SLUG_PREFIX)
        ).delete()

        Favorite.objects.filter(
            Q(user__email__startswith=MOCK_EMAIL_PREFIX)
            | Q(restaurant__slug__startswith=MOCK_RESTAURANT_SLUG_PREFIX)
        ).delete()

        MenuItem.objects.filter(
            restaurant__slug__startswith=MOCK_RESTAURANT_SLUG_PREFIX
        ).delete()
        OpeningHour.objects.filter(
            restaurant__slug__startswith=MOCK_RESTAURANT_SLUG_PREFIX
        ).delete()
        Restaurant.objects.filter(slug__startswith=MOCK_RESTAURANT_SLUG_PREFIX).delete()
        Category.objects.filter(slug__startswith=MOCK_CATEGORY_SLUG_PREFIX).delete()
        user_model.objects.filter(email__startswith=MOCK_EMAIL_PREFIX).delete()

        self.stdout.write("Removed existing mock data.")
