"""Health unit test module."""

from api.health import health


def test_health():
    """Test the health function."""
    assert health() == JsonResponse({
        "status": "ok",
        "service": "flavormap-api"
    })
