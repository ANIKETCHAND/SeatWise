"""Routes: Seating plans archive, history, and unified listing."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_authenticated
from ..database.client import require_db

router = APIRouter(tags=["seating-history"])


@router.get("/seating/plans")
@router.get("/plans")
@router.get("/history")
def list_seating_plans(
    kind: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    """List seating plans across classroom and examination categories."""
    db = require_db()
    query = (
        db.table("seating_plans")
        .select("*,rooms(name),batches(program,semester,section,programs(code)),examinations(name,exam_date,session)")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if kind:
        query = query.eq("kind", kind)
    plans = query.execute().data or []
    return {"plans": plans, "history": plans, "total": len(plans)}
