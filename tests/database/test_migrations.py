"""Database migration and SQL schema integrity test suite (Phase 2 audit)."""

from pathlib import Path
import re


def test_migration_files_exist():
    migrations_dir = Path(__file__).resolve().parents[2] / "database" / "migrations"
    assert migrations_dir.exists(), "database/migrations directory does not exist"
    expected = [
        "001_schema.sql",
        "002_rls.sql",
        "003_seed_university.sql",
        "004_rpc.sql",
        "005_import_rpc.sql",
    ]
    for f in expected:
        assert (migrations_dir / f).exists(), f"Missing migration file: {f}"


def test_all_20_required_tables_and_views_defined():
    schema_path = Path(__file__).resolve().parents[2] / "database" / "migrations" / "001_schema.sql"
    sql = schema_path.read_text(encoding="utf-8")

    # 20 required entities from Phase 2.2 specification
    required_entities = [
        "profiles",
        "user_roles",
        "programs",
        "batches",
        "students",
        "faculty",
        "subjects",
        "timetable_entries",
        "rooms",
        "room_layouts",
        "room_seats",
        "examinations",
        "examination_batches",
        "examination_halls",
        "seating_plans",
        "seat_assignments",
        "attendance_records",
        "seating_policies",
        "import_jobs",
        "audit_logs",
    ]

    for entity in required_entities:
        pattern = rf"(create table if not exists public\.{entity}|create or replace view public\.{entity})"
        assert re.search(pattern, sql, re.IGNORECASE), f"Entity {entity} not found in 001_schema.sql"


def test_schema_integrity_constraints_defined():
    schema_path = Path(__file__).resolve().parents[2] / "database" / "migrations" / "001_schema.sql"
    sql = schema_path.read_text(encoding="utf-8")

    # Check key constraints:
    # 1. Unique roll numbers on students
    assert "unique (roll_number)" in sql
    # 2. Unique seat per room coordinate
    assert "unique (room_id, row, col)" in sql
    # 3. Unique student per seating plan
    assert "unique (seating_plan_id, student_id)" in sql
    # 4. Unique seat occupancy per seating plan
    assert "unique (seating_plan_id, room_id, row, col)" in sql
    # 5. Unique timetable entry per batch/day/period
    assert "unique (batch_id, day, period_start)" in sql
    # 6. Cascade deletes on child tables
    assert "on delete cascade" in sql


def test_rls_security_definitions():
    rls_path = Path(__file__).resolve().parents[2] / "database" / "migrations" / "002_rls.sql"
    sql = rls_path.read_text(encoding="utf-8")

    assert "function public.my_role()" in sql
    assert "function public.is_admin()" in sql
    assert "enable row level security" in sql
    assert "create policy" in sql
    assert "profiles_self_read" in sql
    assert "students_read" in sql


def test_rpc_transactional_functions_defined():
    rpc_path = Path(__file__).resolve().parents[2] / "database" / "migrations" / "004_rpc.sql"
    sql = rpc_path.read_text(encoding="utf-8")

    assert "function public.save_seating_plan" in sql
    assert "function public.replace_seating_plan_assignments" in sql
    assert "function public.ensure_room_seats" in sql

    import_rpc_path = Path(__file__).resolve().parents[2] / "database" / "migrations" / "005_import_rpc.sql"
    import_sql = import_rpc_path.read_text(encoding="utf-8")
    assert "function public.import_timetable_data" in import_sql
