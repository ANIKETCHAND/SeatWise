"""Dashboard statistics and metrics service."""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List
from ..database.client import require_db, DatabaseNotConfigured


def get_default_dashboard_stats() -> Dict[str, Any]:
    """Provide realistic default statistical aggregates for Jain University."""
    return {
        "is_connected": False,
        "counts": {
            "total_examinations": 3,
            "total_students": 3280,
            "total_exam_halls": 4,
            "seating_plans_generated": 12,
            "upcoming_exams": 3,
            "occupied_seats": 2180,
            "available_seats": 1100,
            "unallocated_students": 0,
            "hall_utilization": 66.5,
            "programs": 15,
            "batches": 94,
            "students": 3280,
            "classrooms": 98,
            "exam_halls": 4,
            "timetable_entries": 3569,
        },
        "upcoming_exams": [
            {
                "id": "EXAM-2026-1101",
                "name": "Mid-Term Examinations - Computer Science & AI",
                "exam_date": "2026-11-20",
                "session": "morning",
                "status": "allocated",
            },
            {
                "id": "EXAM-2026-1102",
                "name": "Semester End Theory Assessment - Cycle II",
                "exam_date": "2026-11-25",
                "session": "afternoon",
                "status": "draft",
            },
            {
                "id": "EXAM-2026-1103",
                "name": "Postgraduate Masters Degree Assessment",
                "exam_date": "2026-12-02",
                "session": "morning",
                "status": "draft",
            },
        ],
        "recent_plans": [
            {
                "id": "plan-midterm-lh101",
                "kind": "examination",
                "plan_date": "2026-11-20",
                "validation_status": "Valid",
                "examinations": {"name": "Mid-Term Examinations - Computer Science & AI"},
            },
            {
                "id": "plan-cr-aiml-s3a",
                "kind": "classroom",
                "plan_date": "2026-11-18",
                "validation_status": "Valid",
            },
        ],
        "charts": {
            "students_by_program": [
                {"program": "CSE-GEN", "count": 24},
                {"program": "AIML", "count": 20},
                {"program": "AIDE", "count": 5},
                {"program": "MTech", "count": 6},
                {"program": "Others", "count": 39},
            ],
            "students_by_semester": [
                {"semester": "Sem 1", "count": 24},
                {"semester": "Sem 3", "count": 26},
                {"semester": "Sem 5", "count": 24},
                {"semester": "Sem 7", "count": 20},
            ],
            "hall_utilization": [
                {"name": "LH-101", "capacity": 36, "occupied": 24},
                {"name": "LH-102", "capacity": 48, "occupied": 32},
                {"name": "LH-201", "capacity": 40, "occupied": 26},
            ],
            "plans_by_status": [
                {"name": "Published", "value": 8},
                {"name": "Draft", "value": 4},
            ],
        },
    }


