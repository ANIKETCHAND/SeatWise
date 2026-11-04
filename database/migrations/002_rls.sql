-- ============================================================
-- SeatWise — Schema migration 002: Row Level Security
-- The FastAPI backend holds the service-role key and enforces
-- role authorization per request. RLS here is defense-in-depth:
-- it constrains direct anon/authenticated access.
-- ============================================================

-- Helper: role of the current authenticated user
create or replace function public.my_role()
returns app_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: is the caller an administrator?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.my_role() = 'admin';
$$;

-- ---------- Enable RLS on every table ----------
alter table public.profiles            enable row level security;
alter table public.programs            enable row level security;
alter table public.batches             enable row level security;
alter table public.students            enable row level security;
alter table public.faculty             enable row level security;
alter table public.faculty_subjects    enable row level security;
alter table public.subjects            enable row level security;
alter table public.subject_codes       enable row level security;
alter table public.timetable_entries   enable row level security;
alter table public.rooms               enable row level security;
alter table public.room_seats          enable row level security;
alter table public.seating_policies    enable row level security;
alter table public.examinations        enable row level security;
alter table public.examination_batches enable row level security;
alter table public.examination_halls   enable row level security;
alter table public.seating_plans       enable row level security;
alter table public.seat_assignments    enable row level security;
alter table public.attendance_records  enable row level security;
alter table public.import_jobs         enable row level security;
alter table public.audit_logs          enable row level security;

-- ---------- Profiles ----------
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- ---------- Public catalogue: readable by any authenticated user ----------
do $$
declare t text;
begin
  foreach t in array array['programs','batches','subjects','subject_codes','rooms','room_seats','seating_policies','timetable_entries','faculty','faculty_subjects']
  loop
    execute format('drop policy if exists %I_read on public.%I;', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (true);', t, t);
  end loop;
end $$;

-- Writes on catalogue tables: administrators only (service role bypasses RLS anyway)
do $$
declare t text;
begin
  foreach t in array array['programs','batches','subjects','subject_codes','rooms','room_seats','seating_policies','timetable_entries','faculty','faculty_subjects']
  loop
    execute format('drop policy if exists %I_admin_write on public.%I;', t, t);
    execute format(
      'create policy %I_admin_write on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin());', t, t);
  end loop;
end $$;

-- ---------- Students ----------
drop policy if exists students_read on public.students;
create policy students_read on public.students
  for select to authenticated
  using (
    public.is_admin()
    or auth_user_id = auth.uid()
    or public.my_role() in ('faculty', 'exam_staff')
    -- students may see the roster basics of their own batch
    or exists (
      select 1 from public.students s
      where s.auth_user_id = auth.uid()
        and s.program_id = students.program_id
        and s.semester = students.semester
        and s.section = students.section
    )
  );

drop policy if exists students_write on public.students;
create policy students_write on public.students
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Examinations ----------
drop policy if exists exams_read on public.examinations;
create policy exams_read on public.examinations
  for select to authenticated using (true);

drop policy if exists exams_admin_write on public.examinations;
create policy exams_admin_write on public.examinations
  for all to authenticated
  using (public.is_admin() or public.my_role() = 'exam_staff')
  with check (public.is_admin() or public.my_role() = 'exam_staff');

do $$
declare t text;
begin
  foreach t in array array['examination_batches','examination_halls'] loop
    execute format('drop policy if exists %I_read on public.%I;', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (true);', t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated
         using (public.is_admin() or public.my_role() = ''exam_staff'')
         with check (public.is_admin() or public.my_role() = ''exam_staff'');', t, t);
  end loop;
end $$;

-- ---------- Seating plans & assignments ----------
-- Published plans are readable by everyone logged in (students look up their seats).
drop policy if exists plans_read on public.seating_plans;
create policy plans_read on public.seating_plans
  for select to authenticated using (status = 'published' or public.is_admin() or public.my_role() = 'exam_staff');

drop policy if exists plans_write on public.seating_plans;
create policy plans_write on public.seating_plans
  for all to authenticated
  using (public.is_admin() or public.my_role() in ('exam_staff','faculty'))
  with check (public.is_admin() or public.my_role() in ('exam_staff','faculty'));

drop policy if exists assignments_read on public.seat_assignments;
create policy assignments_read on public.seat_assignments
  for select to authenticated using (
    exists (
      select 1 from public.seating_plans p
      where p.id = seating_plan_id and p.status = 'published'
    )
    or student_id in (select id from public.students where auth_user_id = auth.uid())
    or public.is_admin() or public.my_role() in ('exam_staff','faculty')
  );

drop policy if exists assignments_write on public.seat_assignments;
create policy assignments_write on public.seat_assignments
  for all to authenticated
  using (public.is_admin() or public.my_role() in ('exam_staff','faculty'))
  with check (public.is_admin() or public.my_role() in ('exam_staff','faculty'));

drop policy if exists attendance_read on public.attendance_records;
create policy attendance_read on public.attendance_records
  for select to authenticated using (
    public.is_admin() or public.my_role() in ('exam_staff','faculty')
    or student_id in (select id from public.students where auth_user_id = auth.uid())
  );

drop policy if exists attendance_write on public.attendance_records;
create policy attendance_write on public.attendance_records
  for all to authenticated
  using (public.is_admin() or public.my_role() in ('exam_staff','faculty'))
  with check (public.is_admin() or public.my_role() in ('exam_staff','faculty'));

-- ---------- Import jobs & audit logs ----------
drop policy if exists import_jobs_read on public.import_jobs;
create policy import_jobs_read on public.import_jobs
  for select to authenticated using (public.is_admin() or created_by = auth.uid());

drop policy if exists import_jobs_write on public.import_jobs;
create policy import_jobs_write on public.import_jobs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs
  for select to authenticated using (public.is_admin());

-- Audit inserts allowed for authenticated writers (service role covers admin flows)
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
