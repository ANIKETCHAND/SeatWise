# SeatWise — Master Test Matrix & Verification Record

**Product:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Database Reference:** Supabase PostgreSQL `wooszgwfkuzmxcinwlpj`  
**Execution Environment:** Windows Server / Python 3.14.6 / Node 24 / Vite 6 / React 18  
**Audit Status Legend:**
- **PASS:** Feature, workflow, API, or contract fully executed and verified with passing evidence.
- **FAIL:** Feature or test failed to meet specifications.
- **BLOCKED:** Test could not be executed due to external dependency or missing infrastructure.
- **NOT TESTED:** Out of scope for current test cycle.

---

## 1. Page & Module Verification Matrix

| # | Page Component | Route Path | Access Roles | Rendering | Data Loading | Controls & Navigation | Status |
|---|---|---|---|---|---|---|---|
| 1 | `LandingPage.tsx` | `/` | Public | PASS | PASS | PASS | **PASS** |
| 2 | `LoginPage.tsx` | `/login`, `/login/:role` | Public | PASS | PASS | PASS | **PASS** |
| 3 | `DashboardPage.tsx` | `/dashboard` | Administrator | PASS | PASS | PASS | **PASS** |
| 4 | `ExamDashboardPage.tsx` | `/exam-dashboard` | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 5 | `FacultyDashboardPage.tsx` | `/faculty-dashboard` | Administrator, Faculty | PASS | PASS | PASS | **PASS** |
| 6 | `StudentDashboardPage.tsx` | `/student-dashboard` | Administrator, Student | PASS | PASS | PASS | **PASS** |
| 7 | `UserManagementPage.tsx` | `/admin/users` | Administrator | PASS | PASS | PASS | **PASS** |
| 8 | `AuditLogsPage.tsx` | `/admin/audit-logs` | Administrator | PASS | PASS | PASS | **PASS** |
| 9 | `ExamManagementPage.tsx` | `/examinations` | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 10 | `ExaminationsPage.tsx` | `/examinations` (Alias) | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 11 | `ExamSeatingPage.tsx` | `/seating-planner`, `/exam-seating` | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 12 | `ClassroomSeatingPage.tsx` | `/classroom-seating` | Administrator, Faculty | PASS | PASS | PASS | **PASS** |
| 13 | `RoomsPage.tsx` | `/rooms` | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 14 | `StudentPage.tsx` | `/students` | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 15 | `FacultyPage.tsx` | `/faculty` | Administrator, Faculty | PASS | PASS | PASS | **PASS** |
| 16 | `UniversityPage.tsx` | `/university` | Administrator | PASS | PASS | PASS | **PASS** |
| 17 | `TimetablePage.tsx` | `/timetable` | Admin, Exam Staff, Faculty | PASS | PASS | PASS | **PASS** |
| 18 | `MathAnalysisPage.tsx` | `/math-analysis` | Administrator | PASS | PASS | PASS | **PASS** |
| 19 | `ReportsPage.tsx` | `/reports` | Admin, Exam Staff, Faculty | PASS | PASS | PASS | **PASS** |
| 20 | `StudentSeatLookupPage.tsx` | `/seat-lookup` | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 21 | `HistoryPage.tsx` | `/history` | Administrator, Exam Staff | PASS | PASS | PASS | **PASS** |
| 22 | `SettingsPage.tsx` | `/settings`, `/admin/settings` | Administrator | PASS | PASS | PASS | **PASS** |

---

## 2. Role-Based Access Control (RBAC) Matrix

| User Role | Dashboard Route | Permitted Workflows | Restricted Operations (Enforced with 403 Forbidden) | Status |
|---|---|---|---|---|
| **Administrator** (`admin`) | `/dashboard` | All modules, user creation, password reset, permissions, audit logs, curricula, rooms, exams, seating, reports | Cannot demote or deactivate the last active administrator | **PASS** |
| **Exam Staff** (`exam_staff`) | `/exam-dashboard` | Examination scheduling, halls, student directory, automated seating planner, publishing, exam reports | Blocked from `/admin/users`, `/admin/audit-logs`, `/university`, `/settings` | **PASS** |
| **Faculty** (`faculty`) | `/faculty-dashboard` | Timetable viewing, classroom seating mode, attendance marking, roster exports | Blocked from `/admin/users`, `/examinations`, `/seating-planner`, `/rooms` layout editing | **PASS** |
| **Student** (`student`) | `/student-dashboard` | Today's exams, upcoming schedule, own desk lookup, examination history | Blocked from all administrative directories, other students' seats, draft plans, full CSV rosters | **PASS** |

