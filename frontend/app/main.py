"""SeatWise Backend Application Entrypoint.

Smart Classroom & Examination Seating Management System for Jain University.
"""

from __future__ import annotations

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database.client import DatabaseNotConfigured
from .routes import (
    admin_routes,
    auth_routes,
    classroom_seating_routes,
    dashboard_routes,
    exam_routes,
    exam_seating_routes,
    faculty_routes,
    math_routes,
    report_routes,
    room_routes,
    seating_routes,
    student_portal_routes,
    student_routes,
    timetable_routes,
    university_routes,
)
from .utils.errors import install_error_handlers

settings = get_settings()

app = FastAPI(
    title="SeatWise API",
    version="1.0.0",
    description="Smart Classroom & Examination Seating Management System for Jain University",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
install_error_handlers(app)


@app.exception_handler(DatabaseNotConfigured)
async def db_not_configured_handler(request: Request, exc: DatabaseNotConfigured):
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "database_not_configured",
                "message": str(exc),
                "details": {"hint": "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"},
            }
        },
    )


# Mount routers under api prefix
prefix = settings.api_v1_prefix

app.include_router(auth_routes.router, prefix=prefix)
app.include_router(admin_routes.router, prefix=prefix)
app.include_router(student_portal_routes.router, prefix=prefix)
app.include_router(university_routes.router, prefix=prefix)
app.include_router(timetable_routes.router, prefix=prefix)
app.include_router(student_routes.router, prefix=prefix)
app.include_router(faculty_routes.router, prefix=prefix)
app.include_router(room_routes.router, prefix=prefix)
app.include_router(classroom_seating_routes.router, prefix=prefix)
app.include_router(exam_routes.router, prefix=prefix)
app.include_router(exam_seating_routes.router, prefix=prefix)
app.include_router(seating_routes.router, prefix=prefix)
app.include_router(math_routes.router, prefix=prefix)
app.include_router(dashboard_routes.router, prefix=prefix)
app.include_router(report_routes.router, prefix=prefix)

# Route aliases for frontend client compatibility
app.include_router(exam_routes.alias_router, prefix=prefix)
app.include_router(exam_seating_routes.alias_router, prefix=prefix)


@app.get("/health")
@app.get(f"{prefix}/health")
def health():
    return {
        "status": "healthy",
        "database_configured": settings.is_database_configured,
        "api_version": "1.0.0",
    }


frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))


@app.get("/")
@app.get(f"{prefix}/info")
def root(request: Request):
    # If the client requests application/json, return API info metadata
    accept = request.headers.get("accept", "")
    if "application/json" in accept or "text/html" not in accept:
        return {
            "app": "SeatWise",
            "institution": "Jain University",
            "description": "Smart Classroom & Examination Seating Management System",
            "version": "1.0.0",
            "docs": "/docs",
        }
    # Otherwise, if HTML is requested and frontend dist exists, serve index.html
    if os.path.isdir(frontend_dist):
        return FileResponse(os.path.join(frontend_dist, "index.html"))
    return {
        "app": "SeatWise",
        "institution": "Jain University",
        "description": "Smart Classroom & Examination Seating Management System",
        "version": "1.0.0",
        "docs": "/docs",
    }


# Mount built frontend static assets if dist exists
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes or docs
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
