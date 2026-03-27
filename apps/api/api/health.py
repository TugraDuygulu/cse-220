"""Health check endpoint for FlavorMap API."""

from django.http import JsonResponse


def health():
    """Return API health status as JSON."""
    return JsonResponse({
        "status": "ok",
        "service": "flavormap-api",
    })
