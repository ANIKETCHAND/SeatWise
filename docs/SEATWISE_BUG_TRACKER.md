# SeatWise — Bug Tracker & Resolution Log

**Project:** SeatWise — Smart Examination Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Date:** November 10, 2026  
**Status:** All Identified Bugs Resolved & Verified  

---

## Bug Inventory

| Bug ID | Page / Component | Severity | Category | Status | Assigned Team |
|---|---|---|---|---|---|
| **BUG-001** | `student_portal_routes.py` (`/student/seat-lookup`) | High | Functional / RBAC | **FIXED** | Team 3 (Backend) |
| **BUG-002** | `ReportsPage.tsx`, `HistoryPage.tsx`, `RoomsPage.tsx` | Medium | Visual / Theme | **FIXED** | Team 2 (Frontend) & Team 6 |
| **BUG-003** | Sidebar, Dashboard, Login, Exam pages | Medium | Content / UX | **FIXED** | Team 6 (UI/UX Writers) |
| **BUG-004** | `student_portal_routes.py` (Missing param error) | Low | API Validation | **FIXED** | Team 3 (Backend) |
| **BUG-005** | `frontend/app/` vs `backend/app/` (Vercel sync) | High | Architecture / Deployment | **FIXED** | Team 3 (Backend) |
| **BUG-006** | `StudentPage.tsx` & `FacultyPage.tsx` color tokens | Low | Visual / Theme | **FIXED** | Team 2 (Frontend) |
| **BUG-007** | `UniversityPage.tsx` & `TimetablePage.tsx` color tokens | Low | Visual / Theme | **FIXED** | Team 2 (Frontend) |
| **BUG-008** | `student_portal_routes.py` (Non-existent student lookup fabricated false allocation) | High | Functional / Logic | **FIXED** | Team 3 (Backend) |
| **BUG-009** | 9 Pages & 8 Common Seating Components (350+ legacy `slate-`, `primary-`, `indigo-`, `blue-` tokens) | Medium | Visual / Theme | **FIXED** | Team 2 (Frontend) |
| **BUG-010** | `test_auth_rbac.py` (Weakened `in (400, 404)` and `in (200, 404)` assertions) | Medium | Test Integrity | **FIXED** | Team 1 (QA) |

---

## Detailed Bug Reports & Resolution Logs

### BUG-001: Staff/Admin Seat Lookup Unhandled Exception
- **Affected Route:** `GET /api/student/seat-lookup`
- **Severity:** High
- **Assigned Team:** Team 3 (Backend & API Debugging)
- **Description:**  
  When an administrator or exam staff member called `/api/student/seat-lookup?roll_number=23JU0101`, the route handler invoked `_resolve_student_record(auth, roll_number)` unconditionally. Because the authenticated user was an administrator (not a student), `_resolve_student_record` attempted to find a student profile with `auth_user_id = admin.id`, raising a 404 or synthesis error even when a valid `roll_number` query parameter was supplied.
- **Root Cause:**  
  Missing role check prior to student profile resolution. For students, the endpoint must resolve their own record to prevent IDOR; for staff and administrators, the endpoint should directly look up the student by `roll_number`.
- **Fix Applied:**  
  Refactored `student_portal_routes.py`:
  ```python
  if auth.role == "student":
      student = _resolve_student_record(auth, roll_number)
  else:
      if not roll_number:
          raise HTTPException(status_code=400, detail="roll_number query parameter required for staff lookup")
      student = _find_student_by_roll(roll_number)
  ```
- **Verification:**  
  Added two new test cases in `tests/backend/test_auth_rbac.py`:
  - `test_staff_can_lookup_student_seat`: Verifies staff can look up any student seat.
  - `test_staff_lookup_without_roll_requires_parameter`: Verifies HTTP 400 is raised if roll number is missing.
  Mirrored to `frontend/app/routes/student_portal_routes.py`. All tests pass.

---

### BUG-002: Inconsistent Color Scheme & Legacy Blue/Slate Tokens
- **Affected Pages:** `ReportsPage.tsx`, `HistoryPage.tsx`, `RoomsPage.tsx`, `MathAnalysisPage.tsx`
- **Severity:** Medium
- **Assigned Team:** Team 2 (Frontend) & Team 6 (UI/UX)
- **Description:**  
  Several pages retained legacy `slate-*`, `primary-600` (blue), `indigo-50`, and `emerald-50` classes, which conflicted with the required strict black & white / zinc monochrome design language.