---

## 3. Examination Seating End-to-End Workflow Matrix

| Step # | Workflow Step Description | Expected Technical Behavior | Actual Result | Status |
|---|---|---|---|---|
| 1 | Administrator logs in | Authenticates via Supabase Auth / JWKS | Verified profile returned with role `admin` | **PASS** |
| 2 | Administrator creates an examination | Modal form invokes `POST /api/examinations` | Examination created with status `draft` | **PASS** |
| 3 | Date & session selection | Pydantic normalizes session (`FN` / `AN`) | Normalized enum stored in PostgreSQL | **PASS** |
| 4 | Select participating programs & batches | Associative records saved to `examination_batches` | Foreign key references validated | **PASS** |
| 5 | Retrieve enrolled students | Query `students` where batch in selection | Exact roster parsed and counted | **PASS** |
| 6 | Select certified examination halls | Query `rooms` where `is_exam_approved=true` | Hall capacities and dimensions retrieved | **PASS** |
| 7 | Retrieve hall layouts & blocked desks | Load `room_seats` coordinates and blocked masks | Blocked desk coordinates correctly parsed | **PASS** |
| 8 | Configure seating rules | Toggle horizontal, vertical, diagonal non-adjacency | Policy flags updated in solver payload | **PASS** |
| 9 | Capacity calculation & pigeonhole check | Verify $\sum \|S\| \le \sum \|T_{\text{usable}}\|$ | Prevents allocation if students exceed desks | **PASS** |
| 10 | Automated seating generation | Runs Google OR-Tools CP-SAT integer optimization | Multi-batch constraint satisfaction solved | **PASS** |
| 11 | Seating grid display | Visual matrix renders each assigned candidate | High-contrast monochrome badges displayed | **PASS** |
| 12 | Manual seat move or lock | Click-to-move, click-to-swap, and seat lock toggles | Desk coordinates updated interactively | **PASS** |
| 13 | Mathematical validation | Invokes independent validator ($f: S \to T$) | Injective mapping verified; 0 conflicts | **PASS** |
| 14 | Save seating plan | Atomic stored procedure `save_seating_plan` | Atomic write across plan and assignments | **PASS** |
| 15 | Publish seating plan | State transitions to `published` | Audit log entry recorded; plan locked | **PASS** |
| 16 | Student logs in | Authenticates via Roll Number or email | Resolves linked student record | **PASS** |
| 17 | Student views today's examination | Queries `GET /api/student/examinations/today` | Active exam returned with timings | **PASS** |
| 18 | Student locates seat | Queries `GET /api/student/seat-lookup` | Hall name, room code, and desk displayed | **PASS** |
| 19 | Exam Staff views hall arrangement | Opens hall tabs (`A-101`, `A-102`, `A-313`) | Full multi-hall allocations displayed | **PASS** |
| 20 | Invigilator marks attendance | Toggles seat attendance between present/absent | `attendance_records` updated atomically | **PASS** |
| 21 | Report generation | Exports Notice Board Locator PDF & CSV rosters | ReportLab streams official formatted PDF | **PASS** |
| 22 | Historical archive preservation | Reopen historical plan via `?plan_id=...` | Historical assignments restored from DB | **PASS** |

### Failure & Edge Case Scenarios

| Edge Case Scenario | Test Condition | Expected Safe Behavior | Actual Result | Status |
|---|---|---|---|---|
| **No students selected** | Empty student set $|S| = 0$ | Returns valid trivial allocation (0 seats) | Handled cleanly; 0 seats allocated | **PASS** |
| **No hall selected** | Room set $|T| = 0$ | Rejection with HTTP 422 `"no_halls"` | HTTP 422 returned with clear error | **PASS** |
| **Pigeonhole Deficit** | $|S| > |T|$ (e.g. 60 students, 24 desks) | Halts with exact shortage calculation | Status `infeasible`; shortage = 36 | **PASS** |
| **Duplicate Student Assignment** | Student allocated to multiple desks | Validator rejects allocation as non-injective | Caught by `validate_allocation` | **PASS** |
| **Duplicate Seat Assignment** | Multiple candidates placed at same desk | Validator rejects allocation | Caught by `validate_allocation` | **PASS** |
| **Blocked Desk Violation** | Candidate placed in damaged/blocked desk | Solver avoids blocked; validator rejects | Blocked desks never allocated | **PASS** |
| **Unpublished Plan Snooping** | Student attempts to view draft plan | Backend returns HTTP 403 Forbidden | HTTP 403 returned to student | **PASS** |
| **Student IDOR Lookup** | Student searches another student's roll | Search results restricted to self | Query returns empty matches array | **PASS** |
| **Database Offline** | `SUPABASE_URL` unset or unreachable | Structured HTTP 503 Service Unavailable | HTTP 503 returned; no 500 crash | **PASS** |

