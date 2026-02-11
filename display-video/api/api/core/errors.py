from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status
from starlette.exceptions import HTTPException as StarletteHTTPException


def problem_details(
    *,
    status_code: int,
    title: str,
    detail: str,
    code: str,
    type_: str = "about:blank",
    instance: Optional[str] = None,
    errors: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "type": type_,
        "title": title,
        "status": status_code,
        "detail": detail,
        "code": code,
    }
    if instance:
        payload["instance"] = instance
    if errors is not None:
        payload["errors"] = errors
    return payload


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(request: Request, exc: RequestValidationError):
        errs: List[Dict[str, str]] = []
        for e in exc.errors():
            loc = e.get("loc", [])
            field = ".".join([str(x) for x in loc if x not in ("body", "query", "path")]) or "request"
            msg = e.get("msg", "Invalid value")
            errs.append({"field": field, "message": msg})

        pd = problem_details(
            status_code=status.HTTP_400_BAD_REQUEST,
            title="Validation Error",
            detail="Request validation failed",
            code="VALIDATION_ERROR",
            type_="https://example.com/problems/validation",
            instance=str(request.url.path),
            errors=errs,
        )
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=pd, media_type="application/problem+json")

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        pd = problem_details(
            status_code=exc.status_code,
            title="HTTP Error",
            detail=exc.detail if isinstance(exc.detail, str) else "HTTP error",
            code="HTTP_ERROR",
            type_="https://example.com/problems/http",
            instance=str(request.url.path),
        )
        return JSONResponse(status_code=exc.status_code, content=pd, media_type="application/problem+json")

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        pd = problem_details(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            title="Internal Server Error",
            detail="An unexpected error occurred",
            code="INTERNAL_ERROR",
            type_="https://example.com/problems/internal",
            instance=str(request.url.path),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=pd,
            media_type="application/problem+json",
        )