- **Fix Applied:**  
  Refactored all tables, filter bars, status pills, and buttons to use pure zinc monochrome palette:
  - Backgrounds: `bg-white`, `bg-zinc-50`, `bg-zinc-100`, `bg-zinc-900`, `bg-zinc-950`.
  - Borders: `border-zinc-200`, `border-zinc-300`, `border-zinc-800`.
  - Text: `text-zinc-950`, `text-zinc-900`, `text-zinc-800`, `text-zinc-600`, `text-zinc-500`.
  - Primary buttons: `bg-zinc-900 hover:bg-zinc-800 text-white`.
- **Verification:**  
  Compiled via `npm run build` (built in 5.09s, zero errors). Manual inspection across all tabs verified monochrome purity.

---

### BUG-003: Verbose and AI-Hyperbolic UI Language
- **Affected Components:** `Sidebar.tsx`, `DashboardPage.tsx`, `ExamDashboardPage.tsx`, `FacultyDashboardPage.tsx`, `StudentDashboardPage.tsx`, `UserManagementPage.tsx`, `ExamManagementPage.tsx`, `ExamSeatingPage.tsx`, `ClassroomSeatingPage.tsx`, `ReportsPage.tsx`, `SettingsPage.tsx`, `LoginPage.tsx`, `AuditLogsPage.tsx`.
- **Severity:** Medium
- **Assigned Team:** Team 6 (UI/UX and Content Cleanup)
- **Description:**  
  Lengthy, artificially enthusiastic, and AI-generated sounding phrases cluttered headers, action buttons, and descriptive paragraphs.
- **Fix Applied:**  
  Comprehensive terminology cleanup across all pages:
  - "Initiate examination seating allocation ecosystem" -> "Generate Seating"
  - "Mode A: Regular Classroom Seating" -> "Classroom Seating"
  - "Mode B: Examination Seating Planner" -> "Seating Planner"
  - "Official University Examination Reports" -> "Reports"
  - "Institutional Identity & Scope" -> "Institution Identity"
  - "Candidate Seat Locator Directory (Student-wise Allocation)" -> "Student Seat Locator"
  - "Select Your Account Type" -> "Select Role"
  - "Rigorous Discrete Mathematics & Optimization Specification" -> "Mathematical Allocation Engine"
- **Verification:**  
  Verified that headers are single concise titles, action buttons use direct imperative verbs, and empty states provide actionable guidance without wordiness.

---

### BUG-004: Missing `roll_number` Parameter Validation for Administrative Seat Lookup
- **Affected Route:** `GET /api/student/seat-lookup`
- **Severity:** Low
- **Assigned Team:** Team 3 (Backend)
- **Description:**  
  If an administrator or exam staff called `/api/student/seat-lookup` without providing `?roll_number=...`, a demo student was synthesized instead of returning a clear validation error.
- **Fix Applied:**  
  Added strict validation: when `auth.role != "student"`, the endpoint checks for `roll_number` and immediately raises HTTP 400 Bad Request with `"roll_number query parameter required for staff lookup"`.
- **Verification:**  
  Verified by `tests/backend/test_auth_rbac.py::test_staff_lookup_without_roll_requires_parameter` (asserts response status 400).

---

### BUG-005: Backend-Frontend Serverless Function Divergence
- **Affected Directory:** `frontend/app/` vs `backend/app/`
- **Severity:** High
- **Assigned Team:** Team 3 (Backend) & DevOps
- **Description:**  
  Vercel serverless function deployment executes from `frontend/app/`. If backend fixes in `backend/app/` are not mirrored to `frontend/app/`, the live Vercel production deployment runs outdated Python handlers.
- **Fix Applied:**  
  Implemented automated file hash verification between `backend/app` and `frontend/app`. Synchronized all updated routes so that SHA-256 hashes match 100%.
- **Verification:**  
  PowerShell hash audit confirmed 0 mismatches across all 46 Python modules.

---

