"""Routes: rooms, layouts, blocked seats, exam-hall approval."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth import AuthContext, require_admin, require_authenticated
from ..database.client import require_db
from ..schemas.index import RoomCreate, RoomUpdate, SeatPatch
from ..utils.errors import ApiError

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("")
def list_rooms(
    room_type: str | None = None,
    exam_approved_only: bool = False,
    q: str | None = None,
    include_inactive: bool = False,
    auth: AuthContext = Depends(require_authenticated),
) -> dict:
    db = require_db()
    query = db.table("rooms").select("*").order("name")
    if room_type:
        query = query.eq("room_type", room_type)
    if exam_approved_only:
        query = query.eq("is_exam_approved", True)
    if q:
        query = query.or_(f"name.ilike.%{q}%,code.ilike.%{q}%,building.ilike.%{q}%")
    if not include_inactive:
        query = query.eq("status", "active")
    rooms = query.execute().data or []

    seats = (
        db.table("room_seats")
        .select("room_id,is_blocked")
        .in_("room_id", [r["id"] for r in rooms] or ["00000000-0000-0000-0000-000000000000"])
        .execute()
        .data
        or []
    )
    blocked_count: dict[str, int] = {}
    total_count: dict[str, int] = {}
    for s in seats:
        total_count[s["room_id"]] = total_count.get(s["room_id"], 0) + 1
        if s["is_blocked"]:
            blocked_count[s["room_id"]] = blocked_count.get(s["room_id"], 0) + 1
    for r in rooms:
        total = total_count.get(r["id"], 0)
        blocked = blocked_count.get(r["id"], 0)
        r["total_seats"] = total
        r["blocked_seats"] = blocked
        r["usable_seats"] = total - blocked
    return {"rooms": rooms}


@router.post("")
def create_room(payload: RoomCreate, auth: AuthContext = Depends(require_admin)) -> dict:
    db = require_db()
    existing = db.table("rooms").select("id").eq("code", payload.code).execute().data
    if existing:
        raise ApiError(409, "duplicate_room", f"Room code {payload.code} already exists.")
    row = db.table("rooms").insert(payload.model_dump()).execute().data[0]
    if payload.rows and payload.columns:
        db.rpc("ensure_room_seats", {"p_room_id": row["id"], "p_rows": payload.rows, "p_cols": payload.columns})
        db.table("rooms").update({"total_seats": payload.rows * payload.columns}).eq("id", row["id"]).execute()
    return {"room": row}


@router.patch("/{room_id}")
def update_room(room_id: str, payload: RoomUpdate, auth: AuthContext = Depends(require_admin)) -> dict:
    db = require_db()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ApiError(400, "empty_update", "Nothing to update.")
    if "is_exam_approved" in updates and updates["is_exam_approved"]:
        # Only real halls with a layout can be approved for examinations.
        room = db.table("rooms").select("rows,columns").eq("id", room_id).single().execute().data
        if not room or not room.get("rows") or not room.get("columns"):
            raise ApiError(422, "layout_required", "Configure the seat layout before approving this room as an examination hall.")
    rows = updates.pop("rows", None)
    columns = updates.pop("columns", None)
    if rows is not None or columns is not None:
        current = db.table("rooms").select("rows,columns").eq("id", room_id).single().execute().data
        new_rows = rows if rows is not None else current["rows"]
        new_cols = columns if columns is not None else current["columns"]
        db.rpc("ensure_room_seats", {"p_room_id": room_id, "p_rows": int(new_rows), "p_cols": int(new_cols)})
        db.table("rooms").update({"total_seats": int(new_rows) * int(new_cols)}).eq("id", room_id).execute()
    updates["updated_at"] = "now()"
    row = db.table("rooms").update(updates).eq("id", room_id).execute().data
    if not row:
        raise ApiError(404, "not_found", "Room not found.")
    return {"room": row[0]}


@router.put("/{room_id}/layout")
@router.patch("/{room_id}/layout")
def update_room_layout(
    room_id: str,
    payload: dict,
    auth: AuthContext = Depends(require_admin),
) -> dict:
    db = require_db()
    room = db.table("rooms").select("*").eq("id", room_id).single().execute().data
    if not room:
        raise ApiError(404, "not_found", "Room not found.")

    rows = payload.get("rows", room.get("rows", 0))
    cols = payload.get("columns", payload.get("cols", room.get("columns", 0)))
    blocked_list = payload.get("blocked", payload.get("blocked_seats", []))

    if rows and cols:
        db.rpc("ensure_room_seats", {"p_room_id": room_id, "p_rows": int(rows), "p_cols": int(cols)})
        db.table("rooms").update({
            "rows": int(rows),
            "columns": int(cols),
            "total_seats": int(rows) * int(cols),
            "updated_at": "now()",
        }).eq("id", room_id).execute()

    if blocked_list is not None:
        blocked_set = set()
        for b in blocked_list:
            if isinstance(b, str) and "-" in b:
                parts = b.split("-")
                blocked_set.add((int(parts[0]), int(parts[1])))
            elif isinstance(b, (list, tuple)) and len(b) == 2:
                blocked_set.add((int(b[0]), int(b[1])))

        db.table("room_seats").update({"is_blocked": False}).eq("room_id", room_id).execute()
        for r, c in blocked_set:
            db.table("room_seats").update({"is_blocked": True}).eq("room_id", room_id).eq("row", r).eq("col", c).execute()

    return {"room_id": room_id, "rows": rows, "columns": cols, "status": "layout_updated"}


@router.get("/halls/approved")
def list_approved_exam_halls(auth: AuthContext = Depends(require_authenticated)) -> list:
    db = require_db()
    halls = (
        db.table("rooms")
        .select("*")
        .eq("is_exam_approved", True)
        .eq("status", "active")
        .order("name")
        .execute()
        .data
        or []
    )
    return halls


@router.get("/{room_id}")
def get_room(room_id: str, auth: AuthContext = Depends(require_authenticated)) -> dict:
    db = require_db()
    room = db.table("rooms").select("*").eq("id", room_id).single().execute().data
    if not room:
        raise ApiError(404, "not_found", "Room not found.")
    seats = (
        db.table("room_seats")
        .select("id,row,col,seat_label,is_blocked")
        .eq("room_id", room_id)
        .order("row")
        .order("col")
        .execute()
        .data
        or []
    )
    room["seats"] = seats
    room["usable_seats"] = sum(1 for s in seats if not s["is_blocked"])
    return {"room": room}


@router.post("/{room_id}/seats/block")
def set_seat_blocked(
    room_id: str, payload: SeatPatch, auth: AuthContext = Depends(require_admin)
) -> dict:
    db = require_db()
    row = (
        db.table("room_seats")
        .update({"is_blocked": payload.is_blocked})
        .eq("room_id", room_id)
        .eq("row", payload.row)
        .eq("col", payload.col)
        .execute()
        .data
    )
    if not row:
        raise ApiError(404, "seat_not_found", "Seat not found; save the layout first.")
    seats = (
        db.table("room_seats").select("is_blocked").eq("room_id", room_id).execute().data or []
    )
    usable = sum(1 for s in seats if not s["is_blocked"])
    return {"seat": row[0], "usable_seats": usable, "total_seats": len(seats)}


@router.get("/{room_id}/schedule")
def room_schedule(
    room_id: str, day: str | None = Query(default=None), auth: AuthContext = Depends(require_authenticated)
) -> dict:
    """Weekly (or daily) occupancy of a room from the timetable."""
    db = require_db()
    room = db.table("rooms").select("name").eq("id", room_id).single().execute().data
    if not room:
        raise ApiError(404, "not_found", "Room not found.")
    query = (
        db.table("timetable_entries")
        .select(
            "day,period_start,period_end,slot_type,subject_label,"
            "faculty_name,batches(program,semester,section,programs(code))"
        )
        .eq("room_id", room_id)
        .order("day")
        .order("period_start")
    )
    if day:
        query = query.eq("day", day)
    rows = query.execute().data or []
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
                "faculty": r.get("faculty_name"),
                "batch": (
                    f"{(batch.get('programs') or {}).get('code', '?')}-"
                    f"S{batch.get('semester', '?')}-{batch.get('section', '')}"
                ),
            }
        )
    return {"room": room, "entries": entries}