---

## 4. API Endpoints Test Matrix

| HTTP Method | API Endpoint Path | Minimum Role | Primary Test Assertion | Status |
|---|---|---|---|---|
| `GET` | `/health`, `/api/v1/health` | Public | Returns `{ "status": "healthy" }` | **PASS** |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns profile, role, and RBAC permissions | **PASS** |
| `POST` | `/api/v1/auth/resolve-identifier` | Public | Resolves username, roll, or email to auth profile | **PASS** |
| `POST` | `/api/v1/auth/resolve-roll` | Public | Resolves student USN to linked auth email | **PASS** |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Updates user password; enforces 12-char policy | **PASS** |
| `POST` | `/api/v1/auth/bootstrap-admin` | Public (Secret) | One-time Aniket Chandra bootstrap provisioning | **PASS** |
| `GET` | `/api/v1/admin/users` | Administrator | Lists university users across all 4 roles | **PASS** |
| `POST` | `/api/v1/admin/users` | Administrator | Provisions new staff/faculty/student account | **PASS** |
| `PATCH` | `/api/v1/admin/users/{id}` | Administrator | Updates role, status; protects last admin | **PASS** |
| `POST` | `/api/v1/admin/users/{id}/reset-password` | Administrator | Resets password; sets must_change_password=True | **PASS** |
| `GET` | `/api/v1/admin/roles/permissions` | Administrator | Returns system-wide RBAC permission matrix | **PASS** |
| `GET` | `/api/v1/admin/audit-logs` | Administrator | Returns chronological security audit events | **PASS** |
| `GET` | `/api/v1/student/me` | Student | Returns student academic profile & program | **PASS** |
| `GET` | `/api/v1/student/examinations/today` | Student | Returns examinations scheduled for today | **PASS** |
| `GET` | `/api/v1/student/examinations/upcoming`| Student | Returns future published examinations | **PASS** |
| `GET` | `/api/v1/student/seat-lookup` | Student | Returns student's allocated exam hall & seat | **PASS** |
| `GET` | `/api/v1/student/history` | Student | Returns student's historical seating allocations | **PASS** |
| `GET` | `/api/v1/dashboard/stats` | Authenticated | Aggregates system metrics, exams, and rooms | **PASS** |
| `GET` | `/api/v1/university/programs` | Authenticated | Lists academic programs with batch counts | **PASS** |
| `GET` | `/api/v1/university/programs/tree` | Authenticated | Returns recursive tree of programs and batches | **PASS** |
| `POST` | `/api/v1/university/programs` | Administrator | Creates new degree program | **PASS** |
| `GET` | `/api/v1/university/batches` | Authenticated | Lists academic batches filtered by program/sem | **PASS** |
| `POST` | `/api/v1/university/batches` | Administrator | Creates new academic batch | **PASS** |
| `GET` | `/api/v1/timetable` | Authenticated | Queries timetable entries with day/period filters | **PASS** |
| `POST` | `/api/v1/timetable/import/preview` | Administrator | Parses Excel workbook and returns audit preview | **PASS** |
| `GET` | `/api/v1/timetable/search` | Authenticated | Search sessions by subject, faculty, or room | **PASS** |
| `GET` | `/api/v1/students` | Staff / Faculty | Paginated student directory with search | **PASS** |
| `POST` | `/api/v1/students` | Administrator | Enrolls new student record with unique roll | **PASS** |
| `POST` | `/api/v1/students/import/preview` | Administrator | Validates student CSV/Excel rows | **PASS** |
| `POST` | `/api/v1/students/import` | Administrator | Commits batch student enrollment | **PASS** |
| `GET` | `/api/v1/faculty` | Authenticated | Lists faculty members with assigned subjects | **PASS** |
| `POST` | `/api/v1/faculty` | Administrator | Adds faculty record | **PASS** |
| `GET` | `/api/v1/rooms` | Authenticated | Lists rooms with computed usable seat counts | **PASS** |
| `GET` | `/api/v1/rooms/halls/approved` | Authenticated | Lists certified examination halls | **PASS** |
| `PUT` | `/api/v1/rooms/{id}/layout` | Administrator | Updates room grid dimensions and blocked desks | **PASS** |
| `POST` | `/api/v1/seating/classroom/generate` | Staff / Faculty | Solves daily classroom seating | **PASS** |
| `POST` | `/api/v1/seating/classroom/save` | Staff / Faculty | Persists classroom seating plan to database | **PASS** |
| `GET` | `/api/v1/examinations` | Staff / Faculty | Lists examinations with batch/hall counts | **PASS** |
| `POST` | `/api/v1/examinations` | Exam Staff | Creates examination with normalized session | **PASS** |
| `PUT` | `/api/v1/examinations/{id}/batches` | Exam Staff | Associates participating batches | **PASS** |
| `PUT` | `/api/v1/examinations/{id}/halls` | Exam Staff | Associates examination halls | **PASS** |
| `POST` | `/api/v1/seating/examination/generate`| Exam Staff | Generates multi-hall examination seating | **PASS** |
| `POST` | `/api/v1/seating/examination/validate`| Exam Staff | Independently validates seating allocation | **PASS** |
| `POST` | `/api/v1/seating/examination/save` | Exam Staff | Persists seating plan to Supabase PostgreSQL | **PASS** |
| `GET` | `/api/v1/seating/examination/lookup` | Authenticated | Looks up student seat (enforces tenant filter) | **PASS** |
| `POST` | `/api/v1/math/capacity` | Authenticated | Calculates theoretical & usable grid capacity | **PASS** |
| `POST` | `/api/v1/math/checkerboard` | Authenticated | Calculates checkerboard parity & bounds | **PASS** |
| `POST` | `/api/v1/math/solve` | Authenticated | Executes CP-SAT solver on arbitrary grid | **PASS** |
| `GET` | `/api/v1/reports/plan/{id}/csv` | Staff / Faculty | Streams CSV seating plan roster | **PASS** |
| `GET` | `/api/v1/reports/plan/{id}/pdf` | Staff / Faculty | Generates official ReportLab printable PDF | **PASS** |
| `GET` | `/api/v1/reports/exam/{id}/locator/pdf`| Staff / Faculty | Generates Student Notice Board Locator PDF | **PASS** |
| `GET` | `/api/v1/reports/exam/{id}/locator` | Staff / Faculty | Returns JSON locator records for UI lookup | **PASS** |
| `GET` | `/api/v1/reports/exam/{id}/csv` | Staff / Faculty | Streams exam roster CSV | **PASS** |
| `GET` | `/api/v1/seating/plans`, `/api/history`| Staff / Faculty | Lists archived seating plans | **PASS** |

