# SeatWise — Comprehensive Database Schema & Supabase Audit

**Project:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Database Engine:** PostgreSQL 16.x (Supabase Cloud Hosted)  
**Supabase Reference:** `wooszgwfkuzmxcinwlpj` (`https://wooszgwfkuzmxcinwlpj.supabase.co`)  
**Date:** November 2026  
**Author:** Team E — PostgreSQL Architects & Data Integrity Engineers  

---

## 1. Database Architecture & Schema Overview

The SeatWise persistence tier is hosted on Supabase PostgreSQL and models university examinations, academic curricula, architectural facilities, seating plans, and security audits across **20 relational entities**.

The database schema is strictly managed via **6 additive SQL migrations** in `database/migrations/`:
1. `001_schema.sql` — Core relational tables, domain types, constraints, and composite unique keys.
2. `002_rls.sql` — Row-Level Security (RLS) policies, security definer helper functions (`my_role()`, `is_admin()`).
3. `003_seed_university.sql` — Seed data for Jain University FET degree programs, branches, and departmental structures.
4. `004_rpc.sql` — Transactional PL/pgSQL stored procedures for atomic seating plan generation and persistence.
5. `005_import_rpc.sql` — Transactional timetable workbook bulk import stored procedure (`import_timetable_data`).
6. `006_auth_rbac_audit.sql` — Audit logging triggers, password policy checks, and administrative security tables.

---

## 2. Complete Relational Entities Inventory (20 Tables & Views)

| # | Entity Name | Primary Key | Description & Domain Role | Key Foreign Keys & Cascade Rules |
|---|---|---|---|---|
| 1 | `profiles` | `id` (UUID) | User account identity, email, full name, role | Linked to `auth.users(id) on delete cascade` |
| 2 | `user_roles` | `id` (UUID) | Role mapping lookup (`admin`, `exam_staff`, `faculty`, `student`) | Linked to `profiles(id) on delete cascade` |
| 3 | `programs` | `id` (UUID) | Academic degree programs under Jain FET (e.g. B.Tech CSE, ISE, ECE) | Referenced by batches |
| 4 | `batches` | `id` (UUID) | Specific cohort sections (e.g. B.Tech CSE 5th Sem Sec A) | `program_id -> programs(id) on delete cascade` |
| 5 | `students` | `id` (UUID) | Enrolled students, USN/roll numbers, section assignments | `batch_id -> batches(id)`, `auth_user_id -> profiles(id)` |
| 6 | `faculty` | `id` (UUID) | Academic instructors, department, employee ID | `auth_user_id -> profiles(id)` |
| 7 | `subjects` | `id` (UUID) | Course catalog, course codes, lecture credits | `program_id -> programs(id)` |
| 8 | `timetable_entries` | `id` (UUID) | Weekly class slots (Day, Period, Room, Faculty, Batch) | `batch_id`, `subject_id`, `room_id`, `faculty_id` |
| 9 | `rooms` | `id` (UUID) | Classrooms, seminar halls, and certified exam halls | Referenced by room layouts and timetable |
| 10 | `room_layouts` | `id` (UUID) | Room grid configuration (Rows, Columns, Usable Capacity) | `room_id -> rooms(id) on delete cascade` |
| 11 | `room_seats` | `id` (UUID) | Specific physical desk coordinate `(row, col)`, blocked flag | `room_id -> rooms(id) on delete cascade` |
| 12 | `examinations` | `id` (UUID) | Exam session (Date, Session `FN`/`AN`, Name, Status) | Referenced by exam batches and halls |
| 13 | `examination_batches` | `id` (UUID) | Many-to-many link between exams and registered batches | `exam_id -> examinations(id)`, `batch_id -> batches(id)` |
| 14 | `examination_halls` | `id` (UUID) | Certified exam halls allocated for an examination session | `exam_id -> examinations(id)`, `room_id -> rooms(id)` |
| 15 | `seating_plans` | `id` (UUID) | Seating arrangement root (Type: `exam` or `classroom`, Status) | `exam_id -> examinations(id) on delete cascade` |
| 16 | `seat_assignments` | `id` (UUID) | Injective mapping: `(plan_id, student_id) -> (room_id, row, col)` | `seating_plan_id`, `student_id`, `room_id` on delete cascade |
| 17 | `attendance_records` | `id` (UUID) | Present/Absent/Malpractice tracking per seat assignment | `seat_assignment_id -> seat_assignments(id)` |
| 18 | `seating_policies` | `id` (UUID) | Adjacency rules (Horizontal, Vertical, Diagonal flags) | Linked to seating plans or examinations |
| 19 | `import_jobs` | `id` (UUID) | Bulk import tracking (status, errors, row counts) | `created_by -> profiles(id)` |
| 20 | `audit_logs` | `id` (UUID) | Immutable operational security audit trail | `actor_id -> profiles(id)` |

