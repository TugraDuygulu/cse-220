"""Health check endpoint for FlavorMap API."""

from django.http import JsonResponse
from datetime import datetime, timezone

START_TIME = datetime.now(timezone.utc)

def health():
    """Return API health status as JSON."""
    now = datetime.now(timezone.utc)
    uptime_seconds = int((now - START_TIME).total_seconds())
    return JsonResponse({
        "status": "ok",
        "version": "1.0.0",
        "service": "flavormap-api",
        "uptime_seconds": uptime_seconds,

    })