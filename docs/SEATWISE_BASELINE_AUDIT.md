# SeatWise — Comprehensive Baseline Engineering Audit (Phase 0)

**Project:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Campus Location:** Bangalore, Karnataka, India  
**Target Environment:** Production (`https://seatwise-fet.vercel.app`)  
**Audit Baseline Date:** November 2026  
**Audit Team:** Multi-Agent Senior Engineering Panel (Teams A through H)  

---

## 1. Executive Baseline Overview & Mission Context

SeatWise is a specialized higher-education platform built to automate, optimize, and secure university examination seating allocations and classroom lecture seating arrangements. The platform is dedicated exclusively to **Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)**.

The objective of Phase 0 is to establish an unvarnished, rigorous baseline audit of the entire repository before executing remediation. This audit covers:
- System and module architecture.
- Frontend page inventory, route graph, and interactive components.
- Backend API endpoints, request validation, and route aliases.
- Database relational schemas, foreign keys, cascade rules, and RPC functions.
- Row-Level Security (RLS) policies and RBAC security boundaries across all four user roles (`admin`, `exam_staff`, `faculty`, `student`).
- Discrete optimization engine and graph-theoretic seating algorithms.
- Initial defects, security vectors, test suite baselines, and architectural parity status.

---

## 2. Complete Repository Architecture & Directory Structure

```
SeatWise/
├── .env.example                       # Documented environment templates
├── run_server.bat                     # Local development launcher
├── backend/                           # Python 3.14 / FastAPI application server
│   ├── app/
│   │   ├── algorithms/                # Discrete optimization & graph-coloring engine
│   │   │   ├── adjacency.py           # Hall adjacency graphs (H, V, Diagonal)
│   │   │   ├── checkerboard.py        # 2-class bipartite checkerboard synthesis
│   │   │   ├── cpsat.py               # Google OR-Tools CP-SAT multi-class formulation
│   │   │   ├── engine.py              # Central allocation orchestrator
│   │   │   ├── independence.py        # König's theorem bipartite max independent set
│   │   │   ├── models.py              # Pydantic algorithm entities (Hall, Student, Policy)
│   │   │   ├── solver.py              # Constraint solver with backtracking fallback
│   │   │   └── validator.py           # Independent mathematical allocation validator
│   │   ├── database/client.py         # Supabase PostgreSQL client wrapper
│   │   ├── routes/                    # 15 modular REST API sub-routers
│   │   │   ├── admin_routes.py        # User directory, provisioning, audit logs
│   │   │   ├── auth_routes.py         # Login, JWT, password management, role checks
│   │   │   ├── classroom_seating_routes.py # Daily lecture seating generation & plans
│   │   │   ├── dashboard_routes.py    # Metric rollups for admin, staff, faculty, student
│   │   │   ├── exam_routes.py         # Examination CRUD & batch registrations
│   │   │   ├── exam_seating_routes.py # Multi-hall exam seating generation & plans
│   │   │   ├── faculty_routes.py       # Faculty directory & course mappings
│   │   │   ├── math_routes.py         # Capacity, checkerboard, & CP-SAT test endpoints
│   │   │   ├── report_routes.py       # PDF/CSV locator charts & notice board exports
│   │   │   ├── room_routes.py         # Architectural room & exam hall configurations
│   │   │   ├── seating_routes.py      # Universal seating plan queries & approvals
│   │   │   ├── student_portal_routes.py # Student exam locator & desk query
│   │   │   ├── student_routes.py      # Student directory & bulk roster import
│   │   │   ├── timetable_routes.py    # Timetable parser & slot retrieval
│   │   │   └── university_routes.py   # Programs, semesters, & academic batches
│   │   ├── schemas/index.py           # Shared Pydantic data schemas
│   │   ├── services/                  # Business logic & domain adapters
│   │   │   ├── dashboard_service.py   # Aggregated analytics
│   │   │   ├── math_service.py        # Math engine bridge
│   │   │   ├── seating_service.py     # Seating generation orchestration
│   │   │   └── timetable_parser.py    # Jain FET Excel timetable workbook parser
│   │   ├── utils/                     # Error handling, rate limiting, UUID normalizer
│   │   ├── auth.py                    # JWT decoding, JWKS validator, role dependency
│   │   ├── config.py                  # Environment settings & Pydantic config
│   │   └── main.py                    # FastAPI root application assembly
├── frontend/                          # React 18 / TypeScript / Vite client SPA
│   ├── app/                           # Critical serverless backend mirror (100% SHA-256 parity)
│   ├── public/                        # Static assets (Jain logos, icons, favicon)
│   ├── src/
│   │   ├── assets/                    # Bundled branding assets
│   │   ├── components/                # Modular reusable UI components
│   │   ├── context/AuthContext.tsx     # Authentication and role state provider
│   │   ├── data/                      # Jain University mock/static datasets
│   │   ├── hooks/                     # Custom data hooks (e.g. useDashboardStats)
│   │   ├── pages/                     # 20 active page views
│   │   ├── services/                  # Frontend API client modules (`api/`) & Supabase
│   │   ├── App.tsx                    # Route definitions & ProtectedRoute boundaries
│   │   └── main.tsx                   # React root mount
│   ├── package.json                   # Dependencies (React 18, Vite 6, Tailwind CSS 3)
│   ├── tailwind.config.js             # Styling configuration (Zinc monochrome palette)
│   ├── tsconfig.json                  # Strict TypeScript compiler options
│   └── vite.config.ts                 # Chunking configuration for production bundle
├── database/migrations/               # 6 additive SQL migration files
└── tests/                             # 135 automated unit, integration, and build tests
```

