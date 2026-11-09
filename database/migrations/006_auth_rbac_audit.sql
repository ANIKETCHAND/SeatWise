-- ============================================================
-- SeatWise — Schema migration 006: RBAC, Auth & Audit Enhancements
-- Supabase PostgreSQL. Additive migration for Four-Role Auth,
-- Role Permissions, User Overrides, Assignments & Audit Logs.
-- ============================================================

-- ---------- Extend Profiles ----------
alter table public.profiles
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists department text,
  add column if not exists account_status text not null default 'active' check (account_status in ('active', 'deactivated', 'suspended')),
  add column if not exists must_change_password boolean not null default false;

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_email on public.profiles (lower(email));
create index if not exists idx_profiles_username on public.profiles (lower(username));
create index if not exists idx_profiles_status on public.profiles (account_status);

-- Update user_roles view to expose new fields
create or replace view public.user_roles as
  select
    id as user_id,
    role,
    full_name,
    created_at,
    updated_at,
    email,
    username,
    department,
    account_status,
    must_change_password
  from public.profiles;

-- ---------- Role Permissions (default permissions per role) ----------
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role app_role not null,
  permission_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (role, permission_key)
);
create index if not exists idx_role_permissions_role on public.role_permissions (role);
create index if not exists idx_role_permissions_perm on public.role_permissions (permission_key);

-- ---------- User Specific Permissions (granular overrides) ----------
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, permission_key)
);
create index if not exists idx_user_permissions_user on public.user_permissions (user_id);
create index if not exists idx_user_permissions_perm on public.user_permissions (permission_key);

-- ---------- User Scope Assignments (faculty/staff scopes) ----------
create table if not exists public.user_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_type text not null check (assignment_type in ('subject', 'batch', 'examination', 'hall')),
  assignment_reference text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_assignments_user on public.user_assignments (user_id, assignment_type);

-- ---------- System Settings & Bootstrap State ----------
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------- Audit Logs Extensions ----------
alter table public.audit_logs
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists target_user_id uuid references auth.users(id) on delete set null,
  add column if not exists affected_resource text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_audit_actor on public.audit_logs (actor_user_id);
create index if not exists idx_audit_target on public.audit_logs (target_user_id);

-- ---------- Seed Initial Default Role Permissions ----------
insert into public.role_permissions (role, permission_key, enabled) values
  -- Admin: complete system administration
  ('admin', 'dashboard.view', true),
  ('admin', 'users.view', true),
  ('admin', 'users.create', true),
  ('admin', 'users.update', true),
  ('admin', 'users.deactivate', true),
  ('admin', 'users.reset_password', true),
  ('admin', 'roles.assign', true),
  ('admin', 'programs.manage', true),
  ('admin', 'batches.manage', true),
  ('admin', 'students.view', true),
  ('admin', 'students.create', true),
  ('admin', 'students.update', true),
  ('admin', 'students.import', true),
  ('admin', 'faculty.manage', true),
  ('admin', 'timetable.view', true),
  ('admin', 'timetable.create', true),
  ('admin', 'timetable.update', true),
  ('admin', 'rooms.view', true),
  ('admin', 'rooms.manage', true),
  ('admin', 'examinations.view', true),
  ('admin', 'examinations.create', true),
  ('admin', 'examinations.update', true),
  ('admin', 'examinations.archive', true),
  ('admin', 'seating.generate', true),
  ('admin', 'seating.modify', true),
  ('admin', 'seating.validate', true),
  ('admin', 'seating.publish', true),
  ('admin', 'attendance.manage', true),
  ('admin', 'reports.view', true),
  ('admin', 'reports.export', true),
  ('admin', 'settings.manage', true),
  ('admin', 'audit_logs.view', true),
  ('admin', 'student.seat_lookup.self', true),

  -- Exam Staff: examination operations & scheduling
  ('exam_staff', 'dashboard.view', true),
  ('exam_staff', 'examinations.view', true),
  ('exam_staff', 'examinations.create', true),
  ('exam_staff', 'examinations.update', true),
  ('exam_staff', 'rooms.view', true),
  ('exam_staff', 'seating.generate', true),
  ('exam_staff', 'seating.modify', true),
  ('exam_staff', 'seating.validate', true),
  ('exam_staff', 'seating.publish', true),
  ('exam_staff', 'students.view', true),
  ('exam_staff', 'students.import', true),
  ('exam_staff', 'attendance.manage', true),
  ('exam_staff', 'reports.view', true),
  ('exam_staff', 'reports.export', true),
  ('exam_staff', 'timetable.view', true),

  -- Faculty: academic assignments, student rosters & attendance
  ('faculty', 'dashboard.view', true),
  ('faculty', 'timetable.view', true),
  ('faculty', 'timetable.create', true),
  ('faculty', 'timetable.update', true),
  ('faculty', 'examinations.view', true),
  ('faculty', 'seating.generate', true),
  ('faculty', 'seating.modify', true),
  ('faculty', 'seating.validate', true),
  ('faculty', 'attendance.manage', true),
  ('faculty', 'reports.view', true),
  ('faculty', 'reports.export', true),
  ('faculty', 'students.view', true),

  -- Student: self seat lookup and schedule view
  ('student', 'dashboard.view', true),
  ('student', 'student.seat_lookup.self', true)
on conflict (role, permission_key) do nothing;

-- Seed system configuration defaults
insert into public.system_settings (key, value, description) values
  ('bootstrap_completed', 'false'::jsonb, 'Whether the initial administrator bootstrap has been executed'),
  ('password_policy', '{"min_length": 12, "require_upper": true, "require_lower": true, "require_number": true, "require_special": true}'::jsonb, 'Password strength enforcement rules'),
  ('rate_limit_policy', '{"max_login_attempts_per_min": 5, "lockout_minutes": 15}'::jsonb, 'Authentication rate limiting configuration')
on conflict (key) do nothing;

-- ---------- Row Level Security for New Tables ----------
alter table public.role_permissions enable row level security;
alter table public.user_permissions enable row level security;
alter table public.user_assignments enable row level security;
alter table public.system_settings  enable row level security;

-- role_permissions RLS
drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions
  for select to authenticated using (true);

drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- user_permissions RLS
drop policy if exists user_permissions_read on public.user_permissions;
create policy user_permissions_read on public.user_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_permissions_admin_write on public.user_permissions;
create policy user_permissions_admin_write on public.user_permissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- user_assignments RLS
drop policy if exists user_assignments_read on public.user_assignments;
create policy user_assignments_read on public.user_assignments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.my_role() = 'exam_staff');

drop policy if exists user_assignments_admin_write on public.user_assignments;
create policy user_assignments_admin_write on public.user_assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- system_settings RLS
drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings
  for select to authenticated using (true);

drop policy if exists system_settings_admin_write on public.system_settings;
create policy system_settings_admin_write on public.system_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- Update Profiles RLS ----------
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.my_role() in ('exam_staff', 'faculty'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and account_status = (select account_status from public.profiles where id = auth.uid())
  );

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- Tighten Students RLS ----------
-- Students can ONLY view their own record; faculty, staff and admin can view student lists
drop policy if exists students_read on public.students;
create policy students_read on public.students
  for select to authenticated
  using (
    public.is_admin()
    or auth_user_id = auth.uid()
    or public.my_role() in ('faculty', 'exam_staff')
  );
