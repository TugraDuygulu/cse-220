"""Controller-driven DTO utilities for mapping Django models to API payloads."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Callable, Iterable

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models


@dataclass(frozen=True)
class DtoRelation:
    """Relation mapping definition for nested DTO expansion."""

    source: str
    dto: type["BaseDto"]
    many: bool = False


def dto_relation(
    source: str, dto: type["BaseDto"], *, many: bool = False
) -> DtoRelation:
    """Factory helper for relation mapping readability."""

    return DtoRelation(source=source, dto=dto, many=many)


class BaseDto:
    """Base class for controller-driven DTO mapping."""

    field_map: dict[str, str | Callable[[Any], Any]] = {}
    relation_map: dict[str, DtoRelation] = {}
    default_include: tuple[str, ...] = ()
    default_omit: tuple[str, ...] = ()
    default_with: tuple[str, ...] = ()

    @classmethod
    def from_model(
        cls,
        instance: Any,
        *,
        include: Iterable[str] | None = None,
        omit: Iterable[str] | None = None,
        with_: Iterable[str] | None = None,
        max_depth: int = 1,
        _depth: int = 0,
        **kwargs: Any,
    ) -> dict[str, Any] | None:
        """Convert a model instance into DTO payload."""

        if instance is None:
            return None

        if "with" in kwargs and with_ is None:
            with_ = kwargs.pop("with")
        if kwargs:
            unknown = ", ".join(sorted(kwargs.keys()))
            raise TypeError(f"Unsupported DTO options: {unknown}")

        include_set = cls._normalize_name_set(include)
        if include_set:
            selected_fields = include_set
        elif cls.default_include:
            selected_fields = set(cls.default_include)
        else:
            selected_fields = set(cls.field_map.keys())

        omit_set = set(cls.default_omit)
        omit_set.update(cls._normalize_name_set(omit))

        payload: dict[str, Any] = {}
        for out_key, source in cls.field_map.items():
            if out_key not in selected_fields:
                continue
            if out_key in omit_set:
                continue

            value = cls._resolve_source(instance, source)
            payload[out_key] = cls._serialize_value(value)

        if with_ is None:
            active_with = set(cls.default_with)
        else:
            active_with = cls._normalize_name_set(with_)

        for relation_name in active_with:
            if relation_name in omit_set:
                continue

            relation = cls.relation_map.get(relation_name)
            if relation is None:
                continue

            relation_value = cls._resolve_source(instance, relation.source)

            if _depth >= max_depth:
                expanded = [] if relation.many else None
            elif relation.many:
                expanded = cls._serialize_many_relation(
                    relation_value,
                    relation_dto=relation.dto,
                    max_depth=max_depth,
                    depth=_depth,
                )
            else:
                expanded = relation.dto.from_model(
                    relation_value,
                    max_depth=max_depth,
                    _depth=_depth + 1,
                )

            if relation_name in payload and f"{relation_name}_id" not in payload:
                payload[f"{relation_name}_id"] = payload[relation_name]

            payload[relation_name] = expanded

        return payload

    @classmethod
    def from_models(
        cls,
        instances: Iterable[Any],
        *,
        include: Iterable[str] | None = None,
        omit: Iterable[str] | None = None,
        with_: Iterable[str] | None = None,
        max_depth: int = 1,
    ) -> list[dict[str, Any]]:
        """Convert iterable of model instances into DTO payload list."""

        return [
            cls.from_model(
                instance,
                include=include,
                omit=omit,
                with_=with_,
                max_depth=max_depth,
            )
            for instance in instances
        ]

    @classmethod
    def to_json(
        cls,
        payload: Any,
        *,
        indent: int | None = None,
    ) -> str:
        """Serialize DTO payload to JSON string."""

        return json.dumps(
            payload, cls=DjangoJSONEncoder, ensure_ascii=False, indent=indent
        )

    @staticmethod
    def _normalize_name_set(values: Iterable[str] | None) -> set[str]:
        if values is None:
            return set()
        if isinstance(values, str):
            item = values.strip()
            return {item} if item else set()

        normalized = set()
        for value in values:
            item = str(value).strip()
            if item:
                normalized.add(item)
        return normalized

    @classmethod
    def _resolve_source(cls, instance: Any, source: str | Callable[[Any], Any]) -> Any:
        if callable(source):
            return source(instance)

        value: Any = instance
        for part in source.split("."):
            if value is None:
                return None
            value = getattr(value, part)
        return value

    @classmethod
    def _serialize_many_relation(
        cls,
        relation_value: Any,
        *,
        relation_dto: type["BaseDto"],
        max_depth: int,
        depth: int,
    ) -> list[Any]:
        if relation_value is None:
            return []

        if hasattr(relation_value, "all"):
            items = relation_value.all()
        else:
            items = relation_value

        return [
            relation_dto.from_model(item, max_depth=max_depth, _depth=depth + 1)
            for item in items
        ]

    @classmethod
    def _serialize_value(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, Decimal):
            return str(value)
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, (datetime, date, time)):
            return value.isoformat()
        if isinstance(value, dict):
            return {key: cls._serialize_value(item) for key, item in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [cls._serialize_value(item) for item in value]
        if isinstance(value, models.Model):
            return cls._serialize_value(getattr(value, "pk", None))
        return str(value)
