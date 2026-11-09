"""Routes: timetable import (preview/commit), viewing, conflict search."""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from ..auth import AuthContext, require_admin, require_authenticated
from ..database.client import require_db
from ..services.timetable_parser import parse_timetable_workbook
from ..utils.errors import ApiError
from ..utils.uuid_helper import safe_user_uuid

router = APIRouter(prefix="/timetable", tags=["timetable"])

ALLOWED_IMPORT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
}
MAX_IMPORT_BYTES = 30 * 1024 * 1024


@router.post("/preview")
@router.post("/import/preview")
async def import_preview(
    file: UploadFile = File(...), auth: AuthContext = Depends(require_admin)
) -> dict:
    content = await file.read()
    if len(content) > MAX_IMPORT_BYTES:
        raise ApiError(413, "file_too_large", "File exceeds the 30 MB limit.")
    filename = (file.filename or "").lower()
    if not filename.endswith((".xlsx", ".xlsm")):
        raise ApiError(422, "unsupported_format", "Upload the timetable workbook as .xlsx.")
    try:
        report = parse_timetable_workbook(content)
    except ValueError as exc:
        raise ApiError(422, "invalid_workbook", str(exc))
    except Exception as exc:  # malformed workbook
        raise ApiError(422, "parse_failed", f"Could not parse the workbook: {exc}")

    db = require_db()
    import_row = (
        db.table("import_jobs")
        .insert(
            {
                "job_type": "timetable",
                "status": "previewed",
                "filename": file.filename or "timetable.xlsx",
                "total_rows": report.stats["entries"],
                "valid_rows": report.stats["entries"] - report.stats["errors"],
                "error_rows": report.stats["errors"],
                "report": {"stats": report.stats},
                "created_by": safe_user_uuid(auth.user_id),
            }
        )
        .execute()
        .data[0]
    )
    return {"job_id": import_row["id"], "stats": report.stats, "report": report.as_dict()}


@router.post("/import/commit")
async def import_commit(
    file: UploadFile = File(...),
    job_id: str = Form(...),
    auth: AuthContext = Depends(require_admin),
) -> dict:
    if not job_id:
        raise ApiError(400, "missing_job", "Supply the preview job_id.")
    content = await file.read()
    if len(content) > MAX_IMPORT_BYTES:
        raise ApiError(413, "file_too_large", "File exceeds the 30 MB limit.")

    try:
        report = parse_timetable_workbook(content)
    except ValueError as exc:
        raise ApiError(422, "invalid_workbook", str(exc))
    except Exception as exc:  # malformed workbook
        raise ApiError(422, "parse_failed", f"Could not parse the workbook: {exc}")

    if report.stats["errors"]:
        raise ApiError(
            422,
            "errors_present",
            "The workbook contains hard errors; fix them before importing.",
            {"error_count": report.stats["errors"]},
        )

    entries = [
        {
            "program": e.program,
            "semester": e.semester,
            "section": e.section,
            "day": e.day,
            "period_start": e.period_start,
            "period_end": e.period_end,
            "slot_type": e.slot_type,
            "subject_label": e.subject_label,
            "subject_code": e.subject_code,
            "faculty_name": e.faculty_name,
            "room_name": e.room_name,
            "is_multi_period": e.is_multi_period,
        }
        for e in report.entries
    ]
    db = require_db()
    result = db.rpc(
        "import_timetable_data",
        {
            "p_batches": json.dumps(report.batches),
            "p_subjects": json.dumps(report.subjects),
            "p_faculty": json.dumps(report.faculty),
            "p_rooms": json.dumps(report.rooms),
            "p_entries": json.dumps(entries),
        },
    ).execute().data

    db.table("import_jobs").update(
        {"status": "completed", "report": {"stats": report.stats, "result": result}}
    ).eq("id", job_id).execute()
    db.table("audit_logs").insert(
        {
            "user_id": safe_user_uuid(auth.user_id),
            "action": "timetable.import",
            "entity_type": "timetable_entries",
            "details": {"job_id": job_id, "result": result},
        }
    ).execute()
    return {"imported": result}


@router.get("/search")
def search_timetable(
    q: str = Query(min_length=1, max_length=100),
    auth: AuthContext = Depends(require_authenticated),
) -> list:
    db = require_db()
    query = (
        db.table("timetable_entries")
        .select("*, batches(semester,section,programs(code))")
        .or_(f"subject_label.ilike.%{q}%,faculty_name.ilike.%{q}%,room_name.ilike.%{q}%")
        .limit(100)
    )
    return query.execute().data or []


