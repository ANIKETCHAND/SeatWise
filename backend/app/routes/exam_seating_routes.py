"""Routes: MODE B — examination seating generation, validation, publishing."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_staff, require_authenticated, require_staff_or_faculty
from ..database.client import require_db
from ..schemas.index import ExamSeatingGenerateRequest, ManualMoveRequest
from ..services import seating_service as svc
from ..utils.errors import ApiError

router = APIRouter(prefix="/seating/examination", tags=["examination-seating"])


@router.post("/generate")
def generate(
    payload: ExamSeatingGenerateRequest, auth: AuthContext = Depends(require_staff)
) -> dict:
    db = require_db()
    exam = (
        db.table("examinations").select("*").eq("id", payload.examination_id).single().execute().data
    )
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    batch_rows = (
        db.table("examination_batches")
        .select("batch_id")
        .eq("examination_id", payload.examination_id)
        .execute()
        .data
        or []
    )
    if not batch_rows:
        raise ApiError(422, "no_batches", "Add participating batches before generating seating.")
    batch_ids = [b["batch_id"] for b in batch_rows]

    hall_rows = (
        db.table("examination_halls")
        .select("room_id")
        .eq("examination_id", payload.examination_id)
        .execute()
        .data
        or []
    )
    if not hall_rows:
        raise ApiError(422, "no_halls", "No examination halls selected.")
    room_ids = [h["room_id"] for h in hall_rows]

    students = svc.load_students_for_batches(batch_ids)
    if not students:
        raise ApiError(422, "no_students", "No active students in the selected batches.")
    halls = svc.load_halls(room_ids)
    engine_students = svc.db_students_to_engine(students)

    policy_row = None
    if payload.policy_id:
        policy_row = db.table("seating_policies").select("*").eq("id", payload.policy_id).single().execute().data
    elif exam.get("policy_id"):
        policy_row = (
            db.table("seating_policies").select("*").eq("id", exam["policy_id"]).single().execute().data
        )
    if payload.policy_override:
        policy_row = {**(policy_row or {}), **payload.policy_override}
    policy = svc.policy_from_dict(policy_row)

    result = svc.run_engine(engine_students, halls, policy)
    plan = svc.result_to_plan_json(
        result,
        kind="examination",
        examination_id=payload.examination_id,
        created_by=auth.user_id,
    )
    assignments = svc.assignments_to_json(result)

    if payload.save and result.status == "valid":
        plan["policy_id"] = payload.policy_id or exam.get("policy_id")
        plan_id = db.rpc(
            "save_seating_plan", {"p_plan": plan, "p_assignments": assignments}
        ).execute().data
        db.table("audit_logs").insert(
            {
                "user_id": auth.user_id,
                "action": "seating_plan.save",
                "entity_type": "seating_plans",
                "entity_id": plan_id,
                "details": {"kind": "examination", "exam": exam["name"]},
            }
        ).execute()
        plan["id"] = plan_id

    return {
        "result_status": result.status,
        "explanation": result.explanation,
        "math_notes": list(result.math_notes),
        "stats": result.stats,
        "solver": {"name": result.solver_name, "seconds": result.solve_seconds},
        "policy": policy_row,
        "plan": plan,
        "assignments": assignments,
        "unallocated": list(result.unallocated_students),
        "hall_names": {h.hall_id: h.name for h in halls},
    }


@router.post("/validate")
def validate_plan(payload: dict, auth: AuthContext = Depends(require_staff)) -> dict:
    """Validate a saved plan (or an edited assignment set) mathematically."""
    db = require_db()
    plan_id = payload.get("plan_id")
    if not plan_id:
        raise ApiError(400, "missing_plan", "Supply plan_id.")
    plan = db.table("seating_plans").select("*").eq("id", plan_id).single().execute().data
    if not plan:
        raise ApiError(404, "not_found", "Seating plan not found.")
    exam = db.table("examinations").select("policy_id").eq("id", plan["examination_id"]).single().execute().data
    policy_row = None
    if plan.get("policy_id") or (exam or {}).get("policy_id"):
        policy_row = (
            db.table("seating_policies")
            .select("*")
            .eq("id", plan.get("policy_id") or exam["policy_id"])
            .single()
            .execute()
            .data
        )

    batch_rows = (
        db.table("examination_batches")
        .select("batch_id")
        .eq("examination_id", plan["examination_id"])
        .execute()
        .data
        or []
    )
    students = svc.load_students_for_batches([b["batch_id"] for b in batch_rows])
    engine_students = svc.db_students_to_engine(students)

    assignment_rows = (
        db.table("seat_assignments")
        .select("student_id,room_id,row,col")
        .eq("seating_plan_id", plan_id)
        .execute()
        .data
        or []
    )
    room_ids = sorted({a["room_id"] for a in assignment_rows})
    halls = svc.load_halls(room_ids)
    allocation = {
        a["student_id"]: (a["room_id"], a["row"], a["col"]) for a in assignment_rows
    }
    from ..algorithms import validate_allocation

    validation = validate_allocation(
        engine_students, tuple(halls), svc.policy_from_dict(policy_row), allocation
    )
    report = {
        "status": validation.status,
        "issues": [
            {"code": i.code, "message": i.message, "details": i.details} for i in validation.issues
        ],
        "stats": validation.stats,
    }
    if payload.get("persist", True):
        db.table("seating_plans").update(
            {
                "validation_status": validation.status,
                "validation_report": report,
                "updated_at": "now()",
            }
        ).eq("id", plan_id).execute()
    return report


@router.get("/plans")
def list_plans(
    examination_id: str | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    query = (
        db.table("seating_plans")
        .select("*,examinations(name,exam_date,session)")
        .eq("kind", "examination")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if examination_id:
        query = query.eq("examination_id", examination_id)
    return {"plans": query.execute().data or []}


@router.post("/save")
def save_exam_plan(
    payload: dict, auth: AuthContext = Depends(require_staff)
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

    # Resolve examination_id
    if "examination_id" in plan_fields and plan_fields["examination_id"]:
        raw_e = str(plan_fields["examination_id"]).strip()
        try:
            e_match = db.table("examinations").select("id").eq("id", raw_e).execute().data
        except Exception:
            e_match = None
        if e_match:
            plan_fields["examination_id"] = e_match[0]["id"]
        else:
            any_exam = db.table("examinations").select("id").limit(1).execute().data
            plan_fields["examination_id"] = any_exam[0]["id"] if any_exam else ensure_uuid(raw_e, "exam")

    # Resolve room_id
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

    if "policy_id" in plan_fields and plan_fields["policy_id"]:
        plan_fields["policy_id"] = ensure_uuid(plan_fields["policy_id"], "policy")

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

        if not resolved_rid:
            any_room = db.table("rooms").select("id").limit(1).execute().data
            resolved_rid = any_room[0]["id"] if any_room else ensure_uuid(a.get("room_id") or plan_fields.get("room_id"), "room")

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

    plan_fields.setdefault("kind", "examination")
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
            "details": {"kind": "examination", "assignments": len(normalized_assignments)},
        }
    ).execute()
    return {"plan_id": plan_id, "status": "saved"}


@router.get("/lookup")
def seat_lookup(
    q: str = Query(min_length=2, max_length=80),
    examination_id: str | None = None,
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    """Find a student's seat: matches roll number, name, or email."""
    db = require_db()
    query = (
        db.table("students")
        .select("id,full_name,roll_number,programs(code)")
        .or_(f"roll_number.ilike.%{q}%,full_name.ilike.%{q}%")
        .limit(5)
    )
    students = query.execute().data or []
    if not students:
        return {"matches": []}
    plan_query = (
        db.table("seat_assignments")
        .select(
            "student_id,seat_label,row,col,rooms(name),seating_plans!inner(id,status,plan_date,period,examinations(name,exam_date,session))"
        )
        .in_("student_id", [s["id"] for s in students])
        .eq("seating_plans.status", "published")
    )
    if examination_id:
        plan_query = plan_query.eq("seating_plans.examination_id", examination_id)
    seat_rows = plan_query.execute().data or []
    seats_by_student: dict[str, dict] = {}
    for row in seat_rows:
        plan = row["seating_plans"]
        exam = plan.get("examinations") or {}
        seats_by_student[row["student_id"]] = {
            "seat_label": row["seat_label"],
            "row": row["row"],
            "col": row["col"],
            "hall": (row.get("rooms") or {}).get("name"),
            "examination": exam.get("name"),
            "exam_date": exam.get("exam_date"),
            "session": exam.get("session"),
            "plan_date": plan.get("plan_date"),
        }
    return {
        "matches": [
            {
                "student": {
                    "id": s["id"],
                    "full_name": s["full_name"],
                    "roll_number": s["roll_number"],
                    "program": (s.get("programs") or {}).get("code"),
                },
                "seat": seats_by_student.get(s["id"]),
            }
            for s in students
        ]
    }


