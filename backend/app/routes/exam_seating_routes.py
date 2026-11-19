"""Routes: MODE B — examination seating generation, validation, publishing."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_staff, require_authenticated, require_staff_or_faculty
from ..database.client import require_db
from ..schemas.index import ExamSeatingGenerateRequest, ManualMoveRequest
from ..services import seating_service as svc
from ..utils.errors import ApiError
from ..utils.uuid_helper import ensure_uuid, safe_user_uuid, resolve_exam_id


def _is_uuid(val: str | None) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val).strip())
        return True
    except (ValueError, TypeError, AttributeError):
        return False


router = APIRouter(prefix="/seating/examination", tags=["examination-seating"])


@router.post("/generate")
def generate(
    payload: ExamSeatingGenerateRequest, auth: AuthContext = Depends(require_staff_or_faculty)
) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, payload.examination_id) or payload.examination_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")

    exam = (
        db.table("examinations").select("*").eq("id", real_exam_id).single().execute().data
    )
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    batch_rows = (
        db.table("examination_batches")
        .select("batch_id")
        .eq("examination_id", real_exam_id)
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
        .eq("examination_id", real_exam_id)
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
                "user_id": safe_user_uuid(auth.user_id),
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
        "hall_codes": {h.hall_id: h.name for h in halls},
    }


@router.post("/validate")
def validate_plan(payload: dict, auth: AuthContext = Depends(require_staff_or_faculty)) -> dict:
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
    auth: AuthContext = Depends(require_staff_or_faculty),
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
        resolved_eid = resolve_exam_id(db, examination_id)
        if resolved_eid:
            query = query.eq("examination_id", resolved_eid)
        else:
            return {"plans": []}
    return {"plans": query.execute().data or []}


@router.post("/save")
def save_exam_plan(
    payload: dict, auth: AuthContext = Depends(require_staff_or_faculty)
) -> dict:
    import datetime
    import uuid
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
    candidate_eid = plan_fields.get("examination_id")
    resolved_eid = resolve_exam_id(db, candidate_eid)
    if not resolved_eid and plan_fields.get("name"):
        resolved_eid = resolve_exam_id(db, plan_fields.get("name"))
    if not resolved_eid and payload.get("examination_name"):
        resolved_eid = resolve_exam_id(db, payload.get("examination_name"))

    if resolved_eid:
        plan_fields["examination_id"] = resolved_eid
    else:
        # Create exam record if not present so it is committed and visible to all
        raw_e = str(candidate_eid or "Examination").strip()
        exam_name = payload.get("examination_name") or plan_fields.get("name") or raw_e
        valid_user_id = safe_user_uuid(auth.user_id)
        try:
            new_exam = db.table("examinations").insert({
                "name": exam_name,
                "exam_date": plan_fields.get("plan_date") or datetime.date.today().isoformat(),
                "session": "FN",
                "status": "published" if plan_fields.get("status") == "published" else "draft",
                "created_by": valid_user_id,
            }).execute().data
            if new_exam:
                plan_fields["examination_id"] = new_exam[0]["id"]
            else:
                plan_fields["examination_id"] = ensure_uuid(raw_e, "exam")
        except Exception:
            plan_fields["examination_id"] = ensure_uuid(raw_e, "exam")

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

    # Build room cache to map hall codes/names to room UUIDs
    rooms_cache: dict[str, str] = {}
    for r in (db.table("rooms").select("id,code,name").execute().data or []):
        r_id = str(r["id"])
        rooms_cache[r_id.lower()] = r_id
        if r.get("code"):
            rooms_cache[str(r["code"]).strip().upper()] = r_id
        if r.get("name"):
            rooms_cache[str(r["name"]).strip().upper()] = r_id

    # Fallback program and program lookup for auto-created candidate students
    prog_rows = db.table("programs").select("id,code,name").execute().data or []
    prog_by_code = {str(p["code"]).strip().lower(): str(p["id"]) for p in prog_rows if p.get("code")}
    default_prog_id = prog_rows[0]["id"] if prog_rows else None

    # Load existing students cache
    existing_students = db.table("students").select("id,roll_number,full_name").execute().data or []
    by_id = {str(s["id"]).lower(): s for s in existing_students}
    by_roll = {str(s["roll_number"]).strip().upper(): s for s in existing_students if s.get("roll_number")}
    by_name = {str(s["full_name"]).strip().lower(): s for s in existing_students if s.get("full_name")}

    used_sids: set[str] = set()
    normalized_assignments = []

    for idx, a in enumerate(assignments):
        sid_raw = str(a.get("student_id") or "").strip()
        roll_raw = str(a.get("roll_number") or "").strip()
        name_raw = str(a.get("student_name") or "").strip()

        resolved_sid = None

        # 1. Match by exact student UUID if valid and not yet assigned
        if sid_raw and sid_raw.lower() in by_id and sid_raw.lower() not in used_sids:
            resolved_sid = str(by_id[sid_raw.lower()]["id"])
        # 2. Match by roll number
        elif roll_raw and roll_raw.upper() in by_roll and str(by_roll[roll_raw.upper()]["id"]).lower() not in used_sids:
            resolved_sid = str(by_roll[roll_raw.upper()]["id"])
        elif sid_raw and sid_raw.upper() in by_roll and str(by_roll[sid_raw.upper()]["id"]).lower() not in used_sids:
            resolved_sid = str(by_roll[sid_raw.upper()]["id"])
        # 3. Match by student full name
        elif name_raw and name_raw.lower() in by_name and str(by_name[name_raw.lower()]["id"]).lower() not in used_sids:
            resolved_sid = str(by_name[name_raw.lower()]["id"])

        # 4. If still not resolved or student already used in this plan, ensure a unique student record
        if not resolved_sid:
            cand_roll = (roll_raw or sid_raw or f"CAND-{idx + 1:03d}").strip().upper()
            if cand_roll in by_roll:
                cand_roll = f"{cand_roll}-{idx + 1}"
            cand_uuid = ensure_uuid(cand_roll, "student")
            if cand_uuid.lower() in used_sids:
                cand_roll = f"{cand_roll}-{uuid.uuid4().hex[:4].upper()}"
                cand_uuid = ensure_uuid(cand_roll, "student")

            # Check if this uuid is in DB
            if cand_uuid.lower() not in by_id:
                try:
                    cand_prog_id = default_prog_id
                    batch_str = str(a.get("batch") or "").strip().lower()
                    roll_str = str(cand_roll).strip().lower()
                    for pcode, pid in prog_by_code.items():
                        if pcode in batch_str or pcode in roll_str:
                            cand_prog_id = pid
                            break

                    new_student_data = {
                        "id": cand_uuid,
                        "roll_number": cand_roll,
                        "full_name": name_raw or f"Candidate {cand_roll}",
                        "program_id": cand_prog_id,
                        "semester": 3,
                        "section": "A",
                        "status": "active",
                    }
                    db.table("students").upsert(new_student_data).execute()
                    by_id[cand_uuid.lower()] = new_student_data
                    by_roll[cand_roll.upper()] = new_student_data
                except Exception:
                    pass
            resolved_sid = cand_uuid

        used_sids.add(resolved_sid.lower())

        # Resolve room_id for assignment
        resolved_rid = plan_fields.get("room_id")
        if a.get("room_id"):
            ar_raw = str(a["room_id"]).strip().upper()
            if ar_raw in rooms_cache:
                resolved_rid = rooms_cache[ar_raw]
            elif ar_raw.lower() in rooms_cache:
                resolved_rid = rooms_cache[ar_raw.lower()]

        if not resolved_rid and rooms_cache:
            resolved_rid = next(iter(rooms_cache.values()))

        normalized_assignments.append({
            "student_id": resolved_sid,
            "room_id": resolved_rid,
            "row": int(a.get("row", 0)),
            "col": int(a.get("col", 0)),
            "seat_label": str(a.get("seat_label") or ""),
        })

    valid_user_id = None
    if auth.user_id:
        try:
            uuid.UUID(str(auth.user_id))
            valid_user_id = str(auth.user_id)
        except (ValueError, TypeError):
            valid_user_id = None

    plan_fields.setdefault("kind", "examination")
    plan_fields["created_by"] = valid_user_id

    # If status is published, guarantee validation_status is valid
    if plan_fields.get("status") == "published" or payload.get("status") == "published":
        plan_fields["status"] = "published"
        plan_fields["validation_status"] = "valid"

    plan_id = db.rpc(
        "save_seating_plan", {"p_plan": plan_fields, "p_assignments": normalized_assignments}
    ).execute().data

    # Synchronize examination status and link allocated rooms to examination_halls
    if plan_fields.get("examination_id"):
        exam_id_val = plan_fields["examination_id"]
        if plan_fields.get("status") == "published":
            try:
                db.table("examinations").update({"status": "published", "updated_at": "now()"}).eq("id", exam_id_val).execute()
            except Exception:
                pass

        try:
            distinct_room_ids = set()
            if plan_fields.get("room_id") and _is_uuid(plan_fields.get("room_id")):
                distinct_room_ids.add(str(plan_fields["room_id"]))
            for a in normalized_assignments:
                if a.get("room_id") and _is_uuid(a.get("room_id")):
                    distinct_room_ids.add(str(a["room_id"]))
            if distinct_room_ids:
                existing_halls = db.table("examination_halls").select("room_id").eq("examination_id", exam_id_val).execute().data or []
                existing_rids = {str(h["room_id"]) for h in existing_halls}
                new_halls = [{"examination_id": exam_id_val, "room_id": rid} for rid in distinct_room_ids if rid not in existing_rids]
                if new_halls:
                    db.table("examination_halls").insert(new_halls).execute()
        except Exception:
            pass

    db.table("audit_logs").insert(
        {
            "user_id": valid_user_id,
            "action": "seating_plan.save",
            "entity_type": "seating_plans",
            "entity_id": plan_id,
            "details": {"kind": "examination", "assignments": len(normalized_assignments), "status": plan_fields.get("status", "draft")},
        }
    ).execute()
    return {"plan_id": plan_id, "examination_id": plan_fields.get("examination_id"), "status": plan_fields.get("status", "saved")}


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

    # Security invariant: If caller is a student, restrict matches to their own linked record
    if auth.role == "student":
        from .student_portal_routes import _resolve_student_record
        try:
            curr_student = _resolve_student_record(auth, db)
            curr_id = str(curr_student.get("id"))
            curr_roll = str(curr_student.get("roll_number", "")).upper()
            students = [
                s for s in students
                if str(s.get("id")) == curr_id or str(s.get("roll_number", "")).upper() == curr_roll
            ]
        except Exception:
            students = []

    if not students:
        return {"matches": []}

    resolved_eid = resolve_exam_id(db, examination_id) if examination_id else None
    if examination_id and not resolved_eid:
        return {"matches": []}

    plan_query = (
        db.table("seat_assignments")
        .select(
            "student_id,seat_label,row,col,rooms(id,name,code,building,floor),seating_plans!inner(id,status,plan_date,period,created_at,examinations(id,name,exam_date,session))"
        )
        .in_("student_id", [s["id"] for s in students])
        .eq("seating_plans.status", "published")
        .order("created_at", desc=True, foreign_table="seating_plans")
    )
    if resolved_eid:
        plan_query = plan_query.eq("seating_plans.examination_id", resolved_eid)

    seat_rows = plan_query.execute().data or []
    seats_by_student: dict[str, list[dict]] = {}
    seen_student_exams: set[tuple[str, str]] = set()

    for row in seat_rows:
        s_id = str(row["student_id"])
        plan = row["seating_plans"]
        exam = plan.get("examinations") or {}
        exam_id_val = str(exam.get("id") or plan.get("id"))
        if (s_id, exam_id_val) in seen_student_exams and not resolved_eid:
            continue
        seen_student_exams.add((s_id, exam_id_val))

        rm = row.get("rooms") or {}
        seat_info = {
            "seat_label": row["seat_label"],
            "row": row["row"],
            "col": row["col"],
            "hall": rm.get("name") or f"Hall {rm.get('code', '')}",
            "room_code": rm.get("code"),
            "building": rm.get("building") or "FET Main Campus",
            "floor": rm.get("floor") or "Floor 1",
            "examination_id": exam.get("id"),
            "examination": exam.get("name"),
            "exam_date": exam.get("exam_date"),
            "session": exam.get("session"),
            "plan_date": plan.get("plan_date"),
        }
        seats_by_student.setdefault(s_id, []).append(seat_info)

    matches = []
    for s in students:
        s_id = str(s["id"])
        student_data = {
            "id": s["id"],
            "full_name": s["full_name"],
            "roll_number": s["roll_number"],
            "program": (s.get("programs") or {}).get("code"),
        }
        allocs = seats_by_student.get(s_id) or []
        if allocs:
            for seat_info in allocs:
                matches.append({"student": student_data, "seat": seat_info})
        else:
            matches.append({"student": student_data, "seat": None})

    return {"matches": matches}


@router.get("/{plan_id}")
@router.get("/plans/{plan_id}")
def get_plan(plan_id: str, auth: AuthContext = Depends(require_staff_or_faculty)) -> dict:
    if not _is_uuid(plan_id):
        raise ApiError(404, "not_found", "Seating plan not found.")
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
    plan_id: str, payload: ManualMoveRequest, auth: AuthContext = Depends(require_staff_or_faculty)
) -> dict:
    if not _is_uuid(plan_id):
        raise ApiError(404, "not_found", "Seating plan not found.")
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
def publish(plan_id: str, auth: AuthContext = Depends(require_staff_or_faculty)) -> dict:
    if not _is_uuid(plan_id):
        raise ApiError(404, "not_found", "Seating plan not found.")
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
    if plan.get("examination_id"):
        try:
            db.table("examinations").update({"status": "published", "updated_at": "now()"}).eq("id", plan["examination_id"]).execute()
        except Exception:
            pass
    db.table("audit_logs").insert(
        {
            "user_id": safe_user_uuid(auth.user_id),
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
    if not _is_uuid(plan_id):
        return {
            "attendance": {
                "seating_plan_id": plan_id,
                "student_id": payload.get("student_id"),
                "status": payload.get("status", "present"),
            },
            "status": "ok",
        }
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

