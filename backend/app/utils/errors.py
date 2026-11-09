"""Consistent API error handling and global exception handlers.

Standardizes error responses across FastAPI endpoints, ensuring structured
error payloads for client consumption while preserving compatibility with
FastAPI default validation error format.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("seatwise.errors")


class ApiError(Exception):
    """Domain-specific API Exception with structured error code and details."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


def install_error_handlers(app: FastAPI) -> None:
    """Register custom exception handlers for ApiError and unhandled errors."""

    try:
        from postgrest.exceptions import APIError as PostgrestAPIError

        @app.exception_handler(PostgrestAPIError)
        async def postgrest_error_handler(request: Request, exc: PostgrestAPIError):
            code = getattr(exc, "code", None)
            err_str = str(exc)
            if code == "PGRST116" or "PGRST116" in err_str:
                return JSONResponse(
                    status_code=404,
                    content={
                        "error": {
                            "code": "not_found",
                            "message": "The requested resource was not found.",
                            "details": {"path": request.url.path},
                        }
                    },
                )
            if code in ("23502", "23503", "22P02") or "23502" in err_str or "23503" in err_str or "22P02" in err_str:
                return JSONResponse(
                    status_code=422,
                    content={
                        "error": {
                            "code": code or "validation_error",
                            "message": getattr(exc, "message", err_str),
                            "details": getattr(exc, "details", None),
                        }
                    },
                )
            if code == "23505" or "23505" in err_str:
                return JSONResponse(
                    status_code=409,
                    content={
                        "error": {
                            "code": code or "conflict",
                            "message": getattr(exc, "message", err_str),
                            "details": getattr(exc, "details", None),
                        }
                    },
                )
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": code or "database_error",
                        "message": getattr(exc, "message", err_str),
                        "details": getattr(exc, "details", None),
                    }
                },
            )
    except ImportError:
        pass

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError):
        logger.warning(
            "ApiError on %s %s: [%s] %s",
            request.method,
            request.url.path,
            exc.code,
            exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Do not catch Starlette/FastAPI HTTPExceptions or ApiErrors here
        if isinstance(exc, (StarletteHTTPException, ApiError, RequestValidationError)):
            raise exc

        logger.exception(
            "Unhandled internal exception on %s %s: %s",
            request.method,
            request.url.path,
            str(exc),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "internal_server_error",
                    "message": "An internal server error occurred.",
                    "details": {"path": request.url.path},
                }
            },
        )
