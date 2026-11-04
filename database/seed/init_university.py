"""University database initialization script.

Idempotently inserts the verified Jain University structure (15 programs, 94 batches)
into Supabase PostgreSQL. Safe to run multiple times without creating duplicate records.
"""

from __future__ import annotations

import os
import sys

# 15 programs and 94 batches per master specification
INITIAL_PROGRAMS = [
    {"code": "AI-DevOPS", "name": "AI-DevOPS", "batches": [(1, "A"), (3, "A"), (5, "A")]},
    {"code": "AIDE", "name": "AIDE", "batches": [(1, "A"), (3, "A"), (3, "B"), (5, "A"), (7, "A")]},
    {
        "code": "AIML",
        "name": "AIML",
        "batches": [
            (1, "A"), (1, "B"), (1, "C"), (1, "D"), (1, "E"), (1, "F"), (1, "G"),
            (3, "A"), (3, "B"), (3, "C"), (3, "D"), (3, "E"),
            (5, "A"), (5, "B"), (5, "C"), (5, "D"),
            (7, "A"), (7, "B"), (7, "C"), (7, "D"),
        ],
    },
    {"code": "Blockchain", "name": "Blockchain", "batches": [(3, "A"), (5, "A")]},
    {"code": "CPS", "name": "CPS", "batches": [(1, "A"), (3, "A"), (5, "A")]},
    {"code": "CSBS", "name": "CSBS", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
    {"code": "CSE-AI", "name": "CSE-AI", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
    {
        "code": "CSE-GEN",
        "name": "CSE-GEN",
        "batches": [
            (1, "A"), (1, "B"), (1, "C"), (1, "D"), (1, "E"), (1, "F"),
            (3, "A"), (3, "B"), (3, "C"), (3, "D"), (3, "E"), (3, "F"), (3, "G"),
            (5, "A"), (5, "B"), (5, "C"), (5, "D"), (5, "E"),
            (7, "A"), (7, "B"), (7, "C"), (7, "D"), (7, "E"),
        ],
    },
    {"code": "CTIS", "name": "CTIS", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
    {"code": "CTMA", "name": "CTMA", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
    {"code": "CyberSecurity", "name": "CyberSecurity", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
    {"code": "DS", "name": "DS", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
    {"code": "IOT", "name": "IOT", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
    {
        "code": "MTech",
        "name": "MTech",
        "batches": [(1, "A"), (1, "B"), (1, "C"), (3, "A"), (3, "B"), (3, "C")],
    },
    {"code": "SE", "name": "SE", "batches": [(1, "A"), (3, "A"), (5, "A"), (7, "A")]},
]


def seed_university(supabase_client=None) -> dict:
    total_programs = len(INITIAL_PROGRAMS)
    total_batches = sum(len(p["batches"]) for p in INITIAL_PROGRAMS)
    assert total_programs == 15, f"Expected 15 programs, got {total_programs}"
    assert total_batches == 94, f"Expected 94 batches, got {total_batches}"

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
        print("Connected to Supabase. Upserting 15 programs and 94 batches...")
        # 1. Upsert programs
        for p in INITIAL_PROGRAMS:
            supabase_client.table("programs").upsert(
                {"code": p["code"], "name": p["name"], "status": "active"},
                on_conflict="code",
            ).execute()

        # Fetch program IDs
        prog_rows = supabase_client.table("programs").select("id,code").execute().data or []
        prog_id_map = {r["code"]: r["id"] for r in prog_rows}

        # 2. Upsert batches
        batches_to_insert = []
        for p in INITIAL_PROGRAMS:
            pid = prog_id_map.get(p["code"])
            if not pid:
                continue
            for sem, sec in p["batches"]:
                batches_to_insert.append({
                    "program_id": pid,
                    "semester": sem,
                    "section": sec,
                    "status": "active",
                })
        
        for b in batches_to_insert:
            supabase_client.table("batches").upsert(
                b, on_conflict="program_id,semester,section"
            ).execute()

        print(f"Successfully seeded {total_programs} programs and {total_batches} batches into Supabase.")
    else:
        print(f"University seed definition verified: {total_programs} programs and {total_batches} batches ready for Supabase.")

    return {"programs": total_programs, "batches": total_batches}


if __name__ == "__main__":
    seed_university()
