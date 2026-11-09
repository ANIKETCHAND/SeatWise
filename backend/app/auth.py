"""JWT verification and role resolution.

The frontend authenticates with Supabase Auth and forwards the resulting
access token to this backend. Every request's authorization header is verified
here against Supabase's JWKS (asymmetric keys), the legacy HS256 JWT secret,
or verified against Supabase Auth, and the caller's role is loaded from profiles.
Demo tokens are strictly rejected in production and only accepted in isolated test runners.
"""

from __future__ import annotations

import os
import time
from typing import Callable, Set

import httpx
import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWK, algorithms

from .config import get_settings
from .database.client import require_db

_JWKS_CACHE: dict = {"keys": None, "fetched_at": 0.0}
JWKS_TTL_SECONDS = 3600

DEFAULT_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {
        "dashboard.view",
        "users.view",
        "users.create",
        "users.update",
        "users.deactivate",
        "users.reset_password",
        "roles.assign",
        "programs.manage",
        "batches.manage",
        "students.view",
        "students.create",
        "students.update",
        "students.import",
        "faculty.manage",
        "timetable.view",
        "timetable.create",
        "timetable.update",
        "rooms.view",
        "rooms.manage",
        "examinations.view",
        "examinations.create",
        "examinations.update",
        "examinations.archive",
        "seating.generate",
        "seating.modify",
        "seating.validate",
        "seating.publish",
        "attendance.manage",
        "reports.view",
        "reports.export",
        "settings.manage",
        "audit_logs.view",
        "student.seat_lookup.self",
    },
    "exam_staff": {
        "dashboard.view",
        "examinations.view",
        "examinations.create",
        "examinations.update",
        "rooms.view",
        "seating.generate",
        "seating.modify",
        "seating.validate",
        "seating.publish",
        "students.view",
        "students.import",
        "attendance.manage",
        "reports.view",
        "reports.export",
        "timetable.view",
    },
    "faculty": {
        "dashboard.view",
        "timetable.view",
        "timetable.create",
        "timetable.update",
        "examinations.view",
        "seating.generate",
        "seating.modify",
        "seating.validate",
        "attendance.manage",
        "reports.view",
        "reports.export",
        "students.view",
    },
    "student": {
        "dashboard.view",
        "student.seat_lookup.self",
    },
}


class AuthContext:
    def __init__(
        self,
        user_id: str,
        email: str | None,
        role: str,
        full_name: str,
        username: str | None = None,
        department: str | None = None,
        account_status: str = "active",
        must_change_password: bool = False,
        permissions: Set[str] | None = None,
    ):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.full_name = full_name
        self.username = username
        self.department = department
        self.account_status = account_status
        self.must_change_password = must_change_password
        self.permissions: Set[str] = set(permissions or set())

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_exam_staff(self) -> bool:
        return self.role == "exam_staff"

    @property
    def is_faculty(self) -> bool:
        return self.role == "faculty"

    @property
    def is_student(self) -> bool:
        return self.role == "student"

    def has_permission(self, permission_key: str) -> bool:
        """Administrators possess all permissions; other roles verify assigned keys."""
        if self.is_admin:
            return True
        return permission_key in self.permissions


def is_demo_mode_allowed() -> bool:
    """Demo authentication tokens are strictly forbidden in production.

    Allowed ONLY within pytest suites or when explicitly set to testing environment.
    """
    settings = get_settings()
    if settings.is_production:
        return False
    return bool(os.environ.get("PYTEST_CURRENT_TEST") or settings.environment.lower() == "testing")


def _fetch_jwks() -> list:
    settings = get_settings()
    now = time.monotonic()
    if _JWKS_CACHE["keys"] is None or now - _JWKS_CACHE["fetched_at"] > JWKS_TTL_SECONDS:
        url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _JWKS_CACHE["keys"] = resp.json().get("keys", [])
        _JWKS_CACHE["fetched_at"] = now
    return _JWKS_CACHE["keys"] or []


