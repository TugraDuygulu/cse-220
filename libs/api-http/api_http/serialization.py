"""Reusable model serialization helpers for Django models."""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Iterable

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

SERIALIZE_INCLUDE_ATTR = "__serialize_include__"
SERIALIZE_OMIT_ATTR = "__serialize_omit__"
SERIALIZE_WITH_ATTR = "__serialize_with__"


def serialize_options(
    *,
    include: Iterable[str] | None = None,
    omit: Iterable[str] | None = None,
    with_: Iterable[str] | None = None,
):
    """Assign default serialization options to a model class."""

    def decorator(cls: type[Any]) -> type[Any]:
        _set_option_attr(cls, SERIALIZE_INCLUDE_ATTR, include)
        _set_option_attr(cls, SERIALIZE_OMIT_ATTR, omit)
        _set_option_attr(cls, SERIALIZE_WITH_ATTR, with_)
        return cls

    return decorator


def serialize_include(*fields: str):
    """Decorator helper to set default include fields."""

    return serialize_options(include=fields)


def serialize_omit(*fields: str):
    """Decorator helper to set default omitted fields."""

    return serialize_options(omit=fields)


def serialize_with(*relations: str):
    """Decorator helper to set default relation expansions."""

    return serialize_options(with_=relations)


def _set_option_attr(
    cls: type[Any], attr_name: str, values: Iterable[str] | None
) -> None:
    if values is None:
        return
    normalized = tuple(_normalize_name_set(values))
    setattr(cls, attr_name, normalized)


def _normalize_name_set(values: Iterable[str] | None) -> set[str]:
    if values is None:
        return set()
    if isinstance(values, str):
        return {values.strip()} if values.strip() else set()
    normalized = set()
    for value in values:
        item = str(value).strip()
        if item:
            normalized.add(item)
    return normalized


class SerializableMixin:
    """Mixin that adds to_dict and to_json for Django model instances."""

    __serialize_include__: tuple[str, ...] = ()
    __serialize_omit__: tuple[str, ...] = ()
    __serialize_with__: tuple[str, ...] = ()

    def to_dict(
        self,
        *,
        include: Iterable[str] | None = None,
        omit: Iterable[str] | None = None,
        with_: Iterable[str] | None = None,
        max_depth: int = 1,
        _depth: int = 0,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Serialize model into a plain dictionary."""

        if "with" in kwargs and with_ is None:
            with_ = kwargs.pop("with")
        if kwargs:
            unknown = ", ".join(sorted(kwargs.keys()))
            raise TypeError(f"Unsupported serializer options: {unknown}")

        field_map = self._base_field_map()

        default_include = _normalize_name_set(getattr(self, SERIALIZE_INCLUDE_ATTR, ()))
        runtime_include = _normalize_name_set(include)
        default_omit = _normalize_name_set(getattr(self, SERIALIZE_OMIT_ATTR, ()))
        runtime_omit = _normalize_name_set(omit)

        if runtime_include:
            selected_names = runtime_include
        elif default_include:
            selected_names = default_include
        else:
            selected_names = set(field_map.keys())

        selected_names -= default_omit
        selected_names -= runtime_omit

        data: dict[str, Any] = {}
        for name in selected_names:
            if name in field_map:
                value = field_map[name]
            elif hasattr(self, name):
                value = getattr(self, name)
            else:
                continue

            data[name] = self._serialize_value(value)

        default_with = _normalize_name_set(getattr(self, SERIALIZE_WITH_ATTR, ()))
        runtime_with = _normalize_name_set(with_)
        relation_names = runtime_with if runtime_with else default_with

        for relation_name in relation_names:
            if relation_name in runtime_omit or relation_name in default_omit:
                continue

            if relation_name in field_map and f"{relation_name}_id" not in data:
                data[f"{relation_name}_id"] = self._serialize_value(
                    field_map[relation_name]
                )

            relation_value = self._serialize_relation(
                relation_name=relation_name,
                max_depth=max_depth,
                depth=_depth,
            )
            data[relation_name] = relation_value

        return data

    def to_json(self, *, indent: int | None = None, **kwargs: Any) -> str:
        """Serialize model into JSON text."""

        payload = self.to_dict(**kwargs)
        return json.dumps(
            payload, cls=DjangoJSONEncoder, ensure_ascii=False, indent=indent
        )

    def _base_field_map(self) -> dict[str, Any]:
        field_map: dict[str, Any] = {}
        for field in self._meta.concrete_fields:
            if field.is_relation:
                value = getattr(self, field.attname)
            else:
                value = getattr(self, field.name)
            field_map[field.name] = value
        return field_map

    def _serialize_relation(
        self, *, relation_name: str, max_depth: int, depth: int
    ) -> Any:
        if depth >= max_depth:
            return None

        try:
            relation = getattr(self, relation_name)
        except Exception:
            return None

        if relation is None:
            return None

        next_depth = depth + 1

        if isinstance(relation, models.Model):
            if hasattr(relation, "to_dict"):
                return relation.to_dict(max_depth=max_depth, _depth=next_depth)
            return self._serialize_value(getattr(relation, "pk", None))

        if hasattr(relation, "all"):
            items = relation.all()
            serialized_items = []
            for item in items:
                if hasattr(item, "to_dict"):
                    serialized_items.append(
                        item.to_dict(max_depth=max_depth, _depth=next_depth)
                    )
                else:
                    serialized_items.append(
                        self._serialize_value(getattr(item, "pk", item))
                    )
            return serialized_items

        return self._serialize_value(relation)

    def _serialize_value(self, value: Any) -> Any:
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
            return {key: self._serialize_value(item) for key, item in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [self._serialize_value(item) for item in value]
        if isinstance(value, models.Model):
            return self._serialize_value(getattr(value, "pk", None))
        return str(value)


class SerializableModel(SerializableMixin, models.Model):
    """Abstract Django model with built-in JSON serialization helpers."""

    class Meta:
        abstract = True