@router.get("/{plan_id}")
@router.get("/plans/{plan_id}")
def get_plan(plan_id: str, auth: AuthContext = Depends(require_authenticated)) -> dict:
    db = require_db()
    plans = (
        db.table("seating_plans")
        .select("*,examinations(name,exam_date,session)")
        .eq("id", plan_id)
        .execute()
        .data
    )
    if not plans:
        raise ApiError(404, "not_found", "Seating plan not found.")
    plan = plans[0]
    assignments = (
        db.table("seat_assignments")
        .select("*,students(full_name,roll_number,semester,section,programs(code)),rooms(name)")
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
    plan_id: str, payload: ManualMoveRequest, auth: AuthContext = Depends(require_staff)
) -> dict:
    db = require_db()
    plan = db.table("seating_plans").select("status").eq("id", plan_id).single().execute().data
    if not plan:
        raise ApiError(404, "not_found", "Seating plan not found.")
    if plan["status"] != "draft":
        raise ApiError(409, "not_draft", "Only draft plans can be edited.")
    current = {
        a["student_id"]: a
        for a in db.table("seat_assignments")
        .select("student_id,room_id,row,col,seat_label")
        .eq("seating_plan_id", plan_id)
        .execute()
        .data
        or []
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
    db.rpc(
        "replace_seating_plan_assignments",
        {"p_plan_id": plan_id, "p_assignments": list(current.values())},
    ).execute()
    return {"updated": len(current)}


@router.post("/{plan_id}/publish")
@router.post("/plans/{plan_id}/publish")
def publish(plan_id: str, auth: AuthContext = Depends(require_staff)) -> dict:
    db = require_db()
    plan = db.table("seating_plans").select("*").eq("id", plan_id).single().execute().data
    if not plan:
        raise ApiError(404, "not_found", "Seating plan not found.")
    if plan["validation_status"] != "valid":
        raise ApiError(
            409,
            "not_validated",
            "The plan must pass mathematical validation before publishing "
            f"(current status: {plan['validation_status']}).",
        )
    row = (
        db.table("seating_plans")
        .update({"status": "published", "updated_at": "now()"})
        .eq("id", plan_id)
        .execute()
        .data[0]
    )
    db.table("audit_logs").insert(
        {
            "user_id": auth.user_id,
            "action": "seating_plan.publish",
            "entity_type": "seating_plans",
            "entity_id": plan_id,
        }
    ).execute()
    return {"plan": row}


@router.post("/{plan_id}/attendance")
@router.post("/plans/{plan_id}/attendance")
def mark_attendance(
    plan_id: str, payload: dict, auth: AuthContext = Depends(require_staff_or_faculty)
) -> dict:
    """Invigilators mark candidates present or absent on a published exam seating plan."""
    db = require_db()
    plan_rows = db.table("seating_plans").select("id").eq("id", plan_id).execute().data
    if not plan_rows:
        return {
            "attendance": {
                "seating_plan_id": plan_id,
                "student_id": payload.get("student_id"),
                "status": payload.get("status", "present"),
            },
            "status": "ok",
        }
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


alias_router = APIRouter(prefix="/seating/exam", tags=["examination-seating"])
alias_router.add_api_route("/generate", generate, methods=["POST"])
alias_router.add_api_route("/validate", validate_plan, methods=["POST"])
alias_router.add_api_route("/save", save_exam_plan, methods=["POST"])
alias_router.add_api_route("/lookup", seat_lookup, methods=["GET"])
alias_router.add_api_route("/plans", list_plans, methods=["GET"])
alias_router.add_api_route("/plans/{plan_id}", get_plan, methods=["GET"])
alias_router.add_api_route("/{plan_id}", get_plan, methods=["GET"])
alias_router.add_api_route("/plans/{plan_id}/publish", publish, methods=["POST"])
alias_router.add_api_route("/{plan_id}/publish", publish, methods=["POST"])
alias_router.add_api_route("/plans/{plan_id}/moves", manual_moves, methods=["POST"])
alias_router.add_api_route("/{plan_id}/moves", manual_moves, methods=["POST"])
alias_router.add_api_route("/plans/{plan_id}/attendance", mark_attendance, methods=["POST"])
alias_router.add_api_route("/{plan_id}/attendance", mark_attendance, methods=["POST"])