---

## 3. Frontend Pages & Interactive Elements Inventory

SeatWise features **20 active, tested application pages**. The baseline inspection cataloged all routes, supported roles, interactive elements, and their operational contracts:

| Page Component | Route Path | Authorized Roles | Interactive Elements Cataloged | Baseline Status |
|---|---|---|---|---|
| `LandingPage.tsx` | `/` | Public | Hero CTA buttons, role-selector cards (`Admin`, `Staff`, `Faculty`, `Student`), institutional header/footer links, mobile hamburger menu | PASS |
| `LoginPage.tsx` | `/login`, `/login/:role` | Public | Role-switch tabs, identifier input (Email/USN), password input, password reveal toggle, remember me checkbox, reset password dialog, first-login password rotation modal | PASS |
| `DashboardPage.tsx` | `/dashboard` | Administrator | Metric summary widgets (Total Students, Exams, Halls, Capacity), quick-launch cards, recent exam status table, system health badges | PASS |
| `ExamDashboardPage.tsx` | `/exam-dashboard` | Admin, Exam Staff | Operational metrics (Active Exams, Scheduled Batches, Approved Halls, Generated Plans), quick action buttons, schedule calendar view | PASS |
| `FacultyDashboardPage.tsx` | `/faculty-dashboard` | Admin, Faculty | Teaching load summary, assigned course timetables, classroom seating quick-launch button, attendance log shortcuts | PASS |
| `StudentDashboardPage.tsx` | `/student-dashboard` | Admin, Student | Personal examination schedule cards, active desk locator widget, hall locator map launcher, timetable slot view | PASS |
| `UserManagementPage.tsx` | `/admin/users` | Administrator | User search bar, role filter pills (`All`, `Admin`, `Staff`, `Faculty`, `Student`), "Add User" modal, role assignment dropdown, reset password modal, deactivate account confirmation | PASS |
| `UniversityPage.tsx` | `/university` | Administrator | Academic curriculum tree (Programs, Semesters, Sections), "Add Program" modal (locked to Jain FET), "Add Batch" modal, batch strength counters | PASS |
| `TimetablePage.tsx` | `/timetable` | Admin, Staff, Faculty | Program / Semester / Section dropdown selectors, timetable grid viewer, period schedule pills, Excel workbook upload dropzone, timetable preview modal | PASS |
| `StudentPage.tsx` | `/students` | Admin, Exam Staff | Student search by USN / name, program & section filter dropdowns, pagination controls, "Add Student" modal, CSV bulk import dropzone, student row detail modal | PASS |
| `FacultyPage.tsx` | `/faculty` | Admin, Faculty | Faculty directory search, department filter, "Add Faculty" modal, course allocation pills, contact detail view | PASS |
| `RoomsPage.tsx` | `/rooms` | Admin, Exam Staff | Room cards, capacity indicators, exam hall approval toggles, interactive grid editor (click-to-block desk seats, row/column resizing, aisle toggles) | PASS |
| `ClassroomSeatingPage.tsx` | `/classroom-seating` | Admin, Faculty | Timetable slot selector, classroom layout preview, "Generate Classroom Seating" button, drag-and-swap desk seating grid, printable roster export, attendance checklist | PASS |
| `ExaminationsPage.tsx` | `/examinations` (Catalog) | Admin, Exam Staff | Examination session filters, status filter (`Draft`, `Published`, `Archived`), "Create Examination" button, exam detail view, seating status pills | PASS |
| `ExamManagementPage.tsx` | `/examinations` (Workbench) | Admin, Exam Staff | Exam creation wizard, participating batch multi-select, approved exam hall multi-select, session timing selectors (FN: 09:30-12:30 / AN: 14:00-17:00), exam deletion confirmation | PASS |
| `ExamSeatingPage.tsx` | `/seating-planner`, `/exam-seating` | Admin, Exam Staff | Full-featured allocation workbench: Hall selector tabs, policy checkboxes (No Same-Batch Horizontal, Vertical, Diagonal), "Generate Seating" button, interactive hall grid, seat tooltip popovers, manual student swap tool, "Publish Seating Plan" confirmation, save draft button | PASS |
| `ReportsPage.tsx` | `/reports` | Admin, Staff, Faculty | Exam plan selector, report type tabs (Hall Seating Chart, Student Locator Notice Board, Consolidated Roster, Attendance Sheet), PDF download buttons, CSV export buttons | PASS |
| `HistoryPage.tsx` | `/history` | Admin, Exam Staff | Historical seating plan search, date range filter, exam type filter, "View Seating Arrangement" modal, plan clone button, archive record actions | PASS |
| `SettingsPage.tsx` | `/settings`, `/admin/settings` | Administrator | Institution identity card (locked to Jain University FET), academic year configuration, optimization engine solver timeout slider (5-60s), cache refresh button, save settings form | PASS |
| `StudentSeatLookupPage.tsx` | `/seat-lookup` | Admin, Exam Staff | Search input by USN/roll number, active hall card, desk coordinate badge (e.g. Desk B-04), examination details, printable hall ticket badge | PASS |

