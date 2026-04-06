"""Test configuration for api-http library."""

import django
from django.conf import settings


def pytest_configure() -> None:
    if not settings.configured:
        settings.configure(
            DEBUG=True,
            SECRET_KEY="api-http-test-secret",
            ALLOWED_HOSTS=["*"],
            ROOT_URLCONF=__name__,
            MIDDLEWARE=[],
            INSTALLED_APPS=[
                "django.contrib.contenttypes",
                "django.contrib.auth",
            ],
            DEFAULT_CHARSET="utf-8",
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.sqlite3",
                    "NAME": ":memory:",
                }
            },
        )
    django.setup()
