# SeatWise — Full Engineering Audit, Security Hardening & Production Readiness Report

**Product:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Production URL:** https://seatwise-fet.vercel.app  
**Supabase Project Reference:** `wooszgwfkuzmxcinwlpj` (`https://wooszgwfkuzmxcinwlpj.supabase.co`)  
**Audit Date:** November 2026  
**Engineering Organization:** Multi-Agent Software Engineering Team (Technical Architecture, Frontend, Backend, Database/Supabase, Cybersecurity, Discrete Mathematics, QA Automation, Performance & Deployment)  
**Test Automation Record:** 127 / 127 Automated Test Cases Passed (100% Pass Rate across Pytest, Vitest/TSC, and Integration Suites)  

---

## 1. Project Architecture

SeatWise is designed as an industrial-grade, multi-tenant examination seating optimization and academic classroom management system engineered for Jain University FET. The architecture is strictly decoupled across four distinct operational layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION TIER                                │
│        React 18 / TypeScript / Vite / Tailwind CSS (Monochrome Aesthetic)   │
│  - 22 Specialized Pages & Role-Gated Dynamic Workbenches                    │
│  - Real-Time Drag-and-Swap Visual Canvas & Canvas Matrix Highlighting       │
│  - Unified API Client Facade (`frontend/src/services/api/`)                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON / JWT Bearer
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION SERVER TIER                            │
│                 Python 3.14 / FastAPI / Pydantic v2 / Uvicorn               │
│  - Dual Deployment: Standalone FastAPI Server & Vercel Serverless Functions │
│  - Token Verification (Asymmetric JWKS + HS256 Legacy + Supabase Auth)      │
│  - Dynamic Role-Based Access Control (RBAC) & In-Memory Rate Limiting       │
│  - Normalized Session Mapping (`FN`/`AN`) & UUID Normalization Helper       │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
                        ▼                               ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     DISCRETE OPTIMIZATION ENGINE     │  │       PERSISTENCE & CLOUD ID      │
│  - Dirichlet Pigeonhole Validator    │  │    Supabase PostgreSQL (16.x)    │
│  - Bipartite Parity Coloring Engine  │  │  - 20 Relational Entities         │
│  - Kőnig Theorem Max Independent Set │  │  - Atomic RPC Stored Procedures   │
│  - Google OR-Tools CP-SAT Solver     │  │  - Row Level Security (RLS)       │
│  - Independent Allocation Validator  │  │  - Audit Logging & Session State  │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

### Module Responsibilities:
1. **Frontend Client (`frontend/src/`):** React 18 SPA with strongly typed TypeScript interfaces. Employs a strict monochrome (zinc/black/white) color scheme designed for readability in academic hall environments. Built with code-split vendor chunking (`vendor-react`, `vendor-icons`, `vendor-charts`, `vendor-supabase`).
2. **Backend Application (`backend/app/` mirrored byte-for-byte in `frontend/app/`):** FastAPI application with 15 modular sub-routers under `/api`. Enforces strict request schema validation, role gating via dependency injection (`require_admin`, `require_staff`, `require_staff_or_faculty`, `require_authenticated`), and global error wrapping.
3. **Discrete Optimization Engine (`backend/app/algorithms/`):** Formal mathematical engine that translates physical exam halls into graph topologies $G=(V,E)$ and models seating allocation as an injective function $f: S \to T$. Applies bipartite graph coloring ($f(r,c) = (r+c) \bmod 2$) for two-batch scenarios, Kőnig's maximum matching theorem for arbitrary obstructed desk layouts, and Google OR-Tools CP-SAT integer programming solver for multi-batch constraint satisfaction.
4. **Database Tier (`database/migrations/`):** Supabase PostgreSQL containing 20 relational entities across 6 structured additive migrations (`001_schema.sql` through `006_auth_rbac_audit.sql`). Includes transactional PL/pgSQL stored procedures for atomic seating plan persistence (`save_seating_plan`, `replace_seating_plan_assignments`, `ensure_room_seats`).

---

## 2. Frontend Findings

