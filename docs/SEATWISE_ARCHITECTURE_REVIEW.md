# SeatWise — Comprehensive Software Architecture Review

**Project:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Campus Location:** Bangalore, Karnataka, India  
**Production URL:** https://seatwise-fet.vercel.app  
**Date:** November 2026  
**Author:** Team A — Principal Software Architects & Engineering Leads  

---

## 1. Architectural Overview & System Topology

SeatWise is engineered as an industrial-grade, multi-tier examination seating optimization and academic classroom management platform designed specifically for the scale, constraints, and operational demands of Jain University FET.

The system is decoupled into four distinct architectural tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION TIER                               │
│        React 18 / TypeScript 5.7 / Vite 6.4 / Tailwind CSS 3.4              │
│  - 20 Tested Application Pages across 4 Role Workbenches                    │
│  - Unified Domain API Client Facade (`frontend/src/services/api/`)          │
│  - Real-Time Interactive Drag-and-Swap Hall Canvas & Grid Highlighting      │
│  - Strict Monochrome (Zinc/Black/White) UI & Jain FET Official Identity     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON / Bearer JWT
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION SERVER TIER                           │
│                 Python 3.14 / FastAPI / Pydantic v2 / Uvicorn               │
│  - 15 Modular REST API Routers under `/api`                                 │
│  - Dual Deployment: Standalone Uvicorn Server & Vercel Serverless Functions │
│  - Asymmetric JWKS Token Verification & RBAC Dependency Injection           │
│  - In-Memory Sliding-Window Rate Limiting & Normalized Error Handling       │
│  - 100% SHA-256 Byte-for-Byte Source Parity with `frontend/app/`            │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
                        ▼                               ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     DISCRETE OPTIMIZATION ENGINE     │  │       PERSISTENCE & CLOUD ID      │
│  - Dirichlet Pigeonhole Validator    │  │    Supabase PostgreSQL (16.x)    │
│  - Bipartite Parity Coloring Engine  │  │  - 20 Normalized Relational Tables│
│  - König Theorem Max Independent Set │  │  - Atomic RPC PL/pgSQL Procedures │
│  - Google OR-Tools CP-SAT Solver     │  │  - Row-Level Security (RLS)       │
│  - Independent Allocation Validator  │  │  - Immutable Audit Log Triggers   │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 2. Component Structure & Module Evaluation

### 2.1 Presentation Tier (`frontend/src/`)
- **Single Page Application (SPA):** Built using React 18 with Vite 6.4. Code is structured cleanly into `components/`, `context/`, `data/`, `hooks/`, `pages/`, `services/`, and `types/`.
- **Unified Domain API Facade:** Monolithic API calls have been refactored into domain-specific client modules inside `frontend/src/services/api/`:
  - `adminApi.ts` — User provisioning, role matrices, audit logs.
  - `authApi.ts` — Authentication, session state, password management.
  - `classroomApi.ts` — Daily lecture seating generation and plans.
  - `dashboardApi.ts` — Role-specific metric rollups.
  - `examsApi.ts` — Examination CRUD, hall mappings, schedule sessions.
  - `examSeatingApi.ts` — Seating generation, validation, publishing, and seat swapping.
  - `facultyApi.ts` — Faculty directory and course associations.
  - `mathApi.ts` — Capacity calculation, bipartite coloring, CP-SAT solve.
  - `reportsApi.ts` — Printable hall charts, student locator notice boards, CSV exports.
  - `roomsApi.ts` — Room directory, layout coordinates, exam hall certifications.
  - `studentApi.ts` — Student directory and bulk CSV imports.
  - `timetableApi.ts` — Timetable lookups, preview parser, batch commits.
  - `universityApi.ts` — Program and batch tree management.
  All modules are unified and re-exported via `frontend/src/services/api/index.ts`, ensuring backwards compatibility and clean dependency graphs.

### 2.2 Application Server Tier (`backend/app/` and `frontend/app/`)
- **FastAPI Modular Routing:** The application avoids monolithic route files by organizing endpoints into 15 sub-routers under `app/routes/`. Each router encapsulates a single domain with strong typing via Pydantic v2 schemas (`app/schemas/index.py`).
- **Route Aliasing & Backwards Compatibility:** Key routes provide aliases (e.g. `/api/examinations` and `/api/exams`, `/api/exam-seating` and `/api/seating/exam`) to ensure seamless interoperation between legacy endpoints and updated frontends.
- **Dependency Injection Security:** Endpoints enforce access control declaratively using FastAPI's dependency injection system:
  - `require_authenticated`
  - `require_admin`
  - `require_staff`
  - `require_staff_or_faculty`
  Roles are resolved from the cryptographically verified JWT payload and validated against the database profile, eliminating client-side role forgery.