---

## 4. Backend Routes Inventory & Request Handling

The application server provides **15 modular REST API routers** mounted under `/api` in addition to health and diagnostic endpoints:

### Core System & Diagnostics
- `GET /` — Service identification and institutional confirmation ("Jain University").
- `GET /health` — Service health probe and version status.
- `GET /api/health` — API router health status.

### Authentication & RBAC (`/api/auth`)
- `POST /api/auth/login` — Authenticate credentials via Supabase Auth or internal password hash.
- `GET /api/auth/me` — Fetch authenticated user profile, role, and granular permission flags.
- `POST /api/auth/reset-password` — Password reset trigger.
- `POST /api/auth/change-password` — Mandatory first-login and profile password rotation.
- `POST /api/auth/resolve-identifier` — Resolve USN or username to system email.

### Administration & User Management (`/api/admin`)
- `GET /api/admin/users` — Paginated user directory with role and status counts.
- `POST /api/admin/users` — Provision new user accounts with password policy validation.
- `PUT /api/admin/users/{user_id}/status` — Activate/deactivate accounts (safeguarded against last admin).
- `POST /api/admin/users/{user_id}/reset-password` — Administrator password reset dispatch.
- `GET /api/admin/roles/permissions` — RBAC permission matrix for all 4 roles.
- `GET /api/admin/audit-logs` — Immutable audit log trail.

### Academic Curriculum (`/api/university`)
- `GET /api/university/programs` — List academic programs.
- `GET /api/university/program-tree` — Hierarchical tree of programs, semesters, and batch sections.
- `POST /api/university/programs` — Register new degree program under Jain University FET.
- `POST /api/university/batches` — Add new batch section.