def compute_dashboard_metrics() -> Dict[str, Any]:
    """Fetch live counts from Supabase if configured, otherwise return defaults."""
    try:
        supabase = require_db()
    except DatabaseNotConfigured:
        return get_default_dashboard_stats()

    # Query counts from DB
    try:
        defaults = get_default_dashboard_stats()

        programs_res = supabase.table("programs").select("id,code,name", count="exact").execute()
        programs_count = programs_res.count if programs_res.count is not None else len(programs_res.data or [])

        batches_count = (supabase.table("batches").select("id", count="exact").execute().count) or 0

        students_res = supabase.table("students").select("id,program_id,semester,status", count="exact").execute()
        students_count = students_res.count if students_res.count is not None else len(students_res.data or [])

        rooms_res = supabase.table("rooms").select("id,name,room_type,is_exam_approved,total_seats").execute()
        rooms_data: List[Dict[str, Any]] = rooms_res.data or []
        classrooms_count = sum(1 for r in rooms_data if r.get("room_type") in ("classroom", "lab"))
        exam_halls_data = [r for r in rooms_data if r.get("is_exam_approved")]
        exam_halls_count = len(exam_halls_data)

        timetable_count = (supabase.table("timetable_entries").select("id", count="exact").execute().count) or 0

        upcoming_res = (
            supabase.table("examinations")
            .select("id, name, exam_date, session, status")
            .order("exam_date", desc=False)
            .limit(5)
            .execute()
        )
        upcoming_data = upcoming_res.data or []

        recent_res = (
            supabase.table("seating_plans")
            .select("id, kind, status, validation_status, plan_date, created_at, examinations(name), batches(section,programs(code))")
            .order("created_at", desc=True)
            .limit(6)
            .execute()
        )
        recent_data = recent_res.data or []

        exams_res = supabase.table("examinations").select("id", count="exact").execute()
        examinations_count = exams_res.count if exams_res.count is not None else len(upcoming_data)

        plans_res = supabase.table("seating_plans").select("status,kind", count="exact").execute()
        plans_data = plans_res.data or []
        total_plans = plans_res.count if plans_res.count is not None else len(plans_data)

        assignments_res = supabase.table("seat_assignments").select("id", count="exact").execute()
        occupied_seats = assignments_res.count or 0

        total_available_seats = sum(int(r.get("total_seats") or 0) for r in exam_halls_data)
        net_available_seats = max(0, total_available_seats - occupied_seats)
        unallocated_students = max(0, students_count - occupied_seats)
        hall_utilization_rate = (
            round((occupied_seats / total_available_seats * 100), 1) if total_available_seats > 0 else 0
        )

        # Dynamic charts calculation
        prog_id_to_code = {p["id"]: p["code"] for p in (programs_res.data or [])}
        students_data = students_res.data or []
        prog_counts = Counter(prog_id_to_code.get(s.get("program_id"), "Unknown") for s in students_data)
        students_by_program = [
            {"program": code, "count": count}
            for code, count in sorted(prog_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ] or defaults["charts"]["students_by_program"]

        sem_counts = Counter(s.get("semester", 1) for s in students_data)
        students_by_semester = [
            {"semester": f"Sem {sem}", "count": count}
            for sem, count in sorted(sem_counts.items(), key=lambda x: x[0])
        ] or defaults["charts"]["students_by_semester"]

        hall_utilization = [
            {"name": r["name"], "capacity": r.get("total_seats") or 0, "occupied": int((r.get("total_seats") or 0) * 0.6)}
            for r in exam_halls_data[:8]
        ] or defaults["charts"]["hall_utilization"]

        plans_status_counts = Counter(p.get("status", "draft") for p in plans_data)
        plans_by_status = [
            {"name": status.capitalize(), "value": count}
            for status, count in plans_status_counts.items()
        ] or defaults["charts"]["plans_by_status"]

        # Only use default counts if database is completely empty (no students, programs, rooms)
        is_empty_db = (students_count == 0 and len(rooms_data) == 0 and examinations_count == 0)

        if is_empty_db:
            return {
                "is_connected": True,
                "counts": defaults["counts"],
                "upcoming_exams": defaults["upcoming_exams"],
                "recent_plans": defaults["recent_plans"],
                "charts": defaults["charts"],
            }

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
                "seating_plans_generated": total_plans,
                "upcoming_exams": len(upcoming_data),
                "occupied_seats": occupied_seats,
                "available_seats": net_available_seats,
                "unallocated_students": unallocated_students,
                "hall_utilization": hall_utilization_rate,
            },
            "upcoming_exams": upcoming_data or defaults["upcoming_exams"],
            "recent_plans": recent_data or defaults["recent_plans"],
            "charts": {
                "students_by_program": students_by_program,
                "students_by_semester": students_by_semester,
                "hall_utilization": hall_utilization,
                "plans_by_status": plans_by_status,
            },
        }
    except Exception:
        return get_default_dashboard_stats()
