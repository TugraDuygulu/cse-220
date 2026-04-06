"""Tests for guards: UserIsAuthenticated and UserRoleRequired."""

import json

import pytest
from django.test import RequestFactory

from api_http import (
    Controller,
    UserIsAuthenticated,
    UserRoleRequired,
    build_urlpatterns,
    controller,
    delete,
    get,
    guard,
)

pytestmark = pytest.mark.django_db


class MockUser:
    def __init__(self, is_authenticated=True, role=None):
        self.is_authenticated = is_authenticated
        self.role = role


def test_guard_UserIsAuthenticated_rejects_unauthenticated():
    @controller()
    class ProtectedController(Controller):
        @guard(UserIsAuthenticated)
        @get()
        def protected(self):
            return self.ok({"status": "ok"})

    view = build_urlpatterns(ProtectedController)[0].callback
    request = RequestFactory().get("/protected/")
    request.user = MockUser(is_authenticated=False)

    response = view(request)

    assert response.status_code == 401
    import json

    assert json.loads(response.content)["error"]["code"] == "auth_required"


def test_guard_UserIsAuthenticated_rejects_missing_user():
    @controller()
    class ProtectedController(Controller):
        @guard(UserIsAuthenticated)
        @get()
        def protected(self):
            return self.ok({"status": "ok"})

    view = build_urlpatterns(ProtectedController)[0].callback
    request = RequestFactory().get("/protected/")
    request.user = None

    response = view(request)

    assert response.status_code == 401

    assert json.loads(response.content)["error"]["code"] == "auth_required"


def test_guard_UserIsAuthenticated_allows_authenticated():
    @controller()
    class ProtectedController(Controller):
        @guard(UserIsAuthenticated)
        @get()
        def protected(self):
            return self.ok({"status": "ok"})

    view = build_urlpatterns(ProtectedController)[0].callback
    request = RequestFactory().get("/protected/")
    request.user = MockUser(is_authenticated=True)

    response = view(request)

    assert response.status_code == 200
    assert json.loads(response.content)["status"] == "ok"


def test_guard_UserRoleRequired_rejects_wrong_role():
    @controller()
    class AdminController(Controller):
        @guard(UserRoleRequired("admin"))
        @get()
        def admin_only(self):
            return self.ok({"status": "ok"})

    view = build_urlpatterns(AdminController)[0].callback
    request = RequestFactory().get("/admin-only/")
    request.user = MockUser(is_authenticated=True, role="user")

    response = view(request)

    assert response.status_code == 403
    assert json.loads(response.content)["error"]["code"] == "forbidden"


def test_guard_UserRoleRequired_rejects_unauthenticated():
    @controller()
    class AdminController(Controller):
        @guard(UserRoleRequired("admin"))
        @get()
        def admin_only(self):
            return self.ok({"status": "ok"})

    view = build_urlpatterns(AdminController)[0].callback
    request = RequestFactory().get("/admin-only/")
    request.user = MockUser(is_authenticated=False, role="user")

    response = view(request)

    assert response.status_code == 401
    assert json.loads(response.content)["error"]["code"] == "auth_required"


def test_guard_UserRoleRequired_allows_correct_role():
    @controller()
    class AdminController(Controller):
        @guard(UserRoleRequired("admin"))
        @get()
        def admin_only(self):
            return self.ok({"status": "ok"})

    view = build_urlpatterns(AdminController)[0].callback
    request = RequestFactory().get("/admin-only/")
    request.user = MockUser(is_authenticated=True, role="admin")

    response = view(request)

    assert response.status_code == 200
    assert json.loads(response.content)["status"] == "ok"


def test_guard_UserRoleRequired_with_enum():
    @controller()
    class OwnerController(Controller):
        @guard(UserRoleRequired("owner"))
        @get()
        def owner_only(self):
            return self.ok({"status": "ok"})

    view = build_urlpatterns(OwnerController)[0].callback

    request = RequestFactory().get("/owner-only/")
    request.user = MockUser(is_authenticated=True, role="user")
    response = view(request)
    assert response.status_code == 403

    request = RequestFactory().get("/owner-only/")
    request.user = MockUser(is_authenticated=True, role="owner")
    response = view(request)
    assert response.status_code == 200


def test_guard_chaining_multiple_guards():
    @controller()
    class ChainedController(Controller):
        @guard(UserIsAuthenticated)
        @guard(UserRoleRequired("admin"))
        @delete()
        def delete_resource(self):
            return self.no_content()

    view = build_urlpatterns(ChainedController)[0].callback

    request = RequestFactory().delete("/delete/")
    request.user = MockUser(is_authenticated=True, role="user")
    response = view(request)
    assert response.status_code == 403

    request = RequestFactory().delete("/delete/")
    request.user = MockUser(is_authenticated=True, role="admin")
    response = view(request)
    assert response.status_code == 204
