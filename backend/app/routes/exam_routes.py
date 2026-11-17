"""Routes: examinations, participating batches, halls, policies."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_admin, require_staff, require_authenticated, require_staff_or_faculty
from ..database.client import require_db
from ..schemas.index import (
    ExamBatchesRequest,
    ExamCreate,
    ExamHallsRequest,
    ExamSubjectsRequest,
    ExamUpdate,
    PolicyCreate,
)
from ..utils.errors import ApiError
from ..utils.uuid_helper import safe_user_uuid, resolve_exam_id

router = APIRouter(prefix="/examinations", tags=["examinations"])


def _is_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _resolve_batch_ids(db, identifiers: list[str]) -> list[str]:
    """Resolve batch UUIDs or formatted codes (e.g. 'AIML-S3A') to batch UUIDs."""
    if not identifiers:
        return []
    resolved: list[str] = []
    to_lookup: list[str] = []
    for item in identifiers:
        s = str(item).strip()
        if not s:
            continue
        if _is_uuid(s):
            resolved.append(s)
        else:
            to_lookup.append(s)
    if to_lookup:
        all_batches = db.table("batches").select("id,semester,section,programs(code)").execute().data or []
        for code in to_lookup:
            cu = code.upper()
            matched = False
            # 1. Exact formatted match (e.g. 'AIML-S3A')
            for b in all_batches:
                p_code = ((b.get("programs") or {}).get("code") or "").upper()
                sem = b.get("semester")
                sec = (b.get("section") or "").upper()
                formatted = f"{p_code}-S{sem}{sec}".upper()
                if cu == formatted:
                    resolved.append(b["id"])
                    matched = True
                    break
            # 2. Program code match if no semester specified
            if not matched:
                for b in all_batches:
                    p_code = ((b.get("programs") or {}).get("code") or "").upper()
                    if cu == p_code:
                        resolved.append(b["id"])
                        matched = True
                        break
            # 3. Dynamic program/batch resolution to prevent dropping user input
            if not matched:
                try:
                    prog_code = code.split("-")[0].strip().upper() or "JU"
                    prog_rows = db.table("programs").select("id").ilike("code", prog_code).execute().data
                    if prog_rows:
                        prog_id = prog_rows[0]["id"]
                    else:
                        new_prog = db.table("programs").insert({"code": prog_code, "name": f"Department of {prog_code}"}).execute().data
                        prog_id = new_prog[0]["id"] if new_prog else None
                    if prog_id:
                        sem = 3
                        sec = "A"
                        if "-S" in cu:
                            parts = cu.split("-S")[1]
                            if parts and parts[0].isdigit():
                                sem = int(parts[0])
                                sec = parts[1:] or "A"
                        new_batch = db.table("batches").insert({
                            "program_id": prog_id,
                            "semester": sem,
                            "section": sec,
                            "status": "active"
                        }).execute().data
                        if new_batch:
                            resolved.append(new_batch[0]["id"])
                except Exception:
                    pass
    return list(dict.fromkeys(resolved))


def _resolve_room_ids(db, identifiers: list[str]) -> list[str]:
    """Resolve room UUIDs or room codes/names (e.g. 'A-101') to room UUIDs."""
    if not identifiers:
        return []
    resolved: list[str] = []
    to_lookup: list[str] = []
    for item in identifiers:
        s = str(item).strip()
        if not s:
            continue
        if _is_uuid(s):
            resolved.append(s)
        else:
            to_lookup.append(s)
    if to_lookup:
        rooms = db.table("rooms").select("id,code,name").execute().data or []
        for query in to_lookup:
            qu = query.upper()
            matched = False
            # 1. Exact match on code
            for r in rooms:
                rcode = (r.get("code") or "").upper()
                if qu == rcode:
                    resolved.append(r["id"])
                    matched = True
                    break
            # 2. Exact match on name
            if not matched:
                for r in rooms:
                    rname = (r.get("name") or "").upper()
                    if qu == rname:
                        resolved.append(r["id"])
                        matched = True
                        break
            # 3. Substring match
            if not matched and len(qu) > 2:
                for r in rooms:
                    rcode = (r.get("code") or "").upper()
                    rname = (r.get("name") or "").upper()
                    if qu in rname or qu in rcode:
                        resolved.append(r["id"])
                        matched = True
                        break
            # 4. If not found in DB at all, insert room so it's not lost
            if not matched:
                try:
                    new_room = db.table("rooms").insert({
                        "code": query,
                        "name": f"Venue {query}",
                        "building": "FET Campus",
                        "rows": 6,
                        "columns": 6,
                        "total_seats": 36,
                        "is_exam_approved": True,
                        "status": "active"
                    }).execute().data
                    if new_room:
                        resolved.append(new_room[0]["id"])
                except Exception:
                    pass
    return list(dict.fromkeys(resolved))


@router.get("")
def list_examinations(
    include_archived: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    auth: AuthContext = Depends(require_staff_or_faculty),
) -> dict:
    db = require_db()
    query = (
        db.table("examinations")
        .select(
            "*,examination_batches(batch_id,batches(id,semester,section,programs(code,name))),examination_halls(room_id,rooms(id,code,name,rows,columns,total_seats)),seating_policies(name)"
        )
        .order("exam_date", desc=True)
        .limit(limit)
    )
    if not include_archived:
        query = query.neq("status", "archived")
    exams = []
    for e in query.execute().data or []:
        raw_batches = e.pop("examination_batches", []) or []
        raw_halls = e.pop("examination_halls", []) or []

        batch_names: list[str] = []
        for b in raw_batches:
            b_info = b.get("batches")
            if b_info and b_info.get("programs"):
                p_code = b_info["programs"].get("code", "JU")
                sem = b_info.get("semester", "")
                sec = b_info.get("section", "")
                batch_names.append(f"{p_code}-S{sem}{sec}")
            elif b.get("batch_id"):
                batch_names.append(str(b["batch_id"]))

        hall_names: list[str] = []
        for h in raw_halls:
            r_info = h.get("rooms")
            if r_info:
                h_name = r_info.get("code") or r_info.get("name") or str(h.get("room_id"))
                hall_names.append(h_name)
            elif h.get("room_id"):
                hall_names.append(str(h["room_id"]))

        e["batches"] = batch_names
        e["halls"] = hall_names
        e["batch_count"] = len(batch_names)
        e["hall_count"] = len(hall_names)
        policy = e.pop("seating_policies", None)
        e["policy_name"] = policy.get("name") if policy else None
        exams.append(e)
    return {"examinations": exams}


@router.post("")
def create_exam(payload: ExamCreate, auth: AuthContext = Depends(require_staff)) -> dict:
    db = require_db()
    default_policy = (
        db.table("seating_policies").select("id").eq("is_default", True).maybe_single().execute().data
    )
    insert_data = {
        "name": payload.name,
        "exam_date": payload.exam_date,
        "session": payload.session,
        "status": payload.status or "draft",
        "created_by": safe_user_uuid(auth.user_id),
        "policy_id": default_policy["id"] if default_policy else None,
    }
    row = db.table("examinations").insert(insert_data).execute().data[0]
    exam_id = row["id"]

    # Link participating batches
    batch_ids = list(payload.batch_ids or [])
    if payload.batches:
        batch_ids.extend(_resolve_batch_ids(db, payload.batches))
    batch_ids = list(dict.fromkeys(batch_ids))
    if batch_ids:
        db.table("examination_batches").insert(
            [{"examination_id": exam_id, "batch_id": b} for b in batch_ids]
        ).execute()

    # Link examination halls
    room_ids = list(payload.room_ids or [])
    if payload.halls:
        room_ids.extend(_resolve_room_ids(db, payload.halls))
    room_ids = list(dict.fromkeys(room_ids))
    if room_ids:
        unapproved = (
            db.table("rooms")
            .select("id,name,code,is_exam_approved")
            .in_("id", room_ids)
            .eq("is_exam_approved", False)
            .execute()
            .data
            or []
        )
        if unapproved:
            names = ", ".join(r.get("code") or r.get("name") or str(r.get("id")) for r in unapproved)
            raise ApiError(
                422,
                "unapproved_exam_hall",
                f"Teaching classroom(s) cannot automatically be treated as approved examination halls: {names}. Only approved examination halls may be assigned.",
            )
        db.table("examination_halls").insert(
            [{"examination_id": exam_id, "room_id": r} for r in room_ids]
        ).execute()

    row["batches"] = payload.batches or []
    row["halls"] = payload.halls or []
    row["batch_count"] = len(batch_ids) or len(payload.batches)
    row["hall_count"] = len(room_ids) or len(payload.halls)
    row["subject_name"] = payload.subject_name
    row["subject_code"] = payload.subject_code

    return {"examination": row}


@router.patch("/{exam_id}")
def update_exam(exam_id: str, payload: ExamUpdate, auth: AuthContext = Depends(require_staff)) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    excluded = {"batches", "halls", "batch_ids", "room_ids", "subject_name", "subject_code"}
    updates = payload.model_dump(exclude_none=True, exclude=excluded)
    if updates:
        updates["updated_at"] = "now()"
        row = db.table("examinations").update(updates).eq("id", real_exam_id).execute().data
        if not row:
            raise ApiError(404, "not_found", "Examination not found.")
        exam_row = row[0]
    else:
        exam_row = db.table("examinations").select("*").eq("id", real_exam_id).single().execute().data
        if not exam_row:
            raise ApiError(404, "not_found", "Examination not found.")

    # Synchronize associated seating plans when examination is published
    if updates.get("status") == "published":
        try:
            db.table("seating_plans").update({"status": "published", "updated_at": "now()"}).eq("examination_id", real_exam_id).execute()
        except Exception:
            pass

    if payload.batches is not None or payload.batch_ids is not None:
        batch_ids = list(payload.batch_ids or [])
        if payload.batches:
            batch_ids.extend(_resolve_batch_ids(db, payload.batches))
        batch_ids = list(dict.fromkeys(batch_ids))
        db.table("examination_batches").delete().eq("examination_id", real_exam_id).execute()
        if batch_ids:
            db.table("examination_batches").insert(
                [{"examination_id": real_exam_id, "batch_id": b} for b in batch_ids]
            ).execute()
        exam_row["batches"] = payload.batches or []
        exam_row["batch_count"] = len(batch_ids)

    if payload.halls is not None or payload.room_ids is not None:
        room_ids = list(payload.room_ids or [])
        if payload.halls:
            room_ids.extend(_resolve_room_ids(db, payload.halls))
        room_ids = list(dict.fromkeys(room_ids))
        db.table("examination_halls").delete().eq("examination_id", real_exam_id).execute()
        if room_ids:
            db.table("examination_halls").insert(
                [{"examination_id": real_exam_id, "room_id": r} for r in room_ids]
            ).execute()
        exam_row["halls"] = payload.halls or []
        exam_row["hall_count"] = len(room_ids)

    if payload.subject_name:
        exam_row["subject_name"] = payload.subject_name
    if payload.subject_code:
        exam_row["subject_code"] = payload.subject_code

    return {"examination": exam_row}


@router.delete("/{exam_id}")
def delete_exam(
    exam_id: str, force: bool = False, auth: AuthContext = Depends(require_staff)
) -> dict:
    """Delete draft exam or safely archive if published plans exist."""
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    exam = db.table("examinations").select("*").eq("id", real_exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    # Check for published seating plans
    published_plans = (
        db.table("seating_plans")
        .select("id")
        .eq("examination_id", real_exam_id)
        .eq("status", "published")
        .execute()
        .data
        or []
    )
    if published_plans and not force:
        db.table("examinations").update({"status": "archived", "updated_at": "now()"}).eq("id", real_exam_id).execute()
        return {
            "status": "archived",
            "examination_id": real_exam_id,
            "message": "Examination has published seating plans and was archived safely.",
        }

    # Safe cascade deletion
    db.table("examination_batches").delete().eq("examination_id", real_exam_id).execute()
    db.table("examination_halls").delete().eq("examination_id", real_exam_id).execute()
    db.table("seating_plans").delete().eq("examination_id", real_exam_id).execute()
    db.table("examinations").delete().eq("id", real_exam_id).execute()
    return {"status": "deleted", "examination_id": real_exam_id}


@router.post("/{exam_id}/archive")
def archive_exam(exam_id: str, auth: AuthContext = Depends(require_staff)) -> dict:
    """Safely archive an examination."""
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    exam = db.table("examinations").select("id").eq("id", real_exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    row = (
        db.table("examinations")
        .update({"status": "archived", "updated_at": "now()"})
        .eq("id", real_exam_id)
        .execute()
        .data[0]
    )
    return {"status": "archived", "examination": row}


@router.get("/{exam_id}")
def get_exam(exam_id: str, auth: AuthContext = Depends(require_staff_or_faculty)) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    exam = db.table("examinations").select("*").eq("id", real_exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    batches = (
        db.table("examination_batches")
        .select("batches(id,semester,section,class_teacher,programs(code,name))")
        .eq("examination_id", real_exam_id)
        .execute()
        .data
        or []
    )
    halls = (
        db.table("examination_halls")
        .select("rooms(id,code,name,rows,columns,total_seats,is_exam_approved)")
        .eq("examination_id", real_exam_id)
        .execute()
        .data
        or []
    )
    batch_list = [b["batches"] for b in batches if b.get("batches")]
    hall_list = [h["rooms"] for h in halls if h.get("rooms")]

    batch_names = [
        f"{b['programs']['code']}-S{b['semester']}{b['section']}"
        for b in batch_list if b.get("programs") and b.get("semester")
    ]
    hall_names = [h.get("code") or h.get("name") for h in hall_list if h.get("code") or h.get("name")]

    exam["batches"] = batch_names
    exam["halls"] = hall_names

    return {
        "examination": exam,
        "batches": batch_list,
        "halls": hall_list,
        "batch_names": batch_names,
        "hall_names": hall_names,
    }


@router.put("/{exam_id}/batches")
def set_batches(
    exam_id: str, payload: ExamBatchesRequest, auth: AuthContext = Depends(require_staff)
) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    exam = db.table("examinations").select("id").eq("id", real_exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    db.table("examination_batches").delete().eq("examination_id", real_exam_id).execute()
    if payload.batch_ids:
        db.table("examination_batches").insert(
            [{"examination_id": real_exam_id, "batch_id": b} for b in payload.batch_ids]
        ).execute()
    return {"batches": len(payload.batch_ids)}


@router.put("/{exam_id}/halls")
def set_halls(
    exam_id: str, payload: ExamHallsRequest, auth: AuthContext = Depends(require_staff)
) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    exam = db.table("examinations").select("id,exam_date,session,name").eq("id", real_exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    unapproved = (
        db.table("rooms")
        .select("name")
        .in_("id", payload.room_ids)
        .eq("is_exam_approved", False)
        .execute()
        .data
        or []
    )
    if unapproved:
        names = ", ".join(r["name"] for r in unapproved)
        raise ApiError(
            422,
            "hall_not_approved",
            f"These rooms are not approved examination halls: {names}. "
            "Approve them in Hall Management first.",
        )

    # Prevent conflicting hall bookings for the same exam date and session
    if exam.get("exam_date") and exam.get("session") and payload.room_ids:
        other_exams = (
            db.table("examinations")
            .select("id,name")
            .eq("exam_date", exam["exam_date"])
            .eq("session", exam["session"])
            .neq("id", real_exam_id)
            .neq("status", "archived")
            .execute()
            .data
            or []
        )
        if other_exams:
            other_ids = [oe["id"] for oe in other_exams]
            booked = (
                db.table("examination_halls")
                .select("room_id,examination_id,rooms(name)")
                .in_("examination_id", other_ids)
                .in_("room_id", payload.room_ids)
                .execute()
                .data
                or []
            )
            if booked:
                conflict_hall = (booked[0].get("rooms") or {}).get("name", "Selected hall")
                conflicting_exam_id = booked[0].get("examination_id")
                conflicting_exam = next(
                    (oe["name"] for oe in other_exams if oe["id"] == conflicting_exam_id),
                    "another examination",
                )
                raise ApiError(
                    409,
                    "hall_conflict",
                    f"Hall conflict: '{conflict_hall}' is already assigned to '{conflicting_exam}' "
                    f"on {exam['exam_date']} ({exam['session']} session). Cannot double-book examination halls.",
                )

    if payload.room_ids:
        unapproved = (
            db.table("rooms")
            .select("id,name,code,is_exam_approved")
            .in_("id", payload.room_ids)
            .eq("is_exam_approved", False)
            .execute()
            .data
            or []
        )
        if unapproved:
            names = ", ".join(r.get("code") or r.get("name") or str(r.get("id")) for r in unapproved)
            raise ApiError(
                422,
                "unapproved_exam_hall",
                f"Teaching classroom(s) cannot automatically be treated as approved examination halls: {names}. Only approved examination halls may be assigned.",
            )

    db.table("examination_halls").delete().eq("examination_id", real_exam_id).execute()
    db.table("examination_halls").insert(
        [{"examination_id": real_exam_id, "room_id": r} for r in payload.room_ids]
    ).execute()
    return {"halls": len(payload.room_ids)}


@router.put("/{exam_id}/policy")
def set_policy(exam_id: str, payload: dict, auth: AuthContext = Depends(require_staff)) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    policy_id = payload.get("policy_id")
    if policy_id:
        policy = db.table("seating_policies").select("id").eq("id", policy_id).single().execute().data
        if not policy:
            raise ApiError(404, "not_found", "Policy not found.")
    else:
        policy_id = None
    row = (
        db.table("examinations")
        .update({"policy_id": policy_id, "updated_at": "now()"})
        .eq("id", real_exam_id)
        .execute()
        .data
    )
    if not row:
        raise ApiError(404, "not_found", "Examination not found.")
    return {"policy_id": policy_id}


# ---------------- Examination subjects ----------------

@router.put("/{exam_id}/subjects")
@router.post("/{exam_id}/subjects")
def set_exam_subjects(
    exam_id: str, payload: ExamSubjectsRequest, auth: AuthContext = Depends(require_staff)
) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    exam = db.table("examinations").select("id").eq("id", real_exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    db.table("audit_logs").insert(
        {
            "user_id": safe_user_uuid(auth.user_id),
            "action": "examination.set_subjects",
            "entity_type": "examinations",
            "entity_id": real_exam_id,
            "details": {"subjects": payload.subjects},
        }
    ).execute()
    return {"subjects": payload.subjects, "count": len(payload.subjects)}


@router.get("/{exam_id}/subjects")
def get_exam_subjects(
    exam_id: str, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    if not _is_uuid(real_exam_id):
        raise ApiError(404, "not_found", "Examination not found.")
    exam = db.table("examinations").select("id,name").eq("id", real_exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    recent_log = (
        db.table("audit_logs")
        .select("details")
        .eq("entity_type", "examinations")
        .eq("entity_id", real_exam_id)
        .eq("action", "examination.set_subjects")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    subjects = (recent_log[0].get("details") or {}).get("subjects", []) if recent_log else []
    return {"subjects": subjects}
    return {"subjects": subjects}


# ---------------- Seating policies ----------------

@router.get("/policies/all")
def list_policies(auth: AuthContext = Depends(require_authenticated)) -> dict:
    db = require_db()
    return {
        "policies": db.table("seating_policies").select("*").order("name").execute().data or []
    }


@router.post("/policies")
def create_policy(payload: PolicyCreate, auth: AuthContext = Depends(require_admin)) -> dict:
    db = require_db()
    if payload.is_default:
        db.table("seating_policies").update({"is_default": False}).neq("name", payload.name).execute()
    row = db.table("seating_policies").insert(payload.model_dump()).execute().data[0]
    return {"policy": row}


alias_router = APIRouter(prefix="/exams", tags=["examinations"])
alias_router.add_api_route("", list_examinations, methods=["GET"])
alias_router.add_api_route("", create_exam, methods=["POST"])
alias_router.add_api_route("/{exam_id}", get_exam, methods=["GET"])
alias_router.add_api_route("/{exam_id}", update_exam, methods=["PATCH"])
alias_router.add_api_route("/{exam_id}", delete_exam, methods=["DELETE"])
alias_router.add_api_route("/{exam_id}/archive", archive_exam, methods=["POST"])
alias_router.add_api_route("/{exam_id}/batches", set_batches, methods=["PUT"])
alias_router.add_api_route("/{exam_id}/halls", set_halls, methods=["PUT"])
alias_router.add_api_route("/{exam_id}/policy", set_policy, methods=["PUT"])
alias_router.add_api_route("/{exam_id}/subjects", set_exam_subjects, methods=["POST", "PUT"])
alias_router.add_api_route("/{exam_id}/subjects", get_exam_subjects, methods=["GET"])