---

## 5. Automated Test Suite Execution Summary

`
============================= test session starts =============================
platform win32 -- Python 3.14.6, pytest-9.1.1, pluggy-1.6.0
rootdir: E:\maths project
plugins: anyio-4.14.1, asyncio-1.4.0
collected 130 items

testslgorithms	est_engine.py .................................        [ 25%]
testsackend	est_api.py .....................................          [ 53%]
testsackend	est_auth_rbac.py ........................................ [ 84%]
.........                                                                [ 91%]
tests\database	est_migrations.py ......                                 [ 96%]
testsrontend	est_build.py .....                                       [100%]

====================== 130 passed, 2 warnings in 12.96s =======================
`

**Total Tests:** 130  
**Passed:** 130  
**Failed:** 0  
**Blocked:** 0  
**Pass Rate:** 100.0%

### Newly Added RBAC & Seat Lookup Test Cases
1. 	est_staff_can_lookup_student_seat: Enforces HTTP 200 and valid payload structure when an administrator/staff queries a student roll number.
2. 	est_staff_lookup_without_roll_requires_parameter: Enforces HTTP 400 Bad Request when staff queries without ?roll_number=....
3. 	est_staff_lookup_nonexistent_roll_returns_empty_allocations: Enforces HTTP 200 with len(allocations) == 0 when querying an unknown/non-existent student roll number (preventing false confirmation synthesis).