### BUG-006 & BUG-007: Slate/Primary Colors in University, Timetable, Student, and Faculty Pages
- **Affected Pages:** `UniversityPage.tsx`, `TimetablePage.tsx`, `StudentPage.tsx`, `FacultyPage.tsx`
- **Severity:** Low
- **Assigned Team:** Team 2 (Frontend)
- **Description:**  
  Card headers, badges, and action buttons in curriculum and timetable views used leftover `slate-*` and `primary-*` classes.
- **Fix Applied:**  
  Replaced all instances with `zinc-*` monochrome classes and updated buttons to standard zinc dark buttons.
- **Verification:**  
  `npm run build` completed with 0 errors. Verified in production bundle.

---

### BUG-008: Non-Existent Roll Number Lookup Fabricated False Seating Allocations
- **Affected Route:** `GET /api/student/seat-lookup` (`student_portal_routes.py`)
- **Severity:** High
- **Assigned Team:** Team 3 (Backend)
- **Description:**  
  When querying `/api/student/seat-lookup?roll_number=NONEXISTENT_999`, the route handler incorrectly generated a confirmed exam seating allocation in demo mode instead of reporting no allocations.
- **Root Cause:**  
  In `student_portal_routes.py`, the condition `if auth.user_id.startswith("demo-"):` was evaluated *before* verifying whether `target_student_id` was actually found. Because the demo branch unconditionally synthesized an allocation regardless of whether the queried roll number existed in the system, any arbitrary query string fabricated false seat confirmation.
- **Fix Applied:**  
  Reordered the checks so `if not target_student_id:` executes immediately after lookup resolution:
  ```python
  if not target_student_id:
      return {
          "student": {"name": clean_q, "roll_number": clean_q},
          "allocations": [],
      }
  ```
- **Verification:**  
  Added strict test in `tests/backend/test_auth_rbac.py::test_staff_lookup_nonexistent_roll_returns_empty_allocations`. Verifies HTTP 200 with `len(allocations) == 0`. Mirrored to `frontend/app/routes/student_portal_routes.py`.

---

### BUG-009: 350+ Residual Legacy Color Classes in Pages & Common Seating Components
- **Affected Files:** `ClassroomSeatingPage.tsx`, `ExamManagementPage.tsx`, `TimetablePage.tsx`, `UniversityPage.tsx`, `StudentPage.tsx`, `FacultyPage.tsx`, `StudentSeatLookupPage.tsx`, `MathAnalysisPage.tsx`, `ExamSeatingPage.tsx`, `DeskGrid.tsx`, `PolicyConfigurator.tsx`, `SeatingLegend.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx`, `LoadingSpinner.tsx`, `Modal.tsx`, `ToastContainer.tsx`.
- **Severity:** Medium
- **Assigned Team:** Team 2 (Frontend)
- **Description:**  
  Over 350 leftover `slate-*`, `primary-*`, `indigo-*`, and `blue-*` classes remained in modals, seat popovers, and core components, violating the strict black & white / zinc monochrome specification.
- **Fix Applied:**  
  Systematically refactored all 17 files to pure zinc monochrome tokens: `zinc-950`, `zinc-900`, `zinc-800`, `zinc-700`, `zinc-600`, `zinc-500`, `zinc-200`, `zinc-100`, `zinc-50`.
- **Verification:**  
  Executed automated AST regex scanner across all `.tsx` and `.ts` files in `frontend/src`. Confirmed exactly **0** residual legacy color classes remaining. Vite build succeeded cleanly in 5.19s with 0 errors.

---

### BUG-010: Weakened Test Assertions in Test Suite
- **Affected File:** `tests/backend/test_auth_rbac.py`
- **Severity:** Medium
- **Assigned Team:** Team 1 (QA)
- **Description:**  
  Tests `test_staff_can_lookup_student_seat` and `test_staff_lookup_without_roll_requires_parameter` used loosened assertions `assert resp.status_code in (200, 404)` and `assert resp.status_code in (400, 404)`, masking potential 404 routing failures or missing validation.
- **Fix Applied:**  
  Enforced strict binary assertions:
  - `assert resp.status_code == 200` for valid staff lookups.
  - `assert resp.status_code == 400` for missing roll number lookups.
  - Added `assert resp.status_code == 200 and len(data["allocations"]) == 0` for non-existent students.
- **Verification:**  
  Ran full pytest suite (`py -3.14 -m pytest`). All 130 tests passed with strict assertions.