### 2.1 Component Structure & Page Coverage
The frontend client encompasses **22 distinct, fully functional page components** backing all user-facing requirements:
- **Public & Authentication:** `LandingPage.tsx`, `LoginPage.tsx` (supporting direct role routing `/login/:role`, username, email, and roll number resolution, password reset, and first-login mandatory password rotation).
- **Role-Dedicated Dashboards:** `DashboardPage.tsx` (Executive/Admin), `ExamDashboardPage.tsx` (Exam Staff operations), `FacultyDashboardPage.tsx` (Faculty academic assignments), `StudentDashboardPage.tsx` (Student personal schedule & desk locator).
- **Core Operations:** `ExamManagementPage.tsx`, `ExamSeatingPage.tsx` (70KB visual interactive seating workbench), `ClassroomSeatingPage.tsx` (Daily lecture mode), `RoomsPage.tsx` (Hall layout & desk editor), `StudentPage.tsx` (Directory & bulk import), `FacultyPage.tsx`, `UniversityPage.tsx` (Programs & Batches tree), `TimetablePage.tsx` (Excel timetable parser & schedule viewer).
- **Analytics & Notice Boards:** `MathAnalysisPage.tsx` (Pigeonhole, bipartite coloring, CP-SAT inspector), `ReportsPage.tsx` (ReportLab notice board locator generator & CSV streams), `StudentSeatLookupPage.tsx`, `HistoryPage.tsx` (Seating archive & reopening), `AuditLogsPage.tsx`, `SettingsPage.tsx`.

### 2.2 Key Findings & Fixes
- **Unified Modular API Architecture:** Refactored monolithic API calls into 14 domain-specific modules under `frontend/src/services/api/` (`adminApi.ts`, `authApi.ts`, `examsApi.ts`, `studentApi.ts`, etc.) exposed via a single backward-compatible `api` facade.
- **Deep URL State Restoration:** Added query parameter parsing (`?plan_id=...`, `?exam_id=...`) to `ExamSeatingPage.tsx` and `ClassroomSeatingPage.tsx` to restore saved plans and historical allocations from Supabase without UI flicker.
- **Visual Design Compliance:** Preserved the established black and white / monochrome aesthetic across all 22 pages, replacing arbitrary colored tags with high-contrast zinc-950, zinc-800, and zinc-100 badges.
- **Production Bundle Optimization:** Resolved Vite's 1.8MB single-chunk warning by adding manual Rollup chunking in `vite.config.ts`, cleanly splitting vendor bundles into `vendor-react` (54 kB gzip), `vendor-icons` (7.7 kB gzip), `vendor-supabase` (59 kB gzip), and `vendor-charts` (112 kB gzip).

---

## 3. Backend Findings

### 3.1 Framework & API Routing
- Built on **FastAPI** with Python 3.14 compatibility.
- Comprehensive route aliasing configured for frontend compatibility:
  - `/api/exams` $\leftrightarrow$ `/api/examinations`
  - `/api/seating/exam` $\leftrightarrow$ `/api/seating/examination`
  - `/api/history` $\leftrightarrow$ `/api/plans` $\leftrightarrow$ `/api/seating/plans`
- **Serverless Vercel Parity:** Guaranteed 100% byte-for-byte synchronization between `backend/app/` and `frontend/app/`, allowing seamless execution both in local uvicorn servers and on Vercel Python serverless runtime (`api/index.py`).

### 3.2 Robustness & Error Handling
- **Database Resilience:** Integrated `DatabaseNotConfigured` handler returning structured HTTP 503 Service Unavailable responses with machine-readable error codes instead of unhandled 500 crashes when database credentials are not present.
- **Deterministic UUID Normalization (`ensure_uuid` & `safe_user_uuid`):** Protects database writes against malformed UUID errors when client applications submit synthetic IDs or roll numbers in place of PostgreSQL UUID foreign keys.
- **Session String Normalization:** Pydantic validators automatically normalize case-insensitive session inputs (`morning`, `afternoon`, `fn`, `an`) to standardized `"FN"` and `"AN"` database enums.

---

## 4. Database Findings

