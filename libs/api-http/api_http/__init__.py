"""Public API for the internal api_http library."""

from .errors import (
    ApiHttpError,
    ConflictError,
    ForbiddenError,
    InternalServerError,
    NotFoundError,
    ResponseHandlingError,
    RouteConfigurationError,
    UnauthorizedError,
    ValidationError,
)
from .dto import BaseDto, DtoRelation, dto_relation
from .framework import (
    Controller,
    build_urlpatterns,
    controller,
    delete,
    get,
    patch,
    post,
    put,
    use,
)
from .responses import (
    CreatedResponse,
    ErrorResponse,
    JsonApiResponse,
    NoContentResponse,
    OkResponse,
)

__all__ = [
    "ApiHttpError",
    "BaseDto",
    "ConflictError",
    "Controller",
    "CreatedResponse",
    "DtoRelation",
    "ErrorResponse",
    "ForbiddenError",
    "InternalServerError",
    "JsonApiResponse",
    "NoContentResponse",
    "NotFoundError",
    "OkResponse",
    "ResponseHandlingError",
    "RouteConfigurationError",
    "UnauthorizedError",
    "ValidationError",
    "build_urlpatterns",
    "controller",
    "delete",
    "dto_relation",
    "get",
    "patch",
    "post",
    "put",
    "use",
]
