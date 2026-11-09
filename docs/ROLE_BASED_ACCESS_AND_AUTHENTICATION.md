# SeatWise — Four-Role Authentication, Administrator Control & RBAC Architecture

**SeatWise Examination Seating Management System**  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Production URL:** [https://seatwise-fet.vercel.app](https://seatwise-fet.vercel.app)  
**Database:** Supabase PostgreSQL (`wooszgwfkuzmxcinwlpj`)

---

## 1. Executive Summary & Authentication Architecture

SeatWise has transitioned from simulated demo profiles to a production-grade, four-role Role-Based Access Control (RBAC) architecture powered by **Supabase Auth** and **PostgreSQL Row Level Security (RLS)**.

Authentication guarantees:
1. **Authoritative Server-Side Role Verification:** Selecting an account type in the login portal is solely a user routing category. Roles are never inferred from client-side claims or request bodies; roles are loaded strictly from the trusted `profiles` database table after cryptographic JWT verification.
2. **Zero Production Demo Backdoors:** All `demo-token-*` authentication paths, 1-click persona logins, role switcher dropdowns, and client-side Google JWT role inferences have been permanently removed from production code. Demo tokens are strictly rejected with HTTP 401 in all non-test environments.
3. **Defense-in-Depth:** Route protection operates on three independent layers:
   - Client-side React route guards (`<ProtectedRoute>`).
   - Server-side FastAPI authorization dependencies (`require_admin`, `require_staff`, `require_permission`).
   - PostgreSQL Row Level Security (RLS) policies on all tables.

---

## 2. Four User Roles & Operational Scope

| Role | Portal Route | Primary Capabilities | Prohibited Operations |
| :--- | :--- | :--- | :--- |
| **Administrator** | `/dashboard`<br>`/admin/users`<br>`/admin/audit-logs` | Complete institutional control: user provisioning, password resets, RBAC overrides, exam creation, room layouts, timetable imports, audit review. | Cannot demote or deactivate the last active administrator. |
| **Exam Staff** | `/exam-dashboard`<br>`/examinations`<br>`/seating-planner`<br>`/rooms`<br>`/students`<br>`/reports` | Schedule examinations, configure seating policies, execute CP-SAT seat optimization, validate drafts, publish seat allocations, generate attendance notices. | Cannot access User Management (`/admin/*`), assign roles, change system settings, or reset administrator credentials. |
| **Faculty** | `/faculty-dashboard`<br>`/classroom-seating`<br>`/timetable`<br>`/reports` | View assigned teaching timetable, view student rosters for enrolled courses, generate classroom Mode-A seating, record attendance. | Cannot access unassigned batch records, create accounts, alter examination policies, or view institutional settings. |
| **Student** | `/student-dashboard`<br>`/seat-lookup` | View today's scheduled exams, locate assigned desk (visual seat locator highlighting room, row, col, desk label), upcoming exams, historical seat records. | Cannot create/edit seating plans, view other students' private seat allocations, access faculty data, or access management endpoints. |

---

## 3. Login Experience & Student Roll Number Resolution

### User Journey
$$\text{Landing Page} \longrightarrow \text{Sign In} \longrightarrow \text{Select Account Type} \longrightarrow \text{Role Form} \longrightarrow \text{Credential Verification} \longrightarrow \text{Authoritative Dashboard}$$

### Role Login Forms
Each role features a dedicated card and credential form:
1. **Administrator** (`ShieldCheck`): "Complete access to SeatWise administration and management."
2. **Exam Staff** (`ClipboardCheck`): "Examination scheduling, hall allocation, seating arrangement, and examination operations."
3. **Faculty** (`GraduationCap`): "Assigned academic information, examination seating, timetable, and permitted student operations."
4. **Student** (`UserRound`): "View examination schedules and find assigned examination hall and seat information."

### Student USN / Roll Number Resolution
Students can log in using either their institutional email or their University Roll Number (USN), e.g., `23JU0102`.
- When an identifier without `@` is submitted, the frontend invokes `POST /api/auth/resolve-roll`.
- The backend matches the roll number against the `students` directory and securely resolves the associated Supabase Auth email.
- The student's password is then verified against Supabase Auth.

---

## 4. Initial Administrator Bootstrap — Aniket Chandra

To bootstrap **Aniket Chandra** as the initial SeatWise Administrator without public sign-up vulnerability:

### Security Safeguards
1. **Server Secret:** Protected by `INITIAL_ADMIN_BOOTSTRAP_SECRET`.
2. **One-Time Permanent Lock:** Bootstrap automatically disables once an active administrator exists in `profiles` or when `bootstrap_completed` is set to `true` in `system_settings`.
3. **Cryptographic Timing Protection:** Secrets are validated using constant-time comparison (`hmac.compare_digest`).
4. **Audit Log:** The bootstrap action is immutably recorded in `audit_logs`.

### Bootstrap Procedure

#### Option A: Command-Line CLI Bootstrap (Recommended)
On the server host:
```powershell
py -3.14 -m backend.scripts.bootstrap_admin --email aniket.chandra@jainuniversity.ac.in
```
You will be prompted to enter a secure password (minimum 12 characters).

#### Option B: HTTP API Bootstrap
Send a `POST` request to `/api/auth/bootstrap-admin`:
```bash
curl -X POST https://seatwise-fet.vercel.app/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{
    "bootstrap_secret": "<INITIAL_ADMIN_BOOTSTRAP_SECRET>",
    "email": "aniket.chandra@jainuniversity.ac.in",
    "password": "<MINIMUM_12_CHAR_SECURE_PASSWORD>",
    "full_name": "Aniket Chandra"
  }'
```
Upon success:
- Aniket Chandra's Supabase Auth user is created/linked.
- `public.profiles` is provisioned with `role = 'admin'`, `account_status = 'active'`.
- Audit log entry `ADMIN_BOOTSTRAP` is recorded.
- System setting `bootstrap_completed` is marked `true`.

---

## 5. Administrator User & Access Management Panel

Accessible at `/admin/users` only to users holding the authoritative `admin` role.

### Features
1. **Directory Filtering:** Filter users by role (`All`, `Administrators`, `Exam Staff`, `Faculty`, `Students`) or search by name, email, and department.
2. **Account Creation:**
   - Full name, Email, Username, Role, Department.
   - For student accounts: Roll number, semester, section.
   - Auto-generates strong 16-character temporary passwords.
   - Sets `must_change_password = true` to force credential update on first login.
3. **Secure One-Time Password Reveal:**
   - Plaintext passwords are never stored in the database.
   - Temporary passwords are shown in a modal once upon generation/reset for secure administrator delivery.
4. **Password Reset & Session Revocation:**
   - Resets user password in Supabase Auth.
   - Revokes active user sessions via `sign_out`.
   - Flags account for mandatory password update on next login.
5. **Account Deactivation & Reactivation:**
   - Instantly revokes system access.
   - **Safeguard:** Prohibits deactivating or demoting the last active administrator.
6. **Granular Permissions:**
   - Administrators can assign additional fine-grained permissions to Exam Staff and Faculty.

---

## 6. RBAC Permission Matrix

| Permission Key | Description | Admin | Exam Staff | Faculty | Student |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `dashboard.view` | Access authorized operational dashboard | Yes | Yes | Yes | Yes |
| `users.view` | View user directory | Yes | — | — | — |
| `users.create` | Provision new user accounts | Yes | — | — | — |
| `users.update` | Update user metadata & roles | Yes | — | — | — |
| `users.deactivate` | Revoke user account access | Yes | — | — | — |
| `users.reset_password`| Perform administrator password resets | Yes | — | — | — |
| `roles.assign` | Grant custom permissions & roles | Yes | — | — | — |
| `programs.manage` | Create & modify programs/degrees | Yes | — | — | — |
| `batches.manage` | Manage student batches & sections | Yes | — | — | — |
| `students.view` | View university student rosters | Yes | Yes | Yes | — |
| `students.create` | Enroll new individual students | Yes | — | — | — |
| `students.import` | Batch import student spreadsheets | Yes | Yes | — | — |
| `faculty.manage` | Manage faculty departmental records | Yes | — | — | — |
| `timetable.view` | View academic timetable | Yes | Yes | Yes | — |
| `timetable.create` | Create & import timetable slots | Yes | — | Yes | — |
| `rooms.view` | View examination halls & capacities | Yes | Yes | — | — |
| `rooms.manage` | Configure hall grids & blocked seats | Yes | — | — | — |
| `examinations.view` | View examination calendar | Yes | Yes | Yes | — |
| `examinations.create`| Schedule new examinations | Yes | Yes | — | — |
| `examinations.update`| Update participating batches & halls | Yes | Yes | — | — |
| `seating.generate` | Run CP-SAT discrete seat solver | Yes | Yes | Yes | — |
| `seating.modify` | Adjust draft seat placements | Yes | Yes | Yes | — |
| `seating.validate` | Validate adjacency & conflict rules | Yes | Yes | Yes | — |
| `seating.publish` | Officially publish exam seating | Yes | Yes | — | — |
| `attendance.manage` | Mark examination/class attendance | Yes | Yes | Yes | — |
| `reports.view` | Generate reports & seat chart views | Yes | Yes | Yes | — |
| `reports.export` | Download CSV/PDF hall tickets | Yes | Yes | Yes | — |
| `settings.manage` | Configure university global parameters | Yes | — | — | — |
| `audit_logs.view` | Inspect system security logs | Yes | — | — | — |
| `student.seat_lookup.self` | Personal examination seat lookup | Yes | — | — | Yes |

---

## 7. Database Migrations & Schema Changes

The additive migration is defined in:
`database/migrations/006_auth_rbac_audit.sql`

Key changes:
1. **`public.profiles`:**
   - `email text`
   - `department text`
   - `account_status text not null default 'active'`
   - `must_change_password boolean not null default false`
2. **`public.role_permissions`:**
   - Institutional permission keys mapped per role.
3. **`public.user_permissions`:**
   - Granular user-specific permission overrides.
4. **`public.user_assignments`:**
   - Scoped batch and course assignments for faculty and floor marshals.
5. **`public.system_settings`:**
   - System configuration and one-time `bootstrap_completed` state.
6. **`public.audit_logs`:**
   - `actor_user_id`, `target_user_id`, `affected_resource`, and `metadata`.

---

## 8. Row Level Security (RLS) Policy Specifications

| Table | Operation | Allowed Roles / Predicates |
| :--- | :--- | :--- |
| `profiles` | `SELECT` | Self (`id = auth.uid()`), Admin (`is_admin()`), or Staff/Faculty (`my_role() in ('exam_staff', 'faculty')`). |
| `profiles` | `UPDATE` | Self only for non-privileged fields; cannot change `role` or `account_status`. Full update for `is_admin()`. |
| `students` | `SELECT` | Self (`auth_user_id = auth.uid()`), Admin (`is_admin()`), or Staff/Faculty (`my_role() in ('faculty', 'exam_staff')`). Students cannot browse arbitrary student directories. |
| `seating_plans` | `SELECT` | Published plans (`status = 'published'`), Admin (`is_admin()`), or Exam Staff (`my_role() = 'exam_staff'`). |
| `seat_assignments` | `SELECT` | Published plan assignments, Candidate self (`student_id in (select id from students where auth_user_id = auth.uid())`), Admin, or Staff. |
| `role_permissions` | `SELECT` | All authenticated users. Writes restricted to Admin. |
| `audit_logs` | `SELECT` | Administrators only (`is_admin()`). |

---

## 9. Verification & Test Suite Summary

The test suites verify all security invariants:
1. **Backend Automated Tests:** `py -3.14 -m pytest`
   - **109 tests passed cleanly in 11.11s**.
   - 30 tests in `tests/backend/test_auth_rbac.py` verifying all 4 roles, forbidden role escalation, tamper rejection, last admin safeguard, and rate limiting.
   - 6 migration tests in `tests/database/test_migrations.py` validating 001 through 006.
   - 37 algorithm & API tests.
2. **Frontend Build:** `npm run build`
   - Built with 0 errors in 5.18s using Vite and TypeScript strict mode.
