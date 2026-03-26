"""Hello unit test module."""

from api.hello import health


def test_health():
    """Test the health function."""
    assert health() == {"health": "ok"}
