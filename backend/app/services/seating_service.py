"""Seating generation service: loads DB entities, runs the engine, persists.

This module is the ONLY place that converts database rows into algorithm
models and algorithm results into database writes.
"""

from __future__ import annotations

from ..algorithms import (
    AllocationResult,
    Hall,
    Policy,
    Seat,
    SeatingRequest,
    Student,
    generate_seating,
)
from ..config import get_settings
from ..database.client import require_db
from ..utils.errors import ApiError


# ---------------------------------------------------------------- helpers

def load_students_for_batches(batch_ids: list[str]) -> list[dict]:
    if not batch_ids:
        return []
    db = require_db()
    response = (
        db.table("students")
        .select("id,full_name,roll_number,program_id,semester,section,status,programs(code)")
        .in_("status", ["active"])
        .in_("id", _student_ids_for_batches(batch_ids))
        .execute()
    )
    return response.data or []


def _student_ids_for_batches(batch_ids: list[str]) -> list[str]:
    """Active students belonging to any of the given batches (program/sem/section match)."""
    db = require_db()
    batches = (
        db.table("batches")
        .select("program_id,semester,section,programs(code)")
        .in_("id", batch_ids)
        .execute()
    ).data or []

    or_filters = []
    for b in batches:
        prog = (b.get("programs") or {}).get("code")
        if not prog:
            continue
        or_filters.append(
            f"and(program_id.eq.{b['program_id']},semester.eq.{b['semester']},section.eq.{b['section']})"
        )
    if not or_filters:
        return []
    response = (
        db.table("students")
        .select("id")
        .eq("status", "active")
        .or_(",".join(or_filters))
        .execute()
    )
    return [r["id"] for r in response.data or []]


def load_halls(room_ids: list[str]) -> list[Hall]:
    db = require_db()
    rooms = (
        db.table("rooms")
        .select("id,name,rows,columns,room_type")
        .in_("id", room_ids)
        .eq("status", "active")
        .execute()
    ).data or []
    if not rooms:
        raise ApiError(400, "no_rooms", "No usable rooms selected.")

    halls: list[Hall] = []
    seats_rows = (
        db.table("room_seats")
        .select("id,room_id,row,col,seat_label,is_blocked")
        .in_("room_id", [r["id"] for r in rooms])
        .execute()
    ).data or []
    seats_by_room: dict[str, list[dict]] = {}
    for s in seats_rows:
        seats_by_room.setdefault(s["room_id"], []).append(s)

    for room in rooms:
        seat_dicts = seats_by_room.get(room["id"], [])
        seats = tuple(
            Seat(
                hall_id=room["id"],
                row=s["row"],
                col=s["col"],
                seat_label=s["seat_label"],
                usable=not s["is_blocked"],
            )
            for s in sorted(seat_dicts, key=lambda x: (x["row"], x["col"]))
        )
        if not seats:
            raise ApiError(
                400,
                "room_without_layout",
                f"Room {room['name']} has no seat layout configured.",
            )
        halls.append(
            Hall(
                hall_id=room["id"],
                name=room["name"],
                rect_rows=room["rows"] or 0,
                rect_cols=room["columns"] or 0,
                seats=seats,
            )
        )
    return halls


def db_students_to_engine(students: list[dict]) -> list[Student]:
    out: list[Student] = []
    for s in students:
        prog = (s.get("programs") or {}).get("code") or s.get("program_id", "?")
        group = f"{prog}-S{s['semester']}-{s['section']}"
        out.append(
            Student(
                student_id=s["id"],
                full_name=s["full_name"],
                roll_number=s.get("roll_number") or "",
                group=group,
            )
        )
    return out


def policy_from_dict(policy_row: dict | None) -> Policy:
    if not policy_row:
        return Policy()
    return Policy(
        block_same_batch_horizontal=policy_row.get("block_same_batch_horizontal", True),
        block_same_batch_vertical=policy_row.get("block_same_batch_vertical", True),
        block_same_batch_diagonal=policy_row.get("block_same_batch_diagonal", False),
        allow_empty_seats=policy_row.get("allow_empty_seats", True),
        allow_mixed_batch=policy_row.get("allow_mixed_batch", True),
    )


def run_engine(
    engine_students: list[Student],
    halls: list[Hall],
    policy: Policy,
) -> AllocationResult:
    settings = get_settings()
    request = SeatingRequest(
        students=tuple(engine_students),
        halls=tuple(halls),
        policy=policy,
        solver_time_limit_seconds=settings.solver_time_limit_seconds,
    )
    return generate_seating(request)


def result_to_plan_json(
    result: AllocationResult,
    kind: str,
    examination_id: str | None = None,
    batch_id: str | None = None,
    room_id: str | None = None,
    timetable_entry_id: str | None = None,
    plan_date: str | None = None,
    period: int | None = None,
    created_by: str | None = None,
) -> dict:
    validation = result.validation
    issues = []
    if validation is not None:
        issues = [
            {"code": i.code, "message": i.message, "details": i.details}
            for i in validation.issues
        ]
    validation_status = {
        "valid": "valid",
        "invalid": "invalid",
        "infeasible": "infeasible",
        "unknown": "unknown",
    }.get(result.status, "pending")

    return {
        "kind": kind,
        "examination_id": examination_id,
        "batch_id": batch_id,
        "room_id": room_id,
        "timetable_entry_id": timetable_entry_id,
        "plan_date": plan_date,
        "period": period,
        "status": "draft",
        "validation_status": validation_status,
        "validation_report": {
            "explanation": result.explanation,
            "math_notes": list(result.math_notes),
            "issues": issues,
            "stats": result.stats,
            "solver_name": result.solver_name,
            "solve_seconds": result.solve_seconds,
        },
        "solver_name": result.solver_name,
        "solve_seconds": result.solve_seconds,
        "created_by": created_by,
    }


def assignments_to_json(result: AllocationResult) -> list[dict]:
    return [
        {
            "student_id": a.student_id,
            "full_name": a.full_name,
            "roll_number": a.roll_number,
            "group": a.group,
            "room_id": a.hall_id,
            "row": a.row,
            "col": a.col,
            "seat_label": a.seat_label,
        }
        for a in result.assignments
    ]
