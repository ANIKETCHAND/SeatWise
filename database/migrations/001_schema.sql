-- ============================================================
-- SeatWise — Schema migration 001: core tables
-- Supabase PostgreSQL. Idempotent where practical.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type app_role as enum ('admin', 'faculty', 'exam_staff', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type slot_type as enum ('class', 'lab', 'lab_continue', 'activity', 'lunch', 'free', 'sametime');
exception when duplicate_object then null; end $$;

do $$ begin
  create type room_type as enum ('classroom', 'lab', 'exam_hall');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_kind as enum ('classroom', 'examination');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type validation_status as enum ('pending', 'valid', 'invalid', 'infeasible', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_job_type as enum ('timetable', 'students', 'faculty');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_job_status as enum ('pending', 'previewed', 'completed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type entity_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type exam_session as enum ('FN', 'AN');
exception when duplicate_object then null; end $$;

-- ---------- Profiles (linked to Supabase auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- User Roles (audited view/table) ----------
create or replace view public.user_roles as
  select id as user_id, role, full_name, created_at, updated_at from public.profiles;


-- ---------- University structure ----------
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  semester int not null check (semester between 1 and 10),
  section text not null,
  class_teacher text,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, semester, section)
);

-- ---------- People ----------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text unique,
  roll_number text not null,
  full_name text not null,
  program_id uuid not null references public.programs(id) on delete restrict,
  semester int not null,
  section text not null,
  email text,
  phone text,
  status entity_status not null default 'active',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- University-scope uniqueness of roll numbers
  unique (roll_number)
);
create index if not exists idx_students_batch on public.students (program_id, semester, section);
create index if not exists idx_students_name on public.students (lower(full_name));

create table if not exists public.faculty (
  id uuid primary key default gen_random_uuid(),
  faculty_code text unique,
  full_name text not null,
  email text,
  department text,
  designation text,
  status entity_status not null default 'active',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_faculty_name on public.faculty (lower(full_name));

create table if not exists public.faculty_subjects (
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  primary key (faculty_id, subject_id, batch_id)
);

-- ---------- Subjects ----------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text not null,
  ltpe text,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, abbreviation)
);

-- Individual section-specific course codes (e.g. C18A) that map to a subject
create table if not exists public.subject_codes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  code text not null unique,
  program_id uuid references public.programs(id) on delete set null
);

-- ---------- Rooms ----------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  building text not null default '',
  floor text not null default '',
  room_type room_type not null default 'classroom',
  rows int not null default 0 check (rows >= 0),
  columns int not null default 0 check (columns >= 0),
  total_seats int not null default 0,
  is_exam_approved boolean not null default false,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_seats (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  row int not null check (row >= 0),
  col int not null check (col >= 0),
  seat_label text not null,
  is_blocked boolean not null default false,
  unique (room_id, row, col)
);
create index if not exists idx_room_seats_room on public.room_seats (room_id);

-- ---------- Room Layouts (audited view/table) ----------
create or replace view public.room_layouts as
  select id as room_id, name, rows, columns, total_seats, is_exam_approved, created_at, updated_at from public.rooms;


-- ---------- Timetable ----------
create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  day text not null check (day in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  period_start int not null check (period_start between 1 and 12),
  period_end int not null check (period_end between 1 and 12),
  slot_type slot_type not null,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_code text,
  subject_label text not null default '',
  faculty_id uuid references public.faculty(id) on delete set null,
  faculty_name text,
  room_id uuid references public.rooms(id) on delete set null,
  room_name text,
  is_multi_period boolean not null default false,
  source text not null default 'import',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Prevent duplicate timetable entries for the same batch/day/period
  unique (batch_id, day, period_start)
);
create index if not exists idx_timetable_room_time on public.timetable_entries (room_id, day, period_start);
create index if not exists idx_timetable_batch on public.timetable_entries (batch_id, day, period_start);

-- ---------- Seating policies ----------
create table if not exists public.seating_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  block_same_batch_horizontal boolean not null default true,
  block_same_batch_vertical boolean not null default true,
  block_same_batch_diagonal boolean not null default false,
  allow_empty_seats boolean not null default true,
  allow_mixed_batch boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Examinations ----------
create table if not exists public.examinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam_date date not null,
  session exam_session not null,
  status plan_status not null default 'draft',
  policy_id uuid references public.seating_policies(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.examination_batches (
  examination_id uuid not null references public.examinations(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  primary key (examination_id, batch_id)
);

create table if not exists public.examination_halls (
  examination_id uuid not null references public.examinations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  primary key (examination_id, room_id)
);

-- ---------- Seating plans & assignments ----------
create table if not exists public.seating_plans (
  id uuid primary key default gen_random_uuid(),
  kind plan_kind not null,
  examination_id uuid references public.examinations(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  timetable_entry_id uuid references public.timetable_entries(id) on delete set null,
  plan_date date,
  period int,
  status plan_status not null default 'draft',
  validation_status validation_status not null default 'pending',
  validation_report jsonb not null default '{}'::jsonb,
  solver_name text,
  solve_seconds numeric,
  generated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A classroom plan is tied to exactly one batch+room+timetable entry
  constraint classroom_plan_context check (
    kind <> 'classroom' or (batch_id is not null and room_id is not null)
  ),
  constraint exam_plan_context check (
    kind <> 'examination' or examination_id is not null
  )
);
create index if not exists idx_plans_exam on public.seating_plans (examination_id);
create index if not exists idx_plans_batch_date on public.seating_plans (batch_id, plan_date, period);

create table if not exists public.seat_assignments (
  id uuid primary key default gen_random_uuid(),
  seating_plan_id uuid not null references public.seating_plans(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  seat_id uuid references public.room_seats(id) on delete set null,
  row int not null,
  col int not null,
  seat_label text not null,
  created_at timestamptz not null default now(),
  -- A student occupies at most one seat per plan; a seat holds at most one student
  unique (seating_plan_id, student_id),
  unique (seating_plan_id, room_id, row, col)
);
create index if not exists idx_assignments_plan on public.seat_assignments (seating_plan_id);
create index if not exists idx_assignments_student on public.seat_assignments (student_id);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  seating_plan_id uuid not null references public.seating_plans(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'present' check (status in ('present','absent')),
  marked_at timestamptz not null default now(),
  unique (seating_plan_id, student_id)
);

-- ---------- Imports & audit ----------
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type import_job_type not null,
  status import_job_status not null default 'pending',
  filename text not null default '',
  total_rows int not null default 0,
  valid_rows int not null default 0,
  error_rows int not null default 0,
  report jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_created on public.audit_logs (created_at desc);
