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
