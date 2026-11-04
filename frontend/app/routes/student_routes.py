"""Routes: student management (CRUD, search, filters, CSV/Excel import)."""

from __future__ import annotations

import csv
import io
import re

import openpyxl
from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse

from ..auth import AuthContext, require_admin, require_staff_or_faculty
from ..database.client import require_db
from ..schemas.index import StudentCreate, StudentUpdate
from ..utils.errors import ApiError

router = APIRouter(prefix="/students", tags=["students"])

ROLL_RE = re.compile(r"^[A-Za-z0-9\-/]+$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

STUDENT_IMPORT_COLUMNS = ["roll_number", "full_name", "program", "semester", "section", "email", "phone", "student_id"]


@router.get("")
def list_students(
    q: str | None = None,
    program_id: str | None = None,
    semester: int | None = Query(default=None, ge=1, le=10),
    section: str | None = None,
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    auth: AuthContext = Depends(require_staff_or_faculty),
) -> dict:
    db = require_db()
    query = (
        db.table("students")
        .select("*, programs(code,name)", count="exact")
        .order("full_name")
        .range(offset, offset + limit - 1)
    )
    if q:
        query = query.or_(f"full_name.ilike.%{q}%,roll_number.ilike.%{q}%,email.ilike.%{q}%")
    if program_id:
        query = query.eq("program_id", program_id)
    if semester is not None:
        query = query.eq("semester", semester)
    if section:
        query = query.eq("section", section)
    if status:
        query = query.eq("status", status)
    response = query.execute()
    return {"students": response.data or [], "total": response.count or 0}


@router.post("")
def create_student(payload: StudentCreate, auth: AuthContext = Depends(require_admin)) -> dict:
    db = require_db()
    _validate_student(db, payload)
    row = db.table("students").insert(payload.model_dump(exclude_none=True)).execute().data
    return {"student": row[0]}


@router.patch("/{student_id}")
def update_student(
    student_id: str, payload: StudentUpdate, auth: AuthContext = Depends(require_admin)
) -> dict:
    db = require_db()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ApiError(400, "empty_update", "Nothing to update.")
    if "roll_number" in updates:
        _check_roll_unique(db, updates["roll_number"], exclude_id=student_id)
    if "email" in updates and updates["email"]:
        if not EMAIL_RE.match(updates["email"]):
            raise ApiError(422, "invalid_email", "Invalid email format.")
    updates["updated_at"] = "now()"
    row = db.table("students").update(updates).eq("id", student_id).execute().data
    if not row:
        raise ApiError(404, "not_found", "Student not found.")
    return {"student": row[0]}


@router.get("/{student_id}")
def get_student(student_id: str, auth: AuthContext = Depends(require_staff_or_faculty)) -> dict:
    db = require_db()
    row = (
        db.table("students")
        .select("*, programs(code,name)")
        .eq("id", student_id)
        .single()
        .execute()
        .data
    )
    return {"student": row}


@router.post("/import/preview")
async def import_preview(
    file: UploadFile = File(...), auth: AuthContext = Depends(require_admin)
) -> dict:
    rows = await _read_student_rows(file)
    db = require_db()
    programs = {p["code"]: p["id"] for p in db.table("programs").select("id,code").execute().data or []}
    existing_rolls = {
        r["roll_number"] for r in db.table("students").select("roll_number").execute().data or []
    }

    valid, errors, seen_rolls = [], [], set()
    for i, row in enumerate(rows, start=2):
        roll = (row.get("roll_number") or "").strip()
        name = (row.get("full_name") or "").strip()
        program = (row.get("program") or "").strip()
        semester = (row.get("semester") or "").strip()
        section = (row.get("section") or "").strip()
        email = (row.get("email") or "").strip()
        if not roll:
            errors.append({"row": i, "issue": "Missing roll number"})
            continue
        if not ROLL_RE.match(roll):
            errors.append({"row": i, "issue": f"Invalid roll number characters: {roll!r}"})
            continue
        if not name:
            errors.append({"row": i, "issue": f"Missing full name for roll {roll}"})
            continue
        if roll in seen_rolls:
            errors.append({"row": i, "issue": f"Duplicate roll number in file: {roll}"})
            continue
        seen_rolls.add(roll)
        if roll in existing_rolls:
            errors.append({"row": i, "issue": f"Roll number already exists in the system: {roll}"})
            continue
        if program not in programs:
            errors.append({"row": i, "issue": f"Unknown program code: {program!r}"})
            continue
        try:
            semester_i = int(semester)
            assert 1 <= semester_i <= 10
        except (ValueError, AssertionError):
            errors.append({"row": i, "issue": f"Invalid semester: {semester!r}"})
            continue
        if not section:
            errors.append({"row": i, "issue": f"Missing section for roll {roll}"})
            continue
        if email and not EMAIL_RE.match(email):
            errors.append({"row": i, "issue": f"Invalid email for roll {roll}: {email!r}"})
            continue
        valid.append(
            {
                "roll_number": roll,
                "full_name": name,
                "program_id": programs[program],
                "semester": semester_i,
                "section": section,
                "email": email or None,
                "phone": (row.get("phone") or "").strip() or None,
                "student_id": (row.get("student_id") or "").strip() or None,
            }
        )

    return {
        "preview": {
            "total_rows": len(rows),
            "valid_rows": len(valid),
            "error_rows": len(errors),
            "errors": errors[:200],
            "students": valid,
        }
    }


@router.post("/import")
@router.post("/import/commit")
async def import_commit(payload: dict, auth: AuthContext = Depends(require_admin)) -> dict:
    students = payload.get("students") or []
    if not students:
        raise ApiError(400, "nothing_to_import", "No valid students supplied.")
    db = require_db()
    inserted = db.table("students").insert(students).execute().data
    return {"imported": len(inserted)}


@router.get("/export/csv")
def export_csv(
    program_id: str | None = None,
    auth: AuthContext = Depends(require_staff_or_faculty),
) -> StreamingResponse:
    db = require_db()
    query = db.table("students").select("*, programs(code)").order("roll_number")
    if program_id:
        query = query.eq("program_id", program_id)
    rows = query.execute().data or []
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["student_id", "roll_number", "full_name", "program", "semester", "section", "email", "phone", "status"])
    for s in rows:
        writer.writerow(
            [
                s.get("student_id") or "",
                s["roll_number"],
                s["full_name"],
                (s.get("programs") or {}).get("code", ""),
                s["semester"],
                s["section"],
                s.get("email") or "",
                s.get("phone") or "",
                s["status"],
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="students.csv"'},
    )


def _validate_student(db, payload: StudentCreate) -> None:
    if not ROLL_RE.match(payload.roll_number):
        raise ApiError(422, "invalid_roll", "Roll number contains invalid characters.")
    _check_roll_unique(db, payload.roll_number)
    if payload.email and not EMAIL_RE.match(payload.email):
        raise ApiError(422, "invalid_email", "Invalid email format.")
    program = db.table("programs").select("id").eq("id", payload.program_id).execute().data
    if not program:
        raise ApiError(404, "not_found", "Program not found.")


def _check_roll_unique(db, roll: str, exclude_id: str | None = None) -> None:
    query = db.table("students").select("id").eq("roll_number", roll)
    if exclude_id:
        query = query.neq("id", exclude_id)
    if query.execute().data:
        raise ApiError(409, "duplicate_roll", f"Duplicate roll number detected: {roll}")


async def _read_student_rows(file: UploadFile) -> list[dict]:
    content = await file.read()
    filename = (file.filename or "").lower()
    if filename.endswith(".csv"):
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        return [{(k or "").strip(): v for k, v in row.items()} for row in reader]
    if filename.endswith((".xlsx", ".xlsm")):
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        header = next(rows_iter, None)
        if not header:
            return []
        keys = [str(h).strip() if h else "" for h in header]
        out = []
        for values in rows_iter:
            if values is None or all(v in (None, "") for v in values):
                continue
            out.append({k: ("" if v is None else v) for k, v in zip(keys, values)})
        return out
    raise ApiError(422, "unsupported_format", "Upload a .csv or .xlsx file.")