def verify_token(token: str) -> dict:
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")

    # 1) Legacy symmetric secret, if configured
    if settings.supabase_jwt_secret:
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require": ["exp", "sub"]},
            )
        except jwt.PyJWTError:
            pass

    # 2) Asymmetric JWKS
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if kid:
            for key_data in _fetch_jwks():
                if key_data.get("kid") == kid:
                    try:
                        public_key = algorithms.RSAAlgorithm.from_jwk(
                            jwt.PyJWK(key_data).key.to_json()
                        )
                    except Exception:
                        public_key = PyJWK(key_data).key
                    try:
                        return jwt.decode(
                            token,
                            public_key,
                            algorithms=[header.get("alg", "RS256")],
                            audience="authenticated",
                            options={"require": ["exp", "sub"]},
                        )
                    except jwt.PyJWTError as exc:
                        raise HTTPException(status_code=401, detail="Token verification failed.") from exc
    except Exception:
        pass

    # 3) Fallback verification directly with Supabase Auth service
    try:
        db = require_db()
        user_resp = db.auth.get_user(token)
        if user_resp and user_resp.user:
            u = user_resp.user
            meta = getattr(u, "user_metadata", {}) or {}
            return {
                "sub": u.id,
                "email": u.email,
                "user_metadata": meta,
            }
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token verification failed.") from exc

    raise HTTPException(status_code=401, detail="Invalid token or signature.")


def get_auth(request: Request) -> AuthContext:
    """FastAPI dependency: verify the bearer token and load authoritative role from database."""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    raw_token = header[7:].strip()

    if raw_token.startswith("demo-token-"):
        if not is_demo_mode_allowed():
            raise HTTPException(
                status_code=401,
                detail="Demo authentication is disabled in this environment. Please log in with Supabase Auth.",
            )
        role = raw_token.replace("demo-token-", "")
        if role not in ("admin", "faculty", "exam_staff", "student"):
            role = "admin"
        return AuthContext(
            user_id=f"demo-{role}",
            email=f"{role}@jainuniversity.ac.in",
            role=role,
            full_name=f"Demo {role.replace('_', ' ').title()}",
            username=role,
            account_status="active",
            permissions=DEFAULT_ROLE_PERMISSIONS.get(role, set()),
        )

    claims = verify_token(raw_token)
    user_id = claims["sub"]
    email = claims.get("email")

    db = require_db()
    try:
        profile_res = (
            db.table("profiles")
            .select("id,role,full_name,username,department,account_status,must_change_password")
            .eq("id", user_id)
            .single()
            .execute()
        )
        data = profile_res.data or {}
    except Exception:
        data = {}

    role = data.get("role", "student")
    full_name = data.get("full_name") or ""
    username = data.get("username")
    department = data.get("department")
    account_status = data.get("account_status", "active")
    must_change_password = bool(data.get("must_change_password", False))

    if account_status in ("deactivated", "suspended"):
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Please contact the administrator.",
        )

    # Resolve active permissions from role_permissions and user_permissions
    permissions = set(DEFAULT_ROLE_PERMISSIONS.get(role, set()))
    try:
        rp_res = (
            db.table("role_permissions")
            .select("permission_key")
            .eq("role", role)
            .eq("enabled", True)
            .execute()
        )
        if rp_res.data:
            permissions = {row["permission_key"] for row in rp_res.data}

        up_res = (
            db.table("user_permissions")
            .select("permission_key")
            .eq("user_id", user_id)
            .execute()
        )
        if up_res.data:
            for row in up_res.data:
                permissions.add(row["permission_key"])
    except Exception:
        # Fallback to in-code default permissions if tables are loading
        pass

    return AuthContext(
        user_id=user_id,
        email=email,
        role=role,
        full_name=full_name,
        username=username,
        department=department,
        account_status=account_status,
        must_change_password=must_change_password,
        permissions=permissions,
    )


def require_admin(auth: AuthContext = Depends(get_auth)) -> AuthContext:
    if auth.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator privileges required.")
    return auth


def require_staff(auth: AuthContext = Depends(get_auth)) -> AuthContext:
    """Admin or examination staff."""
    if auth.role not in ("admin", "exam_staff"):
        raise HTTPException(status_code=403, detail="Examination staff privileges required.")
    return auth


def require_staff_or_faculty(auth: AuthContext = Depends(get_auth)) -> AuthContext:
    if auth.role not in ("admin", "exam_staff", "faculty"):
        raise HTTPException(status_code=403, detail="Staff or faculty privileges required.")
    return auth


def require_student(auth: AuthContext = Depends(get_auth)) -> AuthContext:
    if auth.role != "student" and auth.role != "admin":
        raise HTTPException(status_code=403, detail="Student privileges required.")
    return auth


def require_authenticated(auth: AuthContext = Depends(get_auth)) -> AuthContext:
    return auth


def require_permission(permission_key: str) -> Callable[[AuthContext], AuthContext]:
    """Dependency factory checking that the caller holds the given RBAC permission."""

    def dependency(auth: AuthContext = Depends(get_auth)) -> AuthContext:
        if not auth.has_permission(permission_key):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission_key} required.",
            )
        return auth

    return dependency
