"""Routes: university structure (programs & batches)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_admin, require_authenticated
from ..database.client import require_db
from ..schemas.index import BatchCreate, BatchUpdate, ProgramCreate, ProgramUpdate
from ..utils.errors import ApiError

router = APIRouter(prefix="/university", tags=["university"])


@router.get("/programs")
def list_programs(
    include_inactive: bool = False,
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    query = db.table("programs").select("*, batches(count)").order("code")
    if not include_inactive:
        query = query.eq("status", "active")
    data = query.execute().data or []
    return {
        "programs": [
            {**p, "batch_count": (p.get("batches") or [{}])[0].get("count", 0)}
            for p in data
        ]
    }


@router.get("/programs/tree")
def get_program_tree(auth: AuthContext = Depends(require_authenticated)) -> list:
    db = require_db()
    programs = (
        db.table("programs")
        .select("*, batches(*)")
        .eq("status", "active")
        .order("code")
        .execute()
        .data
        or []
    )
    return programs


@router.post("/programs")
def create_program(
    payload: ProgramCreate, auth: AuthContext = Depends(require_admin)
) -> dict:
    db = require_db()
    existing = db.table("programs").select("id").eq("code", payload.code).execute().data
    if existing:
        raise ApiError(409, "duplicate_program", f"Program code {payload.code} already exists.")
    row = (
        db.table("programs")
        .insert({"code": payload.code, "name": payload.name, "description": payload.description})
        .execute()
        .data[0]
    )
    return {"program": row}


@router.patch("/programs/{program_id}")
def update_program(
    program_id: str,
    payload: ProgramUpdate,
    auth: AuthContext = Depends(require_admin),
) -> dict:
    db = require_db()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ApiError(400, "empty_update", "Nothing to update.")
    updates["updated_at"] = "now()"
    row = db.table("programs").update(updates).eq("id", program_id).execute().data
    if not row:
        raise ApiError(404, "not_found", "Program not found.")
    return {"program": row[0]}


@router.get("/batches")
def list_batches(
    program_id: str | None = None,
    semester: int | None = Query(default=None, ge=1, le=10),
    include_inactive: bool = False,
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    query = db.table("batches").select("*, programs(code,name)").order("semester").order("section")
    if program_id:
        query = query.eq("program_id", program_id)
    if semester is not None:
        query = query.eq("semester", semester)
    if not include_inactive:
        query = query.eq("status", "active")
    return {"batches": query.execute().data or []}


@router.post("/batches")
def create_batch(payload: BatchCreate, auth: AuthContext = Depends(require_admin)) -> dict:
    db = require_db()
    program = db.table("programs").select("id").eq("id", payload.program_id).execute().data
    if not program:
        raise ApiError(404, "not_found", "Program not found.")
    existing = (
        db.table("batches")
        .select("id")
        .eq("program_id", payload.program_id)
        .eq("semester", payload.semester)
        .eq("section", payload.section)
        .execute()
        .data
    )
    if existing:
        raise ApiError(409, "duplicate_batch", "This program/semester/section batch already exists.")
    row = (
        db.table("batches")
        .insert(
            {
                "program_id": payload.program_id,
                "semester": payload.semester,
                "section": payload.section,
            }
        )
        .execute()
        .data[0]
    )
    return {"batch": row}


@router.patch("/batches/{batch_id}")
def update_batch(
    batch_id: str, payload: BatchUpdate, auth: AuthContext = Depends(require_admin)
) -> dict:
    db = require_db()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ApiError(400, "empty_update", "Nothing to update.")
    updates["updated_at"] = "now()"
    row = db.table("batches").update(updates).eq("id", batch_id).execute().data
    if not row:
        raise ApiError(404, "not_found", "Batch not found.")
    return {"batch": row[0]}