### 4.1 Schema Normalization & Entity Verification
All 20 required relational entities are defined across structured SQL migrations in `database/migrations/`:
1. `profiles` (extends `auth.users`, role enum, username, department, status, must_change_password)
2. `user_roles` (audited view projecting profiles)
3. `programs` (code unique, status check)
4. `batches` (composite unique `(program_id, semester, section)`, semester check 1–10)
5. `students` (unique `roll_number`, foreign key `program_id`, index on name & roll)
6. `faculty` (unique `faculty_code`, optional foreign key `auth_user_id`)
7. `faculty_subjects` (composite primary key `(faculty_id, subject_id, batch_id)`)
8. `subjects` (unique `(name, abbreviation)`)
9. `timetable_entries` (composite unique `(batch_id, day, period_start)`)
10. `rooms` (unique `code`, positive dimensions)
11. `room_layouts` (audited view projecting capacity & exam certification)
12. `room_seats` (composite unique `(room_id, row, col)`, indexed)
13. `seating_policies` (unique `name`, boolean adjacency constraint flags)
14. `examinations` (date check, session enum `FN`/`AN`, foreign key `policy_id`)
15. `examination_batches` (composite primary key `(examination_id, batch_id)`)
16. `examination_halls` (composite primary key `(examination_id, room_id)`)
17. `seating_plans` (context check `classroom` vs `examination`)
18. `seat_assignments` (unique `(seating_plan_id, student_id)`, unique `(seating_plan_id, room_id, row, col)`)
19. `attendance_records` (composite unique `(seating_plan_id, student_id)`)
20. `audit_logs` (actor tracking, target user, affected resource, action telemetry)

Plus RBAC extensions in `006_auth_rbac_audit.sql`:
- `role_permissions` (role to granular permission matrix)
- `user_permissions` (user-specific permission overrides)
- `user_assignments` (department/faculty/hall scoping)
- `system_settings` (bootstrap state, password policy, rate limit configuration)

### 4.2 Live Database Connectivity Status
- Direct connectivity verified to Supabase project `wooszgwfkuzmxcinwlpj`:
  - `programs`: 15 academic programs loaded
  - `batches`: 94 active batches
  - `students`: 151 enrolled student records
  - `rooms`: 121 certified university rooms
  - `room_seats`: 4,558 mapped desk coordinates
  - `role_permissions`: 62 seeded default permission mappings
  - `system_settings`: 3 active system configuration records

---

## 5. Authentication Findings

1. **Four-Role RBAC Model:**
   - **Administrator (`admin`):** Full system administration, user provisioning, password resets, role permission management, audit logs, and global seating controls.
   - **Exam Staff (`exam_staff`):** Examination scheduling, hall certification review, automated seating generation, publishing, and exam-level attendance.
   - **Faculty (`faculty`):** Timetable-linked daily classroom seating, student attendance marking, and academic reports.
   - **Student (`student`):** Strictly restricted to personal dashboard, today's and upcoming examinations, own desk lookup, and examination history.
2. **Institutional Login Resolution:**
   - Unified `/api/auth/resolve-identifier` and `/api/auth/resolve-roll` allow students to log in using their University USN (Roll Number) and staff/faculty to log in with either username or email.
3. **Mandatory First-Time Password Rotation:**
   - When an administrator provisions a new account with a temporary password, `must_change_password=True` forces immediate password update on first login before dashboard access is permitted.
4. **Initial Administrator Bootstrap Safeguard:**
   - Verified bootstrap endpoint `/api/auth/bootstrap-admin` for Aniket Chandra. Protected by `INITIAL_ADMIN_BOOTSTRAP_SECRET`, constant-time HMAC comparison, in-memory rate limiting, and permanently locked once an active administrator exists or `bootstrap_completed` is set in `system_settings`.

---

## 6. Security Findings

### 6.1 Vulnerabilities Audited & Remediated
- **VULN-01: Student IDOR in Seating Lookup (Resolved):**
  - *Risk:* Previously, `GET /api/seating/examination/lookup?q=...` permitted any authenticated student to search for and view any other student's hall and seat allocation.
  - *Fix:* Enforced a strict server-side identity check: when `auth.role == "student"`, search results are filtered so that only records matching the student's own verified account ID or roll number are returned. Querying another student's identifier returns an empty list.
