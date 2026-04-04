"""Controller base class and response helper methods."""

from __future__ import annotations

from typing import Any

from django.core.paginator import Page, Paginator
from django.http import HttpRequest

from .responses import (
    CreatedResponse,
    ErrorResponse,
    JsonApiResponse,
    NoContentResponse,
    OkResponse,
)


class Controller:
    """Base class for class-based endpoint handlers."""

    def __init__(self, request: HttpRequest | None):
        self.request = request

    def json(
        self,
        payload: Any,
        *,
        status: int = 200,
        headers: dict[str, str] | None = None,
    ) -> JsonApiResponse:
        """Return JSON payload with explicit status and headers."""

        return JsonApiResponse(payload, status=status, headers=headers)

    def ok(self, payload: Any, *, headers: dict[str, str] | None = None) -> OkResponse:
        """Return a successful JSON response (HTTP 200)."""

        return OkResponse(payload, headers=headers)

    def created(
        self,
        payload: Any,
        *,
        headers: dict[str, str] | None = None,
    ) -> CreatedResponse:
        """Return a resource-created JSON response (HTTP 201)."""

        return CreatedResponse(payload, headers=headers)

    def no_content(self, *, headers: dict[str, str] | None = None) -> NoContentResponse:
        """Return a no-content response (HTTP 204)."""

        return NoContentResponse(headers=headers)

    def error(
        self,
        *,
        status: int,
        code: str,
        message: str,
        details: Any | None = None,
        headers: dict[str, str] | None = None,
    ) -> ErrorResponse:
        """Return a standardized JSON error response."""

        return ErrorResponse(
            status=status,
            error_code=code,
            message=message,
            details=details,
            headers=headers,
        )

    def query_csv(self, name: str) -> list[str]:
        """Return deduplicated comma-separated query values for a key."""

        if self.request is None:
            return []

        values: list[str] = []
        for raw in self.request.GET.getlist(name):
            for item in raw.split(","):
                normalized = item.strip()
                if normalized:
                    values.append(normalized)

        deduped: list[str] = []
        seen: set[str] = set()
        for value in values:
            if value in seen:
                continue
            deduped.append(value)
            seen.add(value)

        return deduped

    def list_query_fields(
        self,
        *,
        include_param: str = "include",
        omit_param: str = "omit",
        with_param: str = "with",
    ) -> tuple[list[str], list[str], list[str]]:
        """Return normalized include/omit/with query field lists."""

        return (
            self.query_csv(include_param),
            self.query_csv(omit_param),
            self.query_csv(with_param),
        )

    def resolve_list_with_fields(
        self,
        dto_class: Any,
        *,
        include_fields: list[str],
        with_fields: list[str],
        with_param: str = "with",
    ) -> list[str]:
        """Resolve active relation expansion list for list endpoints."""

        has_with_query = self.request is not None and with_param in self.request.GET
        if has_with_query:
            return with_fields
        if include_fields:
            return []
        return list(dto_class.default_with)

    def apply_list_query_options(
        self,
        queryset: Any,
        *,
        dto_class: Any,
        active_with_fields: list[str],
    ) -> Any:
        """Apply shared relation expansion options to queryset."""

        relation_sources = [
            relation.source
            for relation_name, relation in dto_class.relation_map.items()
            if relation_name in active_with_fields
        ]
        if relation_sources:
            queryset = queryset.select_related(*relation_sources)

        return queryset

    def paginate_queryset(
        self,
        queryset: Any,
        *,
        page_param: str = "page",
        page_size_param: str = "page_size",
        default_page_size: int = 20,
        max_page_size: int = 100,
    ) -> tuple[Page, dict[str, int | bool]]:
        """Paginate queryset using Django's paginator conventions."""

        if self.request is None:
            paginator = Paginator(queryset, default_page_size)
            page_obj = paginator.get_page(1)
            return page_obj, self._pagination_payload(page_obj)

        page_number = self.request.GET.get(page_param, "1")
        raw_page_size = self.request.GET.get(page_size_param)
        page_size = self._parse_positive_int(raw_page_size, default=default_page_size)
        page_size = min(page_size, max_page_size)

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page_number)

        return page_obj, self._pagination_payload(page_obj)

    def _pagination_payload(self, page_obj: Page) -> dict[str, int | bool]:
        paginator = page_obj.paginator
        return {
            "page": page_obj.number,
            "page_size": paginator.per_page,
            "total": paginator.count,
            "total_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
        }

    def _parse_positive_int(self, raw_value: str | None, *, default: int) -> int:
        if raw_value is None:
            return default

        normalized = raw_value.strip()
        if not normalized:
            return default

        try:
            parsed = int(normalized)
        except (TypeError, ValueError):
            return default

        if parsed <= 0:
            return default

        return parsed
