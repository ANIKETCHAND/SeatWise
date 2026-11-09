"""Routes: examinations, participating batches, halls, policies."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_admin, require_staff, require_authenticated
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
from ..utils.uuid_helper import safe_user_uuid

router = APIRouter(prefix="/examinations", tags=["examinations"])


@router.get("")
def list_examinations(
    include_archived: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    query = (
        db.table("examinations")
        .select(
            "*,examination_batches(count),examination_halls(count),seating_policies(name)"
        )
        .order("exam_date", desc=True)
        .limit(limit)
    )
    if not include_archived:
        query = query.neq("status", "archived")
    exams = []
    for e in query.execute().data or []:
        e["batch_count"] = (e.pop("examination_batches", [{}]) or [{}])[0].get("count", 0)
        e["hall_count"] = (e.pop("examination_halls", [{}]) or [{}])[0].get("count", 0)
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
    row = (
        db.table("examinations")
        .insert(
            {
                "name": payload.name,
                "exam_date": payload.exam_date,
                "session": payload.session,
                "created_by": safe_user_uuid(auth.user_id),
                "policy_id": default_policy["id"] if default_policy else None,
            }
        )
        .execute()
        .data[0]
    )
    return {"examination": row}


@router.patch("/{exam_id}")
def update_exam(exam_id: str, payload: ExamUpdate, auth: AuthContext = Depends(require_staff)) -> dict:
    db = require_db()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ApiError(400, "empty_update", "Nothing to update.")
    updates["updated_at"] = "now()"
    row = db.table("examinations").update(updates).eq("id", exam_id).execute().data
    if not row:
        raise ApiError(404, "not_found", "Examination not found.")
    return {"examination": row[0]}


@router.delete("/{exam_id}")
def delete_exam(
    exam_id: str, force: bool = False, auth: AuthContext = Depends(require_staff)
) -> dict:
    """Delete draft exam or safely archive if published plans exist."""
    db = require_db()
    exam = db.table("examinations").select("*").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    # Check for published seating plans
    published_plans = (
        db.table("seating_plans")
        .select("id")
        .eq("examination_id", exam_id)
        .eq("status", "published")
        .execute()
        .data
        or []
    )
    if published_plans and not force:
        db.table("examinations").update({"status": "archived", "updated_at": "now()"}).eq("id", exam_id).execute()
        return {
            "status": "archived",
            "examination_id": exam_id,
            "message": "Examination has published seating plans and was archived safely.",
        }

    # Safe cascade deletion
    db.table("examination_batches").delete().eq("examination_id", exam_id).execute()
    db.table("examination_halls").delete().eq("examination_id", exam_id).execute()
    db.table("seating_plans").delete().eq("examination_id", exam_id).execute()
    db.table("examinations").delete().eq("id", exam_id).execute()
    return {"status": "deleted", "examination_id": exam_id}


@router.post("/{exam_id}/archive")
def archive_exam(exam_id: str, auth: AuthContext = Depends(require_staff)) -> dict:
    """Safely archive an examination."""
    db = require_db()
    exam = db.table("examinations").select("id").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    row = (
        db.table("examinations")
        .update({"status": "archived", "updated_at": "now()"})
        .eq("id", exam_id)
        .execute()
        .data[0]
    )
    return {"status": "archived", "examination": row}


@router.get("/{exam_id}")
def get_exam(exam_id: str, auth: AuthContext = Depends(require_authenticated)) -> dict:
    db = require_db()
    exam = db.table("examinations").select("*").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    batches = (
        db.table("examination_batches")
        .select("batches(id,semester,section,class_teacher,programs(code,name))")
        .eq("examination_id", exam_id)
        .execute()
        .data
        or []
    )
    halls = (
        db.table("examination_halls")
        .select("rooms(id,name,rows,columns,total_seats,is_exam_approved)")
        .eq("examination_id", exam_id)
        .execute()
        .data
        or []
    )
    return {
        "examination": exam,
        "batches": [b["batches"] for b in batches],
        "halls": [h["rooms"] for h in halls],
    }


@router.put("/{exam_id}/batches")
def set_batches(
    exam_id: str, payload: ExamBatchesRequest, auth: AuthContext = Depends(require_staff)
) -> dict:
    db = require_db()
    exam = db.table("examinations").select("id").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    db.table("examination_batches").delete().eq("examination_id", exam_id).execute()
    if payload.batch_ids:
        db.table("examination_batches").insert(
            [{"examination_id": exam_id, "batch_id": b} for b in payload.batch_ids]
        ).execute()
    return {"batches": len(payload.batch_ids)}


@router.put("/{exam_id}/halls")
def set_halls(
    exam_id: str, payload: ExamHallsRequest, auth: AuthContext = Depends(require_staff)
) -> dict:
    db = require_db()
    exam = db.table("examinations").select("id,exam_date,session,name").eq("id", exam_id).single().execute().data
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
            .neq("id", exam_id)
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

    db.table("examination_halls").delete().eq("examination_id", exam_id).execute()
    db.table("examination_halls").insert(
        [{"examination_id": exam_id, "room_id": r} for r in payload.room_ids]
    ).execute()
    return {"halls": len(payload.room_ids)}


@router.put("/{exam_id}/policy")
def set_policy(exam_id: str, payload: dict, auth: AuthContext = Depends(require_staff)) -> dict:
    db = require_db()
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
        .eq("id", exam_id)
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
    exam = db.table("examinations").select("id").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    db.table("audit_logs").insert(
        {
            "user_id": safe_user_uuid(auth.user_id),
            "action": "examination.set_subjects",
            "entity_type": "examinations",
            "entity_id": exam_id,
            "details": {"subjects": payload.subjects},
        }
    ).execute()
    return {"subjects": payload.subjects, "count": len(payload.subjects)}


@router.get("/{exam_id}/subjects")
def get_exam_subjects(
    exam_id: str, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    db = require_db()
    exam = db.table("examinations").select("id,name").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")
    recent_log = (
        db.table("audit_logs")
        .select("details")
        .eq("entity_type", "examinations")
        .eq("entity_id", exam_id)
        .eq("action", "examination.set_subjects")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    subjects = (recent_log[0].get("details") or {}).get("subjects", []) if recent_log else []
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