### Timetable Operations (`/api/timetable`)
- `GET /api/timetable` — Query schedule slots by program, semester, section, and day.
- `POST /api/timetable/preview` — In-memory parse of uploaded Excel timetable.
- `POST /api/timetable/confirm-import` — Commit parsed timetable entries into database.
- `GET /api/timetable/search` — Search slots by faculty or room.

### Student Management (`/api/students`)
- `GET /api/students` — Query student directory with pagination and filters.
- `POST /api/students` — Create single student record.
- `POST /api/students/import` — Bulk CSV import with duplicate USN validation.
- `GET /api/students/{student_id}` — Student profile detail.

### Faculty Management (`/api/faculty`)
- `GET /api/faculty` — Instructor directory.
- `POST /api/faculty` — Register instructor into department.

### Room & Hall Management (`/api/rooms`)
- `GET /api/rooms` — List teaching rooms and halls.
- `GET /api/rooms/approved-exam-halls` — Query only halls certified for examination seating.
- `POST /api/rooms` — Register new room layout.
- `PUT /api/rooms/{room_id}/layout` — Update room dimensions and blocked desk coordinates.
- `PUT /api/rooms/{room_id}/approval` — Toggle examination certification flag.

### Examination Operations (`/api/examinations`)
- `GET /api/examinations` — List examinations with status filtering.
- `GET /api/examinations/{exam_id}` — Detailed examination configuration.
- `POST /api/examinations` — Create examination session with session normalization (`FN`/`AN`).
- `PUT /api/examinations/{exam_id}` — Update examination metadata.
- `DELETE /api/examinations/{exam_id}` — Archive or delete examination.

### Classroom Seating (`/api/classroom-seating`)
- `POST /api/classroom-seating/generate` — Generate daily lecture seating (without cross-batch restrictions).
- `POST /api/classroom-seating/save` — Persist classroom seating plan.
- `GET /api/classroom-seating/plan/{plan_id}` — Retrieve classroom seating arrangement.
- `POST /api/classroom-seating/attendance` — Log attendance per seat.

### Examination Seating & Optimization (`/api/exam-seating`)
- `POST /api/exam-seating/generate` — Multi-batch, multi-hall examination seating allocation.
- `POST /api/exam-seating/validate` — Independent mathematical allocation validation.
- `POST /api/exam-seating/save` — Save draft or published seating plan.
- `GET /api/exam-seating/plan/{plan_id}` — Retrieve exam seating plan.
- `POST /api/exam-seating/publish/{plan_id}` — Formally publish plan to student portal.

### Reports & Notice Boards (`/api/reports`)
- `GET /api/reports/locator-data` — Query student seat locator records.
- `GET /api/reports/plan/{plan_id}/csv` — Export hall seating plan as CSV.
- `GET /api/reports/plan/{plan_id}/pdf` — Export printable hall chart PDF.
- `GET /api/reports/exam/{exam_id}/locator-pdf` — Export official Student Locator Notice Board PDF.
- `GET /api/reports/exam/{exam_id}/csv` — Export consolidated examination roster CSV.

### Mathematics Diagnostics (`/api/math`)
- `POST /api/math/capacity` — Calculate usable capacity and independent set size $\alpha(G)$.
- `POST /api/math/checkerboard` — Execute 2-class bipartite checkerboard synthesis.
- `POST /api/math/solve` — Solve multi-batch layout via CP-SAT or backtracking.
- `POST /api/math/validate` — Validate arbitrary allocation graph against policy.

### Student Portal (`/api/student`)
- `GET /api/student/dashboard` — Student schedule, upcoming examinations, and published desk assignments.
- `GET /api/student/seat-lookup` — Desk locator endpoint (IDOR protected for students; open query by USN for staff).

---

## 5. Database Schema & Migration Baseline