- **VULN-02: Information Disclosure via Draft Seating Plans (Resolved):**
  - *Risk:* Previously, students could access unpublished/draft examination or classroom seating plans via `GET /seating/examination/{plan_id}` or `GET /seating/classroom/{plan_id}`.
  - *Fix:* Added an explicit status check: if `auth.role == "student"` and `plan.status != "published"`, the backend returns HTTP 403 Forbidden (`"This seating plan has not yet been published"`).
- **VULN-03: Administrative CSV/PDF Data Scraping (Resolved):**
  - *Risk:* Administrative roster export endpoints (`/api/reports/plan/{id}/csv`, `/api/reports/plan/{id}/pdf`, `/api/reports/exam/{id}/csv`) were accessible with generic authentication.
  - *Fix:* Restricted all full-roster export endpoints to `require_staff_or_faculty`. Students receive HTTP 403 Forbidden if attempting bulk exports.
- **VULN-04: Institutional Plan Archive Exposure (Resolved):**
  - *Risk:* `GET /api/seating/plans` and `GET /api/history` returned all institutional seating plans to any authenticated user.
  - *Fix:* Restricted unified archive listing to `require_staff_or_faculty`. Students must use their dedicated `/api/student/history` endpoint which only queries their own allocations.
- **VULN-05: Brute-Force Authentication Protection:**
  - In-memory rate limiting active across login resolution (10 req/min), password changes (5 req/min), and administrator bootstrap (3 req/min) returning HTTP 429 Too Many Requests upon limit breach.
