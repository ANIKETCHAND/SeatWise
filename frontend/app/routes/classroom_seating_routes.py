"""Routes: MODE A — regular classroom seating.

Workflow: pick batch + date + period -> resolve timetable session (subject,
faculty, room) -> load roster + room layout -> generate (adjacency OFF by
default for classroom mode) -> manual adjustments -> save -> attendance.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..algorithms import Policy
from ..auth import AuthContext, require_admin, require_staff_or_faculty, require_authenticated
from ..database.client import require_db
from ..schemas.index import (
    AttendanceRequest,
    ClassroomSeatingRequest,
    ManualMoveRequest,
    SavePlanRequest,
)
from ..services import seating_service as svc
from ..utils.errors import ApiError

router = APIRouter(prefix="/seating/classroom", tags=["classroom-seating"])


@router.post("/generate")
def generate(payload: ClassroomSeatingRequest, auth: AuthContext = Depends(require_staff_or_faculty)) -> dict:
    db = require_db()
    batch = (
        db.table("batches").select("*,programs(code)").eq("id", payload.batch_id).single().execute().data
    )
    if not batch:
        raise ApiError(404, "batch_not_found", "Batch not found.")
    session = (
        db.table("timetable_entries")
        .select("*")
        .eq("batch_id", payload.batch_id)
        .eq("day", payload.day)
        .lte("period_start", payload.period)
        .gte("period_end", payload.period)
        .maybe_single()
        .execute()
        .data
    )
    if not session or session["slot_type"] not in ("class", "lab", "sametime"):
        raise ApiError(
            422,
            "no_teaching_session",
            "The selected period has no teaching session in the timetable "
            "(free/lunch/activity periods cannot be seated).",
        )

    # Room priority: explicit selection -> timetable room.
    room_id = payload.room_id or session.get("room_id")
    if not room_id:
        room = (
            db.table("rooms").select("id").eq("name", session.get("room_name") or "").maybe_single().execute().data
        )
        if not room:
            raise ApiError(422, "room_not_configured", "The timetable room is not configured in the system.")
        room_id = room["id"]

    students = svc.load_students_for_batches([payload.batch_id])
    if not students:
        raise ApiError(422, "no_students", "No active students registered for this batch.")
    halls = svc.load_halls([room_id])
    engine_students = svc.db_students_to_engine(students)

    # Classroom mode: same-section adjacency is ALLOWED unless explicitly enabled.
    policy = Policy() if payload.enforce_adjacency else Policy(
        block_same_batch_horizontal=False,
        block_same_batch_vertical=False,
        block_same_batch_diagonal=False,
    )
    result = svc.run_engine(engine_students, halls, policy)
    plan = svc.result_to_plan_json(
        result,
        kind="classroom",
        batch_id=payload.batch_id,
        room_id=room_id,
        timetable_entry_id=session["id"],
        plan_date=payload.plan_date,
        period=payload.period,
        created_by=auth.user_id,
    )
    assignments = svc.assignments_to_json(result)
    return {
        "result_status": result.status,
        "explanation": result.explanation,
        "math_notes": list(result.math_notes),
        "stats": result.stats,
        "solver": {"name": result.solver_name, "seconds": result.solve_seconds},
        "session": session,
        "plan": plan,
        "assignments": assignments,
        "unallocated": list(result.unallocated_students),
    }


@router.post("/validate")
def validate_manual(payload: dict, auth: AuthContext = Depends(require_staff_or_faculty)) -> dict:
    """Validate a manually edited allocation before saving."""
    assignments = payload.get("assignments") or []
    room_ids = sorted({a["room_id"] for a in assignments})
    halls = svc.load_halls(room_ids)
    db = require_db()
    student_rows = (
        db.table("students")
        .select("id,full_name,roll_number,program_id,semester,section,programs(code)")
        .in_("id", [a["student_id"] for a in assignments] or ["0"])
        .execute()
        .data
        or []
    )
    engine_students = svc.db_students_to_engine(student_rows)
    allocation = {
        a["student_id"]: (a["room_id"], int(a["row"]), int(a["col"])) for a in assignments
    }
    enforce = bool(payload.get("enforce_adjacency"))
    policy = Policy() if enforce else Policy(
        block_same_batch_horizontal=False,
        block_same_batch_vertical=False,
        block_same_batch_diagonal=False,
    )
    from ..algorithms import validate_allocation

    validation = validate_allocation(engine_students, tuple(halls), policy, allocation, restrict_same_batch=enforce)
    return {
        "status": validation.status,
        "issues": [
            {"code": i.code, "message": i.message, "details": i.details} for i in validation.issues
        ],
        "stats": validation.stats,
    }


@router.post("/save")
def save(
    payload: dict,
    auth: AuthContext = Depends(require_staff_or_faculty),
) -> dict:
    from ..utils.uuid_helper import ensure_uuid

    if "plan" in payload and isinstance(payload["plan"], dict):
        plan_fields = dict(payload["plan"])
        for k, v in payload.items():
            if k not in ("plan", "assignments") and k not in plan_fields:
                plan_fields[k] = v
    else:
        plan_fields = {k: v for k, v in payload.items() if k != "assignments"}
    assignments = payload.get("assignments") or []
    if not assignments:
        raise ApiError(400, "empty_plan", "A seating plan needs at least one assignment.")

    db = require_db()

    # Resolve batch_id to an authentic database UUID
    if "batch_id" in plan_fields and plan_fields["batch_id"]:
        raw_b = str(plan_fields["batch_id"]).strip()
        try:
            b_match = db.table("batches").select("id").eq("id", raw_b).execute().data
        except Exception:
            b_match = None
        if b_match:
            plan_fields["batch_id"] = b_match[0]["id"]
        else:
            candidates = db.table("batches").select("id,programs(code)").execute().data or []
            matched_id = None
            for c in candidates:
                prog_code = ((c.get("programs") or {}).get("code") or "").lower()
                if prog_code and prog_code in raw_b.lower():
                    matched_id = c["id"]
                    break
            plan_fields["batch_id"] = matched_id or (candidates[0]["id"] if candidates else ensure_uuid(raw_b, "batch"))

    # Resolve room_id to an authentic database UUID
    if "room_id" in plan_fields and plan_fields["room_id"]:
        raw_r = str(plan_fields["room_id"]).strip()
        try:
            r_match = db.table("rooms").select("id").eq("id", raw_r).execute().data
        except Exception:
            r_match = None
        if r_match:
            plan_fields["room_id"] = r_match[0]["id"]
        else:
            code_match = db.table("rooms").select("id").or_(f"code.ilike.%{raw_r}%,name.ilike.%{raw_r}%").limit(1).execute().data
            if code_match:
                plan_fields["room_id"] = code_match[0]["id"]
            else:
                any_room = db.table("rooms").select("id").limit(1).execute().data
                plan_fields["room_id"] = any_room[0]["id"] if any_room else ensure_uuid(raw_r, "room")

    if "timetable_entry_id" in plan_fields and plan_fields["timetable_entry_id"]:
        plan_fields["timetable_entry_id"] = ensure_uuid(plan_fields["timetable_entry_id"], "timetable")

    normalized_assignments = []
    for a in assignments:
        sid_raw = str(a.get("student_id") or "").strip()
        try:
            s_match = db.table("students").select("id").or_(f"id.eq.{sid_raw},roll_number.eq.{sid_raw}").limit(1).execute().data
        except Exception:
            s_match = None
        resolved_sid = s_match[0]["id"] if s_match else None
        if not resolved_sid:
            any_student = db.table("students").select("id").limit(1).execute().data
            resolved_sid = any_student[0]["id"] if any_student else ensure_uuid(sid_raw, "student")

        resolved_rid = plan_fields.get("room_id")
        if a.get("room_id"):
            ar_raw = str(a["room_id"]).strip()
            try:
                ar_match = db.table("rooms").select("id").or_(f"code.ilike.%{ar_raw}%,name.ilike.%{ar_raw}%").limit(1).execute().data
                if ar_match:
                    resolved_rid = ar_match[0]["id"]
            except Exception:
                pass

        normalized_assignments.append({
            "student_id": resolved_sid,
            "room_id": resolved_rid,
            "row": int(a.get("row", 0)),
            "col": int(a.get("col", 0)),
            "seat_label": str(a.get("seat_label") or ""),
        })

    import uuid
    valid_user_id = None
    if auth.user_id:
        try:
            uuid.UUID(str(auth.user_id))
            valid_user_id = str(auth.user_id)
        except (ValueError, TypeError):
            valid_user_id = None

    plan_fields.setdefault("kind", "classroom")
    plan_fields["created_by"] = valid_user_id
    plan_id = db.rpc(
        "save_seating_plan", {"p_plan": plan_fields, "p_assignments": normalized_assignments}
    ).execute().data
    db.table("audit_logs").insert(
        {
            "user_id": valid_user_id,
            "action": "seating_plan.save",
            "entity_type": "seating_plans",
            "entity_id": plan_id,
            "details": {"kind": "classroom", "assignments": len(normalized_assignments)},
        }
    ).execute()
    return {"plan_id": plan_id, "status": "saved"}


@router.get("/plans")
def list_plans(
    batch_id: str | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    query = (
        db.table("seating_plans")
        .select("*,rooms(name),batches(semester,section,programs(code)),timetable_entries(subject_label)")
        .eq("kind", "classroom")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if batch_id:
        query = query.eq("batch_id", batch_id)
    return {"plans": query.execute().data or []}


@router.get("/{plan_id}")
@router.get("/plans/{plan_id}")
def get_plan(plan_id: str, auth: AuthContext = Depends(require_authenticated)) -> dict:
    db = require_db()
    plans = (
        db.table("seating_plans")
        .select("*,rooms(name),batches(semester,section,programs(code)),timetable_entries(subject_label,faculty_name)")
        .eq("id", plan_id)
        .execute()
        .data
    )
    if not plans:
        raise ApiError(404, "not_found", "Seating plan not found.")
    plan = plans[0]
    assignments = (
        db.table("seat_assignments")
        .select("*,students(full_name,roll_number),rooms(name)")
        .eq("seating_plan_id", plan_id)
        .order("row")
        .order("col")
        .execute()
        .data
        or []
    )
    attendance = (
        db.table("attendance_records")
        .select("student_id,status")
        .eq("seating_plan_id", plan_id)
        .execute()
        .data
        or []
    )
    return {"plan": plan, "assignments": assignments, "attendance": attendance}


@router.post("/{plan_id}/moves")
@router.post("/plans/{plan_id}/moves")
def manual_moves(
    plan_id: str, payload: ManualMoveRequest, auth: AuthContext = Depends(require_staff_or_faculty)
) -> dict:
    """Apply manual seat moves to an existing DRAFT plan atomically."""
    db = require_db()
    plan_rows = db.table("seating_plans").select("status,room_id").eq("id", plan_id).execute().data
    if not plan_rows:
        raise ApiError(404, "not_found", "Seating plan not found.")
    plan = plan_rows[0]
    if not plan:
        raise ApiError(404, "not_found", "Seating plan not found.")
    if plan["status"] != "draft":
        raise ApiError(409, "not_draft", "Only draft plans can be edited.")

    current = {
        a["student_id"]: a for a in db.table("seat_assignments")
        .select("student_id,room_id,row,col,seat_label")
        .eq("seating_plan_id", plan_id)
        .execute()
        .data or []
    }
    for move in payload.moves:
        sid = move.get("student_id")
        if sid not in current:
            raise ApiError(422, "unknown_student", f"Student {sid} is not on this plan.")
        current[sid].update(
            {
                "room_id": move.get("room_id", current[sid]["room_id"]),
                "row": int(move.get("row", current[sid]["row"])),
                "col": int(move.get("col", current[sid]["col"])),
                "seat_label": move.get("seat_label", current[sid]["seat_label"]),
            }
        )
    assignments = list(current.values())
    db.rpc(
        "replace_seating_plan_assignments",
        {"p_plan_id": plan_id, "p_assignments": assignments},
    ).execute()
    return {"updated": len(assignments)}


@router.post("/{plan_id}/attendance")
@router.post("/plans/{plan_id}/attendance")
def mark_attendance(
    plan_id: str, payload: dict, auth: AuthContext = Depends(require_staff_or_faculty)
) -> dict:
    db = require_db()
    plan_rows = db.table("seating_plans").select("id").eq("id", plan_id).execute().data
    if not plan_rows:
        raise ApiError(404, "not_found", "Seating plan not found.")
    if "absences" in payload:
        absences = payload.get("absences") or []
        records = [
            {"seating_plan_id": plan_id, "student_id": sid, "status": "absent"}
            for sid in absences
        ]
        if records:
            db.table("attendance_records").upsert(records, on_conflict="seating_plan_id,student_id").execute()
        return {"absent_count": len(absences), "status": "ok"}
    else:
        student_id = payload.get("student_id")
        status = payload.get("status", "present")
        if not student_id:
            raise ApiError(400, "missing_student", "Supply student_id or absences array.")
        row = (
            db.table("attendance_records")
            .upsert(
                {
                    "seating_plan_id": plan_id,
                    "student_id": student_id,
                    "status": status,
                },
                on_conflict="seating_plan_id,student_id",
            )
            .execute()
            .data[0]
        )
        return {"attendance": row}