@router.get("")
def get_timetable(
    program_id: str | None = None,
    semester: int | None = Query(default=None, ge=1, le=10),
    section: str | None = None,
    day: str | None = Query(default=None, pattern="^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$"),
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    batch = None
    if program_id and semester is not None and section:
        batch = (
            db.table("batches")
            .select("id,programs(code,name),class_teacher")
            .eq("program_id", program_id)
            .eq("semester", semester)
            .eq("section", section)
            .eq("status", "active")
            .single()
            .execute()
            .data
        )
        if not batch:
            raise ApiError(404, "batch_not_found", "No active batch matches the selection.")
        query = (
            db.table("timetable_entries")
            .select("*")
            .eq("batch_id", batch["id"])
            .order("day")
            .order("period_start")
        )
    else:
        query = (
            db.table("timetable_entries")
            .select("*, batches(semester,section,programs(code))")
            .order("day")
            .order("period_start")
            .limit(200)
        )
    if day:
        query = query.eq("day", day)
    entries = query.execute().data or []
    return {"batch": batch, "entries": entries}


@router.get("/sessions")
def find_session(
    program_id: str,
    semester: int = Query(ge=1, le=10),
    section: str = ...,
    day: str = Query(pattern="^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$"),
    period: int = Query(ge=1, le=12),
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    """Resolve the timetable session covering (batch, day, period).

    A multi-period lab entered at its second period still resolves to the
    session that started earlier.
    """
    db = require_db()
    batch = (
        db.table("batches")
        .select("id")
        .eq("program_id", program_id)
        .eq("semester", semester)
        .eq("section", section)
        .single()
        .execute()
        .data
    )
    if not batch:
        raise ApiError(404, "batch_not_found", "No batch matches the selection.")
    entries = (
        db.table("timetable_entries")
        .select("*")
        .eq("batch_id", batch["id"])
        .eq("day", day)
        .lte("period_start", period)
        .gte("period_end", period)
        .execute()
        .data
        or []
    )
    if not entries:
        return {"session": None, "reason": "no_session"}
    session = entries[0]
    reason = "ok"
    if session["slot_type"] in ("lunch", "free"):
        reason = session["slot_type"]
    return {"session": session, "reason": reason}


@router.get("/conflicts")
def conflicts(auth: AuthContext = Depends(require_admin)) -> dict:
    """Room/time collisions across the imported timetable."""
    db = require_db()
    rows = (
        db.table("timetable_entries")
        .select("room_name,day,period_start,period_end,slot_type,subject_label,batches(semester,section,programs(code))")
        .not_.is_("room_name", "null")
        .in_("slot_type", ["class", "lab", "sametime"])
        .execute()
        .data
        or []
    )
    usage: dict[tuple, list[str]] = {}
    subjects: dict[tuple, set[str]] = {}
    for e in rows:
        b = e.get("batches") or {}
        label = f"{(b.get('programs') or {}).get('code', '?')}-S{b.get('semester')}-{b.get('section')}"
        for p in range(e["period_start"], e["period_end"] + 1):
            key = (e["room_name"], e["day"], p)
            usage.setdefault(key, []).append(label)
            subjects.setdefault(key, set()).add(e["subject_label"])
    real_conflicts = []
    shared = 0
    for (room, day, p), batches in sorted(usage.items()):
        if len(set(batches)) < 2:
            continue
        if len(subjects[(room, day, p)]) == 1:
            shared += 1
        else:
            real_conflicts.append(
                {
                    "room": room,
                    "day": day,
                    "period": p,
                    "batches": sorted(set(batches)),
                    "subjects": sorted(subjects[(room, day, p)]),
                }
            )
    return {"conflicts": real_conflicts, "shared_sessions": shared}


@router.get("/subjects")
def list_subjects(
    q: str | None = None, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    db = require_db()
    query = db.table("subjects").select("*, subject_codes(code)").order("name")
    if q:
        query = query.ilike("name", f"%{q}%")
    rows = query.execute().data or []
    for s in rows:
        s["codes"] = [c["code"] for c in s.pop("subject_codes", [])]
    return {"subjects": rows}