---

## 3. Data Integrity & Constraint Verification

### 3.1 Composite Unique Constraints
The schema enforces mathematical and operational guarantees directly via database constraints:
1. **USN / Roll Number Uniqueness:**
   ```sql
   ALTER TABLE public.students ADD CONSTRAINT students_roll_number_key UNIQUE (roll_number);
   ```
   Prevents duplicate student enrollment under the same University Seat Number.
2. **Physical Desk Coordinate Uniqueness:**
   ```sql
   ALTER TABLE public.room_seats ADD CONSTRAINT room_seats_room_id_row_col_key UNIQUE (room_id, row, col);
   ```
   Prevents overlapping desk definitions in the same room.
3. **Injective Student Mapping (One Seat Per Student Per Plan):**
   ```sql
   ALTER TABLE public.seat_assignments ADD CONSTRAINT seat_assignments_plan_student_key UNIQUE (seating_plan_id, student_id);
   ```
   Guarantees no student is assigned to multiple desks in the same examination session.
4. **Desk Exclusivity (One Student Per Physical Desk):**
   ```sql
   ALTER TABLE public.seat_assignments ADD CONSTRAINT seat_assignments_plan_room_row_col_key UNIQUE (seating_plan_id, room_id, row, col);
   ```
   Guarantees no two students occupy the same desk coordinate in the same plan.
5. **Timetable Slot Exclusivity:**
   ```sql
   ALTER TABLE public.timetable_entries ADD CONSTRAINT timetable_batch_day_period_key UNIQUE (batch_id, day, period_start);
   ```
   Guarantees no cohort is double-booked for two classes during the same timetable period.

---

## 4. Transactional PL/pgSQL Stored Procedures

To eliminate partial writes and race conditions during high-concurrency exam generation, SeatWise encapsulates complex writes inside atomic stored procedures:

### 4.1 `public.save_seating_plan`
```sql
CREATE OR REPLACE FUNCTION public.save_seating_plan(
    p_exam_id UUID,
    p_plan_type TEXT,
    p_status TEXT,
    p_assignments JSONB
) RETURNS UUID AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
- Inserts or updates the root `seating_plans` record.
- Deletes stale assignments for this plan in an atomic transaction.
- Unrolls `p_assignments` JSONB array into bulk `seat_assignments` rows.
- Automatically rolls back if any foreign key or unique constraint is violated.

### 4.2 `public.replace_seating_plan_assignments`
Enables manual drag-and-swap seat adjustments by administrators. Swapping two seats executes atomically without triggering temporary uniqueness constraint conflicts.

### 4.3 `public.import_timetable_data`
Bulk-processes hundreds of timetable entries parsed from the Jain University FET Excel workbook inside a single transaction, rolling back on error and returning detailed error rows.

---

## 5. Row-Level Security (RLS) Policy Audit

All 20 tables have Row-Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

Key policy rules verified:
1. **Profiles Table:**
   - `profiles_self_read`: Authenticated users can view their own profile (`auth.uid() = id`).
   - `profiles_admin_all`: Administrators (`is_admin() = true`) have full CRUD access.
2. **Students Table:**
   - `students_self_read`: Students can view only their own record (`auth_user_id = auth.uid()`).
   - `students_staff_read`: Administrators, Exam Staff, and Faculty can read student rosters.
3. **Examinations & Seating Plans:**
   - `seating_plans_published_student_read`: Students can only read seating plans marked `published`. Draft plans remain invisible to students.
   - `seat_assignments_student_read`: Students can only query seat assignments linked to their own `student_id`.
4. **Audit Logs:**
   - Read-only to administrators (`is_admin() = true`).
   - Inserts permitted exclusively via database security definer triggers.

---

## 6. Persistence & Reload Verification

Automated and manual tests verified that:
- Changes saved in `RoomsPage` (e.g. blocking desks) persist across page reloads and browser sessions.
- Generated examination seating plans retain student assignments after administrator logout and re-login.
- Published plans remain visible in the Student Portal across independent sessions.

---

## 7. Database Audit Signoff

The database layer provides high data integrity, strict unique constraints, transactional stored procedures, and robust Row-Level Security policies that prevent unauthorized access and data corruption.
