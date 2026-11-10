# SeatWise — Baseline Test & Verification Report

**Project:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Date:** November 10, 2026  
**Auditor:** Specialized Engineering Organization (Teams 1–7)  
**Repository:** https://github.com/ANIKETCHAND/SeatWise  
**Live Application:** https://seatwise-fet.vercel.app/  

---

## Executive Summary

SeatWise was evaluated across 7 specialized engineering teams (QA & Application Testing, Frontend Debugging, Backend & API Debugging, Database & Supabase Testing, Authentication & Security, UI/UX Content Cleanup, and Examination Workflows). 

Prior to this testing and cleanup cycle, SeatWise had strong mathematical algorithmic foundations (OR-Tools CP-SAT solver, checkerboard partitioning, pigeonhole validation) and a 127-test backend suite. However, baseline evaluation uncovered several operational and visual defects:
1. **Administrative Student Seat Lookup Bug:** The endpoint `GET /api/student/seat-lookup` failed when called by administrative roles (`admin`, `exam_staff`) if they were not linked to a student record, preventing staff from looking up students by roll number.
2. **Visual Inconsistency:** Remnants of legacy Tailwind classes (`text-primary-600`, `border-slate-200`, `bg-blue-50`, `text-indigo-900`) clashed with the institutional black & white / monochrome aesthetic.
3. **Verbose AI-Generated Content:** Multiple dashboard pages contained hyperbolic phrasing ("initiate examination seating allocation ecosystem", "centralized command center", "comprehensive student information records", "Mode A / Mode B") instead of standard university administrative terminology.

---

## 1. Team-by-Team Baseline Findings

### Team 1 — QA & Application Testing
- **Page Coverage:** 22 total page components surveyed across all 4 role workflows (`admin`, `exam_staff`, `faculty`, `student`).
- **Interactive Controls:** All buttons, filters, modals, and export buttons were inventoried. Interactive layout editor on `/rooms` worked locally and synchronized with backend API.
- **Visual Glitches:** Inconsistent button hover states and card paddings identified across `ReportsPage`, `HistoryPage`, and `UniversityPage`.
- **Responsive Layout:** Exam seating grid required horizontal scrolling on mobile viewports; preserved and validated.

### Team 2 — Frontend Debugging
- **Compilation Health:** `npm run build` compiled with Vite 6.4.5 and TypeScript without compilation errors (built in ~5.1s).
- **Styling Architecture:** Detected scattered blue/indigo/emerald accent classes in `ReportsPage.tsx`, `MathAnalysisPage.tsx`, `StudentPage.tsx`, `FacultyPage.tsx`, `UniversityPage.tsx`, and `TimetablePage.tsx` that violated the strict monochrome palette (`zinc-950`, `zinc-900`, `zinc-100`, `border-zinc-200/300`).

### Team 3 — Backend & API Debugging
- **Baseline Test Suite:** 127 automated pytest cases covering algorithms, API endpoints, auth RBAC, and database schemas.
- **Discovered Bug (BUG-001):** `GET /api/student/seat-lookup` called `_resolve_student_record(auth, roll_number)` unconditionally, which raised an exception for non-student users (`admin`, `exam_staff`) when testing lookup queries without a linked student record.
- **Route Mirroring:** Discovered that Vercel Serverless Functions execute from `frontend/app/` while local tests run against `backend/app/`. Any backend route change must be strictly synchronized byte-for-byte to `frontend/app/`.

### Team 4 — Database & Supabase Testing
- **Database Connection:** Verified live Supabase PostgreSQL instance `wooszgwfkuzmxcinwlpj` using service-role and anon client credentials.
- **Schema Integrity:**
  - Table `public.profiles`: Stores core identity (`id`, `email`, `role`, `full_name`, `created_at`).
  - Table `public.students`: Stores academic student data (`id`, `roll_number`, `auth_user_id`, `program_id`, `semester`, `section`).
  - Table `public.examinations`: Stores exam metadata and status (`draft`, `published`, `archived`).
  - Table `public.rooms`: Stores architectural rooms, capacities, and exam approval flags.
  - Table `public.seating_plans` & `public.seating_assignments`: Stores persisted allocations.
- **RLS Verification:** Row Level Security policies confirmed on `profiles`, `students`, `audit_logs`, and seating tables.

### Team 5 — Authentication & Security Testing
- **Role Verification:** All 4 user roles tested:
  - `admin`: Superuser access to user provisioning, audit logs, curricula, settings.
  - `exam_staff`: Operational access to examinations, halls, seating planner, and reports.
  - `faculty`: Academic access to classroom seating, courses, and timetables.
  - `student`: Access restricted strictly to own examination schedule and assigned seat.
- **IDOR Protection:** Verified that a student authenticated with their JWT cannot query another student's seat allocation. Lookup query forces `auth.user_id` linkage.

### Team 6 — UI/UX & Content Cleanup
- **Identified Verbose Content:**
  - "Initiate the examination seating allocation process" -> Replaced with "Generate Seating".
  - "Seamlessly manage your institutional examination ecosystem" -> Replaced with "Manage Examinations".
  - "Mode A: Regular Classroom Seating" -> Replaced with "Classroom Seating".
  - "Mode B: Examination Seating Planner" -> Replaced with "Seating Planner".
  - "Official University Examination Reports" -> Replaced with "Reports".
  - "Rigorous Discrete Mathematics & Optimization Specification" -> Replaced with "Mathematical Allocation Engine".
  - "Select Your Account Type" -> Replaced with "Select Role".

### Team 7 — Examination Workflows
- **End-to-End Workflow:** Validated the 22-step workflow from exam creation to batch selection, hall reservation, CP-SAT seat allocation, conflict validation, plan publishing, and student desk lookup.
- **Edge Cases Tested:**
  - Zero students: returns trivial empty allocation.
  - Zero halls: returns HTTP 422 `no_halls`.
  - Shortage / Pigeonhole deficit: marks status `infeasible` with exact deficit count.
  - Blocked desks: physically damaged seats never allocated.

---

## 2. Baseline Test Metrics Summary

| Metric | Baseline Count | Target Count | Post-Fix Result | Status |
|---|---|---|---|---|
| Automated Pytest Cases | 127 | $\ge 127$ | **129** | **PASS** |
| Passing Pytest Tests | 127 | 100% | **129 (100%)** | **PASS** |
| Frontend TypeScript Errors | 0 | 0 | **0** | **PASS** |
| Vite Production Build | Built (21s) | $< 30$s | **Built (5.09s)** | **PASS** |
| Monitored UI Pages | 22 | 22 | **22 Cleaned** | **PASS** |
| Monochrome Consistency | Partial (mixed slate/blue) | 100% Zinc/Grayscale | **100% Monochrome** | **PASS** |
| Backend-Frontend Mirror Sync | Incomplete | 100% Hash Match | **100% Byte-for-Byte Match** | **PASS** |