### 2.3 Discrete Optimization Engine (`app/algorithms/`)
- **Decoupled Architecture:** The optimization logic is completely separated from HTTP and database concerns.
- **Five-Stage Pipeline:**
  1. *Input Normalization:* Convert HTTP request to strongly typed domain objects (`Hall`, `Student`, `Policy`).
  2. *Pre-Check & Infeasibility Detection:* Evaluate Dirichlet Pigeonhole principle ($|S| > |V|$) and bipartite independence bounds via König's theorem ($\max |S_b| > \alpha(G)$).
  3. *Exact Synthesis / Constraint Solving:* For two batches on rectangular halls, apply the $O(RC)$ bipartite checkerboard algorithm. For irregular halls, blocked desks, or $\ge 3$ batches, dispatch to Google OR-Tools CP-SAT with fallback to depth-first backtracking.
  4. *Independent Allocation Validation:* Pass the produced candidate seating arrangement through `validator.py`. Solver success alone is never trusted.
  5. *Diagnostic Reporting:* Return structured result with execution time, mathematical explanations, and capacity statistics.

---

## 3. Critical Parity Architecture

A central requirement of the SeatWise deployment model is the **Critical Parity Rule**:
> Maintain 100% byte-for-byte SHA-256 parity across all Python source files between `backend/app/` and `frontend/app/`.

### Rationale:
In the hybrid Vercel architecture:
- Local development and pytest automated test suites run directly against `backend/app/`.
- Vercel Serverless Functions execute Python handlers from `frontend/app/` (invoked via `frontend/api/index.py`).
If changes are applied to `backend/app/` without synchronizing `frontend/app/`, the live cloud deployment executes stale logic while local tests pass.

### Parity Verification:
Parity is verified programmatically by `tests/frontend/test_build.py::test_backend_frontend_app_source_parity`, which computes SHA-256 digests across all 37 Python files in both trees. A custom PowerShell verification script confirms zero divergence across the entire application footprint.

---

## 4. Frontend-Backend Communication & State Synchronization

1. **State Persistence Across Page Refresh:**
   Seating workbenches (`ExamSeatingPage.tsx` and `ClassroomSeatingPage.tsx`) support deep URL query parameters (`?plan_id=...`, `?exam_id=...`). When an administrator navigates directly to a plan URL or refreshes their browser, the page hydrates state directly from Supabase, preventing lost work or UI flicker.
2. **Normalized Identifiers & UUID Handling:**
   To bridge synthetic mock IDs and PostgreSQL UUID v4 keys, the server implements `app/utils/uuid_helper.py::ensure_uuid()`. Any identifier is deterministically converted into a valid UUID v5 (DNS namespace) if it is not already a valid UUID v4, preventing database type mismatch errors.
3. **Session Timing Normalization:**
   University examination slots follow standard university sessions (`FN`: Forenoon 09:30–12:30, `AN`: Afternoon 14:00–17:00). The backend normalizes session strings upon exam creation and seating generation.

---

## 5. Architectural Bottlenecks Identified & Remediated

1. **Vite Bundle Size Warning (1.8MB Single Chunk):**
   *Problem:* The monolithic build exceeded Vite's 500 kB chunk warning, leading to slow mobile load times.
   *Remediation:* Configured manual Rollup chunking in `vite.config.ts`, splitting the bundle into:
   - `vendor-react` (React, React-DOM, React Router)
   - `vendor-supabase` (@supabase/supabase-js)
   - `vendor-charts` (Recharts)
   - `vendor-animation` (GSAP)
   - Domain feature chunks (`feature-seating`, `feature-academic`, `feature-analytics`).
2. **Denial-of-Service Risk on Combinatorial Endpoints:**
   *Problem:* Repeated unauthenticated calls to `/api/math/solve` or `/api/exam-seating/generate` could exhaust server CPU.
   *Remediation:* Implemented an in-memory sliding-window rate limiter (`app/utils/rate_limiter.py`) enforcing request quotas and rejecting abusive traffic with HTTP 429 Too Many Requests.
3. **Brittle Test Assertions Masking Regressions:**
   *Problem:* Several integration tests asserted `resp.status_code in (200, 404)`, allowing missing routes to pass silently.
   *Remediation:* Refactored all test assertions to strict binary checks (`assert resp.status_code == 200`), enforcing rigorous API contracts.

---

## 6. Architecture Review Signoff

The architecture of SeatWise is sound, modular, decoupled, and highly maintainable. All 15 backend routers communicate cleanly with the unified frontend API client facade, the mathematical engine guarantees provable correctness, and the critical parity rule ensures complete consistency between local testing and production serverless deployment.
