"""Routes: authentication & current user."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..auth import AuthContext, get_auth
from ..database.client import require_db
from ..schemas.index import MeResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=MeResponse)
def me(auth: AuthContext = Depends(get_auth)) -> MeResponse:
    return MeResponse(
        user_id=auth.user_id, email=auth.email, role=auth.role, full_name=auth.full_name
    )


@router.get("/status")
def status(auth: AuthContext = Depends(get_auth)) -> dict:
    """Database connectivity as observed by the backend."""
    try:
        require_db().table("programs").select("id", count="exact").limit(1).execute()
        db_ok = True
    except Exception:
        db_ok = False
    return {"authenticated": True, "role": auth.role, "database": "ok" if db_ok else "unreachable"}