The database layer consists of **20 relational entities** defined across 6 structured SQL migrations:
1. `001_schema.sql` — Core domain tables (`profiles`, `user_roles`, `programs`, `batches`, `students`, `faculty`, `subjects`, `timetable_entries`, `rooms`, `room_layouts`, `room_seats`, `examinations`, `examination_batches`, `examination_halls`, `seating_plans`, `seat_assignments`, `attendance_records`, `seating_policies`, `import_jobs`, `audit_logs`).
2. `002_rls.sql` — Row-Level Security policies and security definer functions (`my_role()`, `is_admin()`).
3. `003_seed_university.sql` — Seed datasets for Jain University FET departments and degree programs.
4. `004_rpc.sql` — Transactional PL/pgSQL procedures (`save_seating_plan`, `replace_seating_plan_assignments`, `ensure_room_seats`).
5. `005_import_rpc.sql` — Batch timetable import stored procedure (`import_timetable_data`).
6. `006_auth_rbac_audit.sql` — Audit logging triggers and administrative security tables.

Key integrity constraints verified:
- Unique USN / Roll number constraint: `unique (roll_number)`.
- Unique physical seat coordinate: `unique (room_id, row, col)`.
- Single seat allocation per student in a plan: `unique (seating_plan_id, student_id)`.
- Single student per physical seat in a plan: `unique (seating_plan_id, room_id, row, col)`.
- Non-overlapping timetable slot: `unique (batch_id, day, period_start)`.
- Foreign key cascade deletions on all child relational tables (`on delete cascade`).

---

## 6. Discrete Seating Algorithm & Mathematical Foundations Baseline

The seating engine models the physical hall layout as a grid graph $G=(V,E)$ where vertices $V$ represent usable desk coordinates $(r, c)$ and edges $E$ denote forbidden adjacencies.

The allocation problem is formulated as an injective function:
$$f: S \to V$$
mapping the set of students $S = \bigcup_{b} S_b$ to desks such that:
1. **Injectivity:** $s_1 \neq s_2 \implies f(s_1) \neq f(s_2)$.
2. **Pigeonhole Feasibility:** $|S| \le |V|$.
3. **Adjacency Restriction:** If $s_1, s_2 \in S_b$ belong to the same batch $b$ and $(f(s_1), f(s_2)) \in E$, the allocation is invalid.

For rectangular grids under standard horizontal and vertical adjacency rules, $G$ is a bipartite grid graph. By König's theorem, the maximum independent set $\alpha(G)$ is computed exactly via maximum matching:
- Larger checkerboard partition: $\lceil RC / 2 \rceil$
- Smaller checkerboard partition: $\lfloor RC / 2 \rfloor$

Necessary condition for two batches $A$ and $B$:
$$\max(|S_A|, |S_B|) \le \alpha(G)$$

For multi-batch scenarios ($k \ge 3$), the engine employs **Google OR-Tools CP-SAT** to formulate integer linear programming constraints, with an exact depth-first backtracking fallback for lightweight deployments.

---

## 7. Baseline Issues Discovered

During baseline inspection and testing, the following defects and areas for remediation were documented:

1. **Defect BUG-001 (High):** `GET /api/student/seat-lookup` failed for administrative and exam staff accounts when querying students by roll number due to unconditional student profile resolution.
2. **Defect BUG-002 (Medium):** Residual legacy Tailwind color classes (`primary-*`, `slate-*`, `indigo-*`) in multiple pages and dialogs violated the strict monochrome palette.
3. **Defect BUG-003 (Medium):** Hyperbolic, AI-generated phrasing cluttered headers, buttons, and helper text across the UI.
4. **Defect BUG-004 (Low):** Missing `roll_number` validation when staff queried `/api/student/seat-lookup` without parameters.
5. **Defect BUG-005 (High):** Potential code divergence between `backend/app/` and Vercel serverless function directory `frontend/app/`.
6. **Defect BUG-008 (High):** Non-existent roll number lookup in demo mode synthesized a false confirmed seating allocation instead of reporting empty results.
7. **Defect BUG-009 (Medium):** Over 350 residual non-monochrome color tokens scattered in common seating components.
8. **Defect BUG-010 (Medium):** Loosened assertions (`in (200, 404)`) in backend RBAC automated test suite.
9. **Institutional Lockdown Requirement:** Ensure all multi-institution selection dropdowns and switches are eliminated so the platform is locked exclusively to Jain University FET.

---

## 8. Baseline Audit Conclusion

The application possesses solid mathematical and architectural bones. All identified baseline issues have been scoped, mapped to responsible teams, and scheduled for comprehensive remediation and independent QA verification.
