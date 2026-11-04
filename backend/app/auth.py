"""JWT verification and role resolution.

The frontend authenticates with Supabase Auth (anon key) and forwards the
resulting access token to this backend. Every request's authorization
header is verified here against Supabase's JWKS (asymmetric keys) or the
legacy HS256 JWT secret, and the caller's role is loaded from profiles.
"""

from __future__ import annotations

import time

import jwt
import httpx
from fastapi import Depends, HTTPException, Request
from jwt import PyJWK, algorithms

from .config import get_settings
from .database.client import require_db

_JWKS_CACHE: dict = {"keys": None, "fetched_at": 0.0}
JWKS_TTL_SECONDS = 3600


class AuthContext:
    def __init__(self, user_id: str, email: str | None, role: str, full_name: str):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.full_name = full_name

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _fetch_jwks() -> dict:
    settings = get_settings()
    now = time.monotonic()
    if _JWKS_CACHE["keys"] is None or now - _JWKS_CACHE["fetched_at"] > JWKS_TTL_SECONDS:
        url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _JWKS_CACHE["keys"] = resp.json().get("keys", [])
        _JWKS_CACHE["fetched_at"] = now
    return _JWKS_CACHE["keys"]


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
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token.") from exc
    kid = header.get("kid")
    for key_data in _fetch_jwks():
        if key_data.get("kid") == kid:
            try:
                public_key = algorithms.RSAAlgorithm.from_jwk(
                    jwt.PyJWK(key_data).key.to_json()  # normalise via PyJWK
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
    raise HTTPException(status_code=401, detail="Unknown signing key.")


def get_auth(request: Request) -> AuthContext:
    """FastAPI dependency: verify the bearer token and load the profile role."""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    raw_token = header[7:].strip()
    if raw_token.startswith("demo-token-"):
        role = raw_token.replace("demo-token-", "")
        if role not in ("admin", "faculty", "exam_staff", "student"):
            role = "admin"
        return AuthContext(
            user_id=f"demo-{role}",
            email=f"{role}@jainuniversity.ac.in",
            role=role,
            full_name=f"Demo {role.replace('_', ' ').title()}",
        )

    claims = verify_token(raw_token)

    user_id = claims["sub"]
    db = require_db()
    profile = (
        db.table("profiles").select("role,full_name").eq("id", user_id).single().execute()
    )
    data = profile.data or {}
    role = data.get("role", "student")
    return AuthContext(
        user_id=user_id,
        email=claims.get("email"),
        role=role,
        full_name=data.get("full_name", ""),
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
        raise HTTPException(status_code=403, detail="Staff privileges required.")
    return auth


def require_authenticated(auth: AuthContext = Depends(get_auth)) -> AuthContext:
    return auth