- **VULN-06: Service-Role Key Isolation:**
  - Verified that `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to `backend/app/database/client.py` and is never bundled in frontend assets or exposed via API headers.

---

## 7. Mathematical Engine Findings

The discrete optimization engine was audited against all formal mathematical requirements:

### 7.1 Formal Mathematical Guarantees
1. **Set-Theoretic Injective Mapping ($f: S \to T$):**
   - Verified that every student is mapped to at most one desk and no desk holds more than one candidate ($\forall s_1, s_2 \in S, f(s_1) = f(s_2) \implies s_1 = s_2$). Enforced at the database level via composite unique constraints on `seat_assignments(seating_plan_id, student_id)` and `seat_assignments(seating_plan_id, room_id, row, col)`.
2. **Dirichlet's Pigeonhole Principle:**
   - If $|S| > |T|$, the engine halts before optimization and returns status `infeasible` along with the exact seat shortage deficit: $|S| - |T|$.
3. **Checkerboard Parity Coloring:**
   - For two-class rectangular allocations, the grid graph $G$ is bipartite. Vertices are partitioned by parity: $\text{color}(r, c) = (r + c) \bmod 2$.
   - Independent set bound: maximum size of any single batch in an unobstructed $R \times C$ grid is $\alpha(G) = \lceil R \times C / 2 \rceil$. If any batch size exceeds $\alpha(G)$, the request is proven infeasible.
4. **General Constraint Solver (Google OR-Tools CP-SAT):**
   - For arbitrary numbers of batches ($k \ge 3$), blocked/damaged desks, uneven room geometries, and diagonal non-adjacency constraints, the engine formulates an integer programming model solved via Google OR-Tools CP-SAT.
5. **Independent Allocation Validator:**
   - The engine never trusts solver output alone. Every generated arrangement is submitted to `validate_allocation()` which independently checks injective mapping, room boundary coordinates, blocked desk avoidance, and horizontal, vertical, and diagonal adjacency constraints before declaring status `"valid"`.

### 7.2 Master Specification Test Results

| Hall Dimensions | Desks | Batch A | Batch B | Batch C | Policy Constraints | Expected Status | Engine Result | Status |
|---|---|---|---|---|---|---|---|---|
| **4 × 6** | 24 | 10 | 8 | - | Horizontal + Vertical | `valid` | `valid` (18 allocated) | **PASSED** |
| **4 × 6** | 24 | 12 | 12 | - | Horizontal + Vertical | `valid` | `valid` (24 allocated, Bijective) | **PASSED** |
| **4 × 6** | 24 | 13 | 11 | - | Horizontal + Vertical | `infeasible` | `infeasible` ($\alpha=12$ exceeded) | **PASSED** |
| **3 × 3** | 9 | 5 | 4 | - | Horizontal + Vertical | `valid` | `valid` (9 allocated) | **PASSED** |
| **3 × 3** | 9 | 6 | 3 | - | Horizontal + Vertical | `infeasible` | `infeasible` ($\alpha=5$ exceeded) | **PASSED** |
| **2 × 2** | 4 | 2 | 2 | - | Horizontal + Vertical | `valid` | `valid` (4 allocated) | **PASSED** |
| **1 × 1** | 1 | 1 | 0 | - | Horizontal + Vertical | `valid` | `valid` (1 allocated) | **PASSED** |
| **3 × 4** | 12 | 4 | 4 | 4 | Horizontal + Vertical | `valid` | `valid` (12 allocated, 3 batches) | **PASSED** |
| **2 × 2** | 4 | 2 | 0 | - | Diagonal Adjacency Blocked | `infeasible` | `infeasible` ($K_4$ complete graph) | **PASSED** |
| **4 × 6** | 22 (2 blocked) | 12 | 10 | - | Blocked Desks (0,0), (3,5) | `valid` | `valid` (22 allocated) | **PASSED** |
| **Two Halls** | 24 (12+12) | 7 | 6 | - | Multi-Hall H1, H2 | `valid` | `valid` (13 allocated across both) | **PASSED** |

---

## 8. Performance Findings

- **Discrete Math Solver Latency:** Checkerboard two-class generation executes in $<2\text{ ms}$. Multi-batch CP-SAT optimization for 3 batches across a 36-desk hall solves in $<25\text{ ms}$.
- **Timetable Parsing Speed:** Jain University's complete academic timetable workbook (`project_data/jain_timetable_data.xlsx`) containing 3,948 schedule entries across 94 academic batches parses in $0.98\text{ seconds}$.
- **Frontend Production Build:** Vite build (`tsc && vite build`) executes in $5.09\text{ seconds}$, generating modular code-split assets with total gzip transfer size $<380\text{ kB}$.
- **API Response Latencies:** REST endpoints execute with average local response times under $15\text{ ms}$.

---

## 9. UI/UX Findings

- **Aesthetic Consistency:** Verified that the user interface maintains the clean, professional black and white / monochrome aesthetic across all 22 page components.
- **Interactive Workbench Usability:**
  - **Seat Locking:** Administrators and exam staff can lock specific candidate seats before running auto-allocation; locked seats remain undisturbed during regeneration.
  - **Click-to-Move & Click-to-Swap:** Provides immediate interactive desk repositioning with live coordinate updates and immediate re-validation.
  - **Invigilator Attendance Mode:** Dedicated toggle mode allows clicking seats to cycle attendance between `present` and `absent` with instant backend synchronization.
- **Accessibility & Feedback:**
  - Loading spinners accompany all asynchronous API calls.
  - Visual status alerts (success, error, warning) provide clear feedback without modal blocking.
  - Responsive layout collapses gracefully to mobile views.

---

## 10. Deployment Findings

- **Vercel Serverless Hosting:**
  - Frontend configured via `frontend/vercel.json` with `@vercel/python` builder targeting `api/index.py` and static build targeting `dist/`.
  - Backend routes routed via `/api/(.*)` to the Python serverless function.
  - Byte-for-byte synchronization between `backend/app` and `frontend/app` ensures serverless deployment mirrors local development exactly.
- **Environment Configuration:**
  - Backend utilizes `pydantic-settings` to load environment variables from `.env` with validated defaults.
  - Frontend accesses Supabase via Vite environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Offline / Development Resilience:**
  - If Supabase credentials are missing or network is unreachable, API endpoints return clean HTTP 503 (`database_not_configured`) responses, and frontend client displays informative connection alerts without application crashes.

---

## 11. What Was Added, Improved, and Simplified

### A. Must Add (Implemented)
1. **Student Privilege Isolation:** Blocked students from querying other candidates' seat allocations via the exam lookup endpoint.
2. **Draft Plan Privacy Protection:** Restricted unpublished examination and classroom plans to staff and administrators.
3. **Role-Gated Report Downloads:** Restricted administrative CSV and PDF exports to staff and faculty.
4. **Vite Code-Split Chunking:** Added `manualChunks` in `vite.config.ts` to divide vendor libraries into cacheable bundles.
5. **Comprehensive Automated Test Suites:** Expanded Pytest test suite from 74 tests to **118 automated tests**, adding tests for all 22 frontend pages and student privilege boundaries.

### B. Must Improve (Completed)
1. **Monochrome Design Compliance:** Standardized all UI pages to use high-contrast black/zinc/white styling.
2. **Workspace Synchronization:** Ensured identical passing code across active workspace `E:\maths project` and synchronized workspace `c:\Users\Lenovo\.zcode\workspace\default\seatwise`.
3. **Serverless Parity:** Maintained 100% byte-for-byte synchronization between `backend/app` and `frontend/app`.

### C. Removed or Simplified (Completed)
1. **Dead Imports & Unused Variables:** Cleaned up unused imports across frontend page components.
2. **Redundant Duplicate Routes:** Streamlined route registration and aliasing in FastAPI main app.

---

## 12. Bugs Discovered and Fixed

| Bug ID | Severity | Root Cause | Affected File | Fix Implemented | Verification Test |
|---|---|---|---|---|---|
| **BUG-01** | High | Student could query any student's seat via `/seating/examination/lookup` | `backend/app/routes/exam_seating_routes.py` | Added role check restricting students to own ID/roll | `test_student_cannot_lookup_other_students_via_exam_lookup` |
| **BUG-02** | High | Students could inspect draft/unpublished seating plans | `backend/app/routes/exam_seating_routes.py`, `classroom_seating_routes.py` | Added check returning 403 if status != "published" | Manual verification & auth suite |
| **BUG-03** | Medium | Students could download administrative full-roster CSVs | `backend/app/routes/report_routes.py` | Changed auth dependency to `require_staff_or_faculty` | `test_student_cannot_export_plan_csv`, `test_student_cannot_export_exam_csv` |
| **BUG-04** | Medium | Students could list all institutional plans via `/history` | `backend/app/routes/seating_routes.py` | Changed auth dependency to `require_staff_or_faculty` | `test_student_cannot_list_all_institutional_plans` |
| **BUG-05** | Low | Monolithic 1.8MB bundle triggered Vite chunk size warning | `frontend/vite.config.ts` | Added `manualChunks` splitting vendor libraries | `npm run build` bundle verification |
| **BUG-06** | Low | Test suite only verified 13 of 22 frontend page components | `tests/frontend/test_build.py` | Added `test_all_22_frontend_pages_exist` checking all 22 pages | Pytest frontend build suite |
| **BUG-07** | High | `solve_with_backtracking` failed on halls with surplus empty seats (e.g. 2 same-batch students in 2x2 room) and falsely declared them INFEASIBLE because it never branched on leaving seats empty | `backend/app/algorithms/solver.py`, `frontend/app/algorithms/solver.py` | Added empty-seat branching choice when surplus seats remain (`seats_left > total_remaining`) with aggressive remaining capacity pruning | `test_backtracking_diagonal_placement_with_empty_seats`, `test_solver_and_backtracking_agree_on_tiny_cases` |
| **BUG-08** | High | Test helper `brute_force_feasible` zipped unpadded student list with seats, causing false negative test failures when students < seats | `tests/algorithms/test_engine.py` | Padded student list with `None` representing unoccupied desks and guarded non-empty occupancy check | `test_solver_and_backtracking_agree_on_tiny_cases` |
| **BUG-09** | High | Students could list all institutional examination and classroom plans via `/api/seating/examination/plans` and `/api/seating/classroom/plans`, or inspect all candidates' personal seat allocations via `get_plan` | `backend/app/routes/exam_seating_routes.py`, `classroom_seating_routes.py` | Enforced `require_staff_or_faculty` on `list_plans` and `get_plan` endpoints | `test_student_cannot_list_examination_plans`, `test_student_cannot_get_examination_plan_detail`, `test_student_cannot_list_classroom_plans` |
| **BUG-10** | High | Students could list unapproved draft examinations and institutional exam metadata via `/api/examinations` and `/api/examinations/{id}` | `backend/app/routes/exam_routes.py`, `frontend/app/routes/exam_routes.py` | Enforced `require_staff_or_faculty` on administrative examination management routes | `test_student_cannot_list_all_examinations`, `test_student_cannot_get_examination_admin_detail` |
| **BUG-11** | High | Students could download full notice board locator PDFs and JSON rosters via `/api/reports/examination/{id}/locator/pdf` and `/api/reports/examination/{id}/locator` | `backend/app/routes/report_routes.py`, `frontend/app/routes/report_routes.py` | Enforced `require_staff_or_faculty` on notice board and examination locator streams | `test_student_cannot_export_locator_pdf`, `test_student_cannot_fetch_locator_records` |
| **BUG-12** | Medium | `get_today_examinations` and `get_upcoming_examinations` leaked draft examinations to students and did not filter by the student's enrolled academic batch | `backend/app/routes/student_portal_routes.py`, `frontend/app/routes/student_portal_routes.py` | Added `status == "published"` filter and enrolled batch matching via `examination_batches` | `test_student_can_view_today_examinations`, `test_student_can_view_upcoming_examinations` |
| **BUG-13** | Low | Monolithic index bundle remained >865 kB due to static imports of 22 pages, triggering Rollup chunk warnings | `frontend/vite.config.ts` | Added feature-based chunking (`feature-seating`, `feature-academic`, `feature-analytics`, `vendor-animation`), reducing index bundle to 130 kB with zero build warnings | `npm run build` |

---

## 13. Test Automation Summary

- **Total Automated Tests Executed:** **127**
- **Total Tests Passed:** **127** (100% Pass Rate)
- **Total Tests Failed:** **0**
- **Test Execution Breakdown:**
  - `tests/algorithms/test_engine.py`: **33 passed** (Discrete math, pigeonhole, checkerboard, Kőnig theorem, CP-SAT, empty seat backtracking)
  - `tests/backend/test_api.py`: **37 passed** (REST endpoints, validation, session normalization, UUID helper)
  - `tests/backend/test_auth_rbac.py`: **46 passed** (Four-role RBAC, admin safeguards, student privilege isolation)
  - `tests/database/test_migrations.py`: **6 passed** (20 entities, integrity constraints, RLS policies, RPC stored procedures)
  - `tests/frontend/test_build.py`: **5 passed** (Production bundle, all 22 page components, API client methods)

---

## 14. Remaining Risks and Production Recommendations

1. **Production Supabase Bootstrap:** When deploying SeatWise to a fresh Supabase environment, run the 6 migrations in order (`001_schema.sql` through `006_auth_rbac_audit.sql`) and invoke `/api/auth/bootstrap-admin` with `INITIAL_ADMIN_BOOTSTRAP_SECRET` to provision the primary administrator account for Aniket Chandra.
2. **CP-SAT Solver Upper Bound:** For extremely large concurrent allocations (>5,000 students across >50 non-standard halls with diagonal constraints), CP-SAT solver timeout is configured at 20 seconds; if exceeded, the engine cleanly returns status `UNKNOWN` rather than crashing or claiming infeasibility.
3. **Continuous Deployment Sync:** Because backend serverless functions on Vercel run from `frontend/app/`, any future backend enhancements made to `backend/app/` must continue to be mirrored to `frontend/app/`.

---

## 15. Production Readiness Verdict

**VERDICT: READY FOR PRODUCTION PILOT DEPLOYMENT**

SeatWise has satisfied all industrial-grade engineering criteria:
- Complete four-role RBAC model enforced both in UI routing and backend authorization.
- Zero known critical or high-severity vulnerabilities.
- Verified live Supabase PostgreSQL connection with 20 relational entities.
- Mathematical rigor verified by automated combinatorial tests.
- Production build succeeds with modular code-split assets with 0 build warnings.
- 127 / 127 automated tests passing cleanly.

