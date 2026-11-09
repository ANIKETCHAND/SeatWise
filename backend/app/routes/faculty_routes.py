"""Routes: faculty management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_admin, require_authenticated
from ..database.client import require_db
from ..schemas.index import FacultyCreate, FacultyUpdate
from ..utils.errors import ApiError

router = APIRouter(prefix="/faculty", tags=["faculty"])


@router.get("")
def list_faculty(
    q: str | None = None,
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    query = (
        db.table("faculty")
        .select("*, faculty_subjects(subjects(name))", count="exact")
        .order("full_name")
        .range(offset, offset + limit - 1)
    )
    if q:
        query = query.or_(f"full_name.ilike.%{q}%,email.ilike.%{q}%,department.ilike.%{q}%")
    if status:
        query = query.eq("status", status)
    response = query.execute()
    faculty = []
    for f in response.data or []:
        subjects = sorted({(fs.get("subjects") or {}).get("name") for fs in f.pop("faculty_subjects", []) if fs.get("subjects")})
        f["subjects"] = [s for s in subjects if s]
        faculty.append(f)
    return {"faculty": faculty, "total": response.count or 0}


@router.post("")
def create_faculty(payload: FacultyCreate, auth: AuthContext = Depends(require_admin)) -> dict:
    db = require_db()
    code = payload.faculty_code or f"FAC-{abs(hash(payload.full_name)) % (10**8)}"
    existing = db.table("faculty").select("id").eq("faculty_code", code).execute().data
    if existing:
        raise ApiError(409, "duplicate_faculty", "A faculty member with this code already exists.")
    row = (
        db.table("faculty")
        .insert({**payload.model_dump(exclude_none=True), "faculty_code": code})
        .execute()
        .data[0]
    )
    return {"faculty": row}


@router.patch("/{faculty_id}")
def update_faculty(
    faculty_id: str, payload: FacultyUpdate, auth: AuthContext = Depends(require_admin)
) -> dict:
    db = require_db()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ApiError(400, "empty_update", "Nothing to update.")
    updates["updated_at"] = "now()"
    row = db.table("faculty").update(updates).eq("id", faculty_id).execute().data
    if not row:
        raise ApiError(404, "not_found", "Faculty member not found.")
    return {"faculty": row[0]}


@router.get("/{faculty_id}/timetable")
def faculty_timetable(
    faculty_id: str, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    """Weekly teaching schedule for one faculty member."""
    db = require_db()
    faculty = db.table("faculty").select("full_name").eq("id", faculty_id).single().execute().data
    if not faculty:
        raise ApiError(404, "not_found", "Faculty member not found.")
    rows = (
        db.table("timetable_entries")
        .select(
            "day,period_start,period_end,slot_type,subject_label,is_multi_period,"
            "room_name,batches(semester,section,programs(code))"
        )
        .eq("faculty_id", faculty_id)
        .in_("slot_type", ["class", "lab", "sametime"])
        .order("day")
        .order("period_start")
        .execute()
        .data
        or []
    )
    entries = []
    for r in rows:
        batch = r.get("batches") or {}
        entries.append(
            {
                "day": r["day"],
                "period_start": r["period_start"],
                "period_end": r["period_end"],
                "slot_type": r["slot_type"],
                "subject": r["subject_label"],
                "room": r.get("room_name"),
                "batch": (
                    f"{(batch.get('programs') or {}).get('code', '?')}-"
                    f"S{batch.get('semester', '?')}-{batch.get('section', '')}"
                ),
                "is_multi_period": r.get("is_multi_period", False),
            }
        )
    return {"faculty": faculty, "entries": entries}
