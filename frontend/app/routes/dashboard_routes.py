"""Routes: dynamic dashboard data & university metrics."""

from __future__ import annotations

from collections import Counter
from fastapi import APIRouter, Depends

from ..auth import AuthContext, require_authenticated
from ..database.client import require_db, DatabaseNotConfigured

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(auth: AuthContext = Depends(require_authenticated)) -> dict:
    """Return aggregated live stats for the SeatWise university dashboard."""
    try:
        db = require_db()
    except DatabaseNotConfigured:
        return {
            "is_connected": False,
            "message": "Database not configured yet",
            "counts": {
                "programs": 0,
                "batches": 0,
                "students": 0,
                "classrooms": 0,
                "exam_halls": 0,
                "timetable_entries": 0,
                "examinations": 0,
                "total_examinations": 0,
                "total_students": 0,
                "total_exam_halls": 0,
                "seating_plans_generated": 0,
                "occupied_seats": 0,
                "available_seats": 0,
                "unallocated_students": 0,
                "hall_utilization": 0,
            },
            "upcoming_exams": [],
            "recent_plans": [],
            "charts": {
                "students_by_program": [],
                "students_by_semester": [],
                "hall_utilization": [],
                "plans_by_status": [],
            },
        }

    try:
        programs_res = db.table("programs").select("id,code,name", count="exact").execute()
        programs_count = programs_res.count or 0
        batches_count = (db.table("batches").select("id", count="exact").execute().count) or 0
        students_res = db.table("students").select("id,program_id,semester,status", count="exact").execute()
        students_count = students_res.count or 0

        rooms_res = db.table("rooms").select("id,name,room_type,is_exam_approved,total_seats").execute()
        rooms_data = rooms_res.data or []
        classrooms_count = sum(1 for r in rooms_data if r.get("room_type") in ("classroom", "lab"))
        exam_halls_count = sum(1 for r in rooms_data if r.get("is_exam_approved"))

        timetable_count = (db.table("timetable_entries").select("id", count="exact").execute().count) or 0

        upcoming_exams = (
            db.table("examinations")
            .select("id,name,exam_date,session,status")
            .order("exam_date", desc=False)
            .limit(5)
            .execute()
            .data
            or []
        )

        recent_plans = (
            db.table("seating_plans")
            .select("id,kind,status,validation_status,plan_date,created_at,examinations(name),batches(section,programs(code))")
            .order("created_at", desc=True)
            .limit(6)
            .execute()
            .data
            or []
        )

        # Charts data
        # 1. Students by program
        prog_id_to_code = {p["id"]: p["code"] for p in (programs_res.data or [])}
        students_data = students_res.data or []
        prog_counts = Counter(prog_id_to_code.get(s["program_id"], "Unknown") for s in students_data)
        students_by_program = [
            {"program": code, "count": count}
            for code, count in sorted(prog_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

        # 2. Students by semester
        sem_counts = Counter(s.get("semester", 1) for s in students_data)
        students_by_semester = [
            {"semester": f"Sem {sem}", "count": count}
            for sem, count in sorted(sem_counts.items(), key=lambda x: x[0])
        ]

        # 3. Exam hall capacities
        hall_utilization = [
            {"name": r["name"], "capacity": r.get("total_seats") or 0}
            for r in rooms_data if r.get("is_exam_approved")
        ][:8]

        # 4. Plans by status
        plans_res = db.table("seating_plans").select("status,kind").execute().data or []
        plans_status_counts = Counter(p.get("status", "draft") for p in plans_res)
        plans_by_status = [
            {"status": status, "count": count}
            for status, count in plans_status_counts.items()
        ]

        exams_res = db.table("examinations").select("id", count="exact").execute()
        examinations_count = exams_res.count or 0

        assignments_res = db.table("seat_assignments").select("id", count="exact").execute()
        occupied_seats = assignments_res.count or 0

        exam_halls_data = [r for r in rooms_data if r.get("is_exam_approved")]
        total_available_seats = sum(int(r.get("total_seats") or 0) for r in exam_halls_data)
        net_available_seats = max(0, total_available_seats - occupied_seats)
        unallocated_students = max(0, students_count - occupied_seats)
        hall_utilization_rate = round((occupied_seats / total_available_seats * 100), 1) if total_available_seats > 0 else 0

        return {
            "is_connected": True,
            "counts": {
                "programs": programs_count,
                "batches": batches_count,
                "students": students_count,
                "classrooms": classrooms_count,
                "exam_halls": exam_halls_count,
                "timetable_entries": timetable_count,
                "examinations": examinations_count,
                "total_examinations": examinations_count,
                "total_students": students_count,
                "total_exam_halls": exam_halls_count,
                "seating_plans_generated": len(plans_res),
                "occupied_seats": occupied_seats,
                "available_seats": net_available_seats,
                "unallocated_students": unallocated_students,
                "hall_utilization": hall_utilization_rate,
            },
            "upcoming_exams": upcoming_exams,
            "recent_plans": recent_plans,
            "charts": {
                "students_by_program": students_by_program,
                "students_by_semester": students_by_semester,
                "hall_utilization": hall_utilization,
                "plans_by_status": plans_by_status,
            },
        }
    except Exception as exc:
        return {
            "is_connected": False,
            "error": str(exc),
            "counts": {
                "programs": 0,
                "batches": 0,
                "students": 0,
                "classrooms": 0,
                "exam_halls": 0,
                "timetable_entries": 0,
                "examinations": 0,
                "total_examinations": 0,
                "total_students": 0,
                "total_exam_halls": 0,
                "seating_plans_generated": 0,
                "occupied_seats": 0,
                "available_seats": 0,
                "unallocated_students": 0,
                "hall_utilization": 0,
            },
            "upcoming_exams": [],
            "recent_plans": [],
            "charts": {
                "students_by_program": [],
                "students_by_semester": [],
                "hall_utilization": [],
                "plans_by_status": [],
            },
        }
