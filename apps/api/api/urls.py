"""URL patterns for the api app."""

from django.urls import path
from . import health

urlpatterns = [
    path("", lambda request: health.health(), name="health"),
]
