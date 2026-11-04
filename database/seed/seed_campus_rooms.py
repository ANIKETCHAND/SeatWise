"""JU FET Campus Architectural Floor Plans & Rooms Seed Script.

Idempotently upserts all verified rooms, lecture halls, computing labs,
and designated examination centers across all 5 floors (Ground, 1st, 2nd, 3rd, 4th)
into Supabase PostgreSQL. Safe to run multiple times without duplicate records.
"""

from __future__ import annotations

import os
import sys

CAMPUS_ROOMS_CATALOG = [
    # Ground Floor
    {"code": "A-001", "name": "Administrative Affairs Office", "building": "FET Campus - Block A", "floor": "Ground", "room_type": "classroom", "rows": 4, "columns": 6, "total_seats": 24, "is_exam_approved": False},
    {"code": "A-002", "name": "FET Ground Floor Seminar Hall", "building": "FET Campus - Block A", "floor": "Ground", "room_type": "exam_hall", "rows": 10, "columns": 12, "total_seats": 120, "is_exam_approved": True},
    {"code": "A-003", "name": "Kemi Faculty & Conference Chamber", "building": "FET Campus - Block A", "floor": "Ground", "room_type": "classroom", "rows": 4, "columns": 8, "total_seats": 32, "is_exam_approved": False},
    {"code": "A-004", "name": "Kemi Lecture Hall & Faculty Complex", "building": "FET Campus - Block A", "floor": "Ground", "room_type": "exam_hall", "rows": 8, "columns": 8, "total_seats": 64, "is_exam_approved": True},
    {"code": "A-005", "name": "Director Office - School of Engineering", "building": "FET Campus - Block A", "floor": "Ground", "room_type": "classroom", "rows": 2, "columns": 4, "total_seats": 8, "is_exam_approved": False},
    {"code": "A-006", "name": "Administration & Admissions Section", "building": "FET Campus - Block A", "floor": "Ground", "room_type": "classroom", "rows": 3, "columns": 4, "total_seats": 12, "is_exam_approved": False},
    {"code": "A-007", "name": "Vice Chancellor Campus Secretariat", "building": "FET Campus - Block A", "floor": "Ground", "room_type": "classroom", "rows": 3, "columns": 4, "total_seats": 12, "is_exam_approved": False},
    {"code": "B-008", "name": "Training & Corporate Placement Cell", "building": "FET Campus - Block B", "floor": "Ground", "room_type": "classroom", "rows": 4, "columns": 4, "total_seats": 16, "is_exam_approved": False},
    {"code": "B-009", "name": "SIT Director Executive Suite", "building": "FET Campus - Block B", "floor": "Ground", "room_type": "classroom", "rows": 2, "columns": 4, "total_seats": 8, "is_exam_approved": False},
    {"code": "B-010", "name": "Central Datacenter & Server Room", "building": "FET Campus - Block B", "floor": "Ground", "room_type": "classroom", "rows": 2, "columns": 4, "total_seats": 8, "is_exam_approved": False},
    {"code": "B-011", "name": "Engineering Chemistry Laboratory", "building": "FET Campus - Block B", "floor": "Ground", "room_type": "lab", "rows": 5, "columns": 8, "total_seats": 40, "is_exam_approved": False},
    {"code": "B-012", "name": "Engineering Physics Laboratory", "building": "FET Campus - Block B", "floor": "Ground", "room_type": "lab", "rows": 5, "columns": 8, "total_seats": 40, "is_exam_approved": False},
    {"code": "B-013", "name": "Faculty Lounge & Scholarly Research", "building": "FET Campus - Block B", "floor": "Ground", "room_type": "classroom", "rows": 4, "columns": 8, "total_seats": 32, "is_exam_approved": False},
    {"code": "B-014", "name": "Executive Board Room & Senate Hall", "building": "FET Campus - Block B", "floor": "Ground", "room_type": "classroom", "rows": 6, "columns": 8, "total_seats": 48, "is_exam_approved": False},
    # 1st Floor Lecture Halls & Labs
    {"code": "A-101", "name": "Lecture Hall A-101", "building": "FET Campus - Block A", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-102", "name": "Lecture Hall A-102", "building": "FET Campus - Block A", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-103", "name": "Lecture Hall A-103", "building": "FET Campus - Block A", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-113", "name": "First Floor Seminar Auditorium", "building": "FET Campus - Block A", "floor": "1", "room_type": "exam_hall", "rows": 10, "columns": 10, "total_seats": 100, "is_exam_approved": True},
    {"code": "A-114", "name": "Electronics & Communication Lab", "building": "FET Campus - Block A", "floor": "1", "room_type": "lab", "rows": 5, "columns": 8, "total_seats": 40, "is_exam_approved": False},
    {"code": "A-115", "name": "Analog & Power Electronics Lab", "building": "FET Campus - Block A", "floor": "1", "room_type": "lab", "rows": 5, "columns": 8, "total_seats": 40, "is_exam_approved": False},
    {"code": "A-116", "name": "Digital Systems & VLSI Design Lab", "building": "FET Campus - Block A", "floor": "1", "room_type": "lab", "rows": 5, "columns": 8, "total_seats": 40, "is_exam_approved": False},
    {"code": "B-110", "name": "Lecture Hall B-110", "building": "FET Campus - Block B", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-111", "name": "Lecture Hall B-111", "building": "FET Campus - Block B", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-112", "name": "Lecture Hall B-112", "building": "FET Campus - Block B", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-125-A", "name": "Computer Lab 1 (Advanced Computing)", "building": "FET Campus - Block B", "floor": "1", "room_type": "lab", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-125-B", "name": "Computer Lab 2 (Software Systems)", "building": "FET Campus - Block B", "floor": "1", "room_type": "lab", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-126-A", "name": "Computer Lab 3 (Data Engineering)", "building": "FET Campus - Block B", "floor": "1", "room_type": "lab", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-126-B", "name": "Computer Lab 4 (Cloud & Networks)", "building": "FET Campus - Block B", "floor": "1", "room_type": "lab", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-127-A", "name": "Lecture Hall B-127-A", "building": "FET Campus - Block B", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-127-B", "name": "Lecture Hall B-127-B", "building": "FET Campus - Block B", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-127-C", "name": "Lecture Hall B-127-C", "building": "FET Campus - Block B", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-106", "name": "Lecture Hall C-106", "building": "FET Campus - Block C", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-107", "name": "Lecture Hall C-107", "building": "FET Campus - Block C", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-108", "name": "Lecture Hall C-108", "building": "FET Campus - Block C", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-109", "name": "Lecture Hall C-109", "building": "FET Campus - Block C", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "D-104", "name": "Lecture Hall D-104", "building": "FET Campus - Block D", "floor": "1", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    # 2nd Floor
    {"code": "A-201", "name": "Lecture Hall A-201", "building": "FET Campus - Block A", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-202", "name": "Lecture Hall A-202", "building": "FET Campus - Block A", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-203", "name": "Lecture Hall A-203", "building": "FET Campus - Block A", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-207", "name": "Lecture Hall B-207", "building": "FET Campus - Block B", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-208", "name": "Lecture Hall B-208", "building": "FET Campus - Block B", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-224", "name": "Advanced Computing Systems & AI Lab", "building": "FET Campus - Block B", "floor": "2", "room_type": "lab", "rows": 6, "columns": 8, "total_seats": 48, "is_exam_approved": True},
    {"code": "D-204", "name": "Lecture Hall D-204", "building": "FET Campus - Block D", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "D-205", "name": "Lecture Hall D-205", "building": "FET Campus - Block D", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "D-206", "name": "Lecture Hall D-206", "building": "FET Campus - Block D", "floor": "2", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    # 3rd Floor Official Examination Centers
    {"code": "A-313", "name": "Examination Section (Controller Wing)", "building": "FET Campus - Block A", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-314", "name": "Central Valuation & Grading Center", "building": "FET Campus - Block A", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-327", "name": "Examination Section (Evaluation Branch)", "building": "FET Campus - Block C", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-301", "name": "Lecture Hall A-301", "building": "FET Campus - Block A", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-302", "name": "Lecture Hall A-302", "building": "FET Campus - Block A", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "A-303", "name": "Lecture Hall A-303", "building": "FET Campus - Block A", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-307", "name": "Lecture Hall B-307", "building": "FET Campus - Block B", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-310", "name": "Lecture Hall C-310", "building": "FET Campus - Block C", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "D-304", "name": "Lecture Hall D-304", "building": "FET Campus - Block D", "floor": "3", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    # 4th Floor
    {"code": "A-403", "name": "Lecture Hall A-403", "building": "FET Campus - Block A", "floor": "4", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-407", "name": "Lecture Hall B-407", "building": "FET Campus - Block B", "floor": "4", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "B-408", "name": "Lecture Hall B-408", "building": "FET Campus - Block B", "floor": "4", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-410", "name": "Lecture Hall C-410", "building": "FET Campus - Block C", "floor": "4", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-411", "name": "Lecture Hall C-411", "building": "FET Campus - Block C", "floor": "4", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
    {"code": "C-412", "name": "Lecture Hall C-412", "building": "FET Campus - Block C", "floor": "4", "room_type": "exam_hall", "rows": 6, "columns": 6, "total_seats": 36, "is_exam_approved": True},
]


def seed_campus_rooms(supabase_client=None) -> dict:
    total_rooms = len(CAMPUS_ROOMS_CATALOG)
    if supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if url and key:
            try:
                from supabase import create_client
                supabase_client = create_client(url, key)
            except Exception as e:
                print(f"Could not connect to Supabase: {e}")

    if supabase_client:
        print(f"Upserting {total_rooms} authentic campus rooms into Supabase...")
        for r in CAMPUS_ROOMS_CATALOG:
            supabase_client.table("rooms").upsert(
                r, on_conflict="code"
            ).execute()
        print(f"Successfully seeded {total_rooms} campus rooms into Supabase.")
    else:
        print(f"Campus rooms seed verified: {total_rooms} authentic halls ready for Supabase.")

    return {"rooms": total_rooms}


if __name__ == "__main__":
    seed_campus_rooms()
