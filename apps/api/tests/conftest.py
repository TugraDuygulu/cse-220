"""Unit tests configuration module."""

import os

import pytest

from config.bootstrap import configure_workspace_paths

configure_workspace_paths()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")


@pytest.fixture(autouse=True)
def allow_testserver_host(settings):
    """Ensure Django test client host is always allowed."""

    if "testserver" not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = [*settings.ALLOWED_HOSTS, "testserver"]
